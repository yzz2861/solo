"""
核心修补逻辑
Core patching logic: offset alignment, short segment merging, gap handling
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple
from collections import Counter

from .models import SubtitleFile, SubtitleEntry, PatchOperation
from .timecode import (
    find_overlaps,
    find_out_of_bounds,
    calculate_offset,
    ms_to_srt,
    ms_to_readable,
)


@dataclass
class PatchConfig:
    """修补配置"""
    reference_language: str = "zh"
    min_duration_ms: int = 300
    max_gap_ms: int = 150
    offset_tolerance_ms: int = 500
    merge_threshold_ms: int = 500
    protect_missing_text: bool = True
    allow_duplicate_text: bool = True
    mark_issues: bool = True
    safe_mode: bool = True


@dataclass
class PatchResult:
    """单个文件修补结果"""
    file: SubtitleFile
    file_before: SubtitleFile
    operations: List[PatchOperation] = field(default_factory=list)
    overlaps_before: List[Tuple[int, int]] = field(default_factory=list)
    overlaps_after: List[Tuple[int, int]] = field(default_factory=list)
    out_of_bounds_before: List[int] = field(default_factory=list)
    out_of_bounds_after: List[int] = field(default_factory=list)
    entry_count_before: int = 0
    entry_count_after: int = 0
    merged_count: int = 0
    split_count: int = 0
    shifted_count: int = 0
    average_offset_ms: int = 0

    @property
    def count_diff(self) -> int:
        return self.entry_count_after - self.entry_count_before


class SubtitlePatcher:
    """字幕修补器"""

    def __init__(self, config: Optional[PatchConfig] = None):
        self.config = config or PatchConfig()
        self._op_counter = 0

    def _log_op(self, result: PatchResult, op_type: str, description: str,
                entry_index: Optional[int] = None, **details) -> None:
        self._op_counter += 1
        op = PatchOperation(
            op_type=op_type,
            description=description,
            entry_index=entry_index,
            details=details,
            timestamp=str(self._op_counter),
        )
        result.operations.append(op)

    def _apply_offset(self, sub_file: SubtitleFile, offset_ms: int, result: PatchResult) -> None:
        """应用整体时间偏移"""
        if offset_ms == 0:
            return

        for entry in sub_file.entries:
            entry.start_ms += offset_ms
            entry.end_ms += offset_ms
            if self.config.mark_issues:
                entry.issues.append(f"时间轴整体偏移 {ms_to_readable(offset_ms)}")

        self._log_op(
            result,
            "OFFSET",
            f"整体时间偏移 {ms_to_readable(offset_ms)}",
            offset_ms=offset_ms,
        )
        result.shifted_count += len(sub_file.entries)

    def _merge_short_entries(self, sub_file: SubtitleFile, result: PatchResult) -> None:
        """合并相邻的短片段"""
        if len(sub_file.entries) < 2:
            return

        merged_indices: List[int] = []
        new_entries: List[SubtitleEntry] = []
        i = 0

        while i < len(sub_file.entries):
            current = sub_file.entries[i]

            if i + 1 < len(sub_file.entries):
                next_entry = sub_file.entries[i + 1]
                gap = next_entry.start_ms - current.end_ms
                is_short = current.duration_ms < self.config.min_duration_ms
                is_short_next = next_entry.duration_ms < self.config.min_duration_ms
                is_close = gap < self.config.merge_threshold_ms

                if (is_short or is_short_next) and is_close and gap >= 0:
                    combined_text = self._join_texts(current.text, next_entry.text)
                    merged = SubtitleEntry(
                        index=0,
                        start_ms=current.start_ms,
                        end_ms=next_entry.end_ms,
                        text=combined_text,
                        original_index=current.original_index,
                        issues=[],
                    )
                    if self.config.mark_issues:
                        issue = (
                            f"合并第{current.index}和{next_entry.index}行 "
                            f"(短于{self.config.min_duration_ms}ms或间隔<{self.config.merge_threshold_ms}ms)"
                        )
                        merged.issues.append(issue)
                    new_entries.append(merged)
                    merged_indices.extend([current.index, next_entry.index])
                    self._log_op(
                        result,
                        "MERGE",
                        f"合并第{current.index}和{next_entry.index}行",
                        entry_index=current.index,
                        merged_from=[current.index, next_entry.index],
                        old_duration1=current.duration_ms,
                        old_duration2=next_entry.duration_ms,
                        new_duration=merged.duration_ms,
                        gap_between=gap,
                    )
                    result.merged_count += 1
                    i += 2
                    continue

            new_entries.append(current)
            i += 1

        for idx, entry in enumerate(new_entries):
            entry.index = idx + 1

        sub_file.entries = new_entries

    def _join_texts(self, text1: str, text2: str) -> str:
        """智能合并文本行（保留箭头、换行等）"""
        t1 = text1.rstrip()
        t2 = text2.lstrip()

        if t1.endswith("-") or t2.startswith("-"):
            pass
        elif t1.endswith("—") or t1.endswith("→") or t1.endswith("➝") or t1.endswith("➞"):
            return t1 + t2
        elif t2.startswith("→") or t2.startswith("➝") or t2.startswith("➞"):
            return t1 + t2

        if "\n" in t1 or "\n" in t2:
            return t1 + "\n" + t2

        return t1 + " " + t2

    def _fix_large_gaps(self, sub_file: SubtitleFile, result: PatchResult,
                        ref_entry_count: Optional[int] = None) -> None:
        """
        修复过长的空白间隔（通过调整前一条的 end 时间）
        只处理「同一段落内部」的空白，跳过跨章节/跨小时的大跳转
        """
        if len(sub_file.entries) < 2:
            return

        LARGE_SEGMENT_GAP_MS = 5 * 60 * 1000

        for i in range(len(sub_file.entries) - 1):
            current = sub_file.entries[i]
            next_entry = sub_file.entries[i + 1]
            gap = next_entry.start_ms - current.end_ms

            if gap <= self.config.max_gap_ms * 4:
                continue

            if gap >= LARGE_SEGMENT_GAP_MS:
                self._log_op(
                    result,
                    "LARGE_SEGMENT_GAP",
                    f"第{current.index}→{next_entry.index}行之间有{ms_to_readable(gap)}的"
                    f"大段空白（可能是片尾/广告跳转），保持不修改",
                    entry_index=current.index,
                    gap_ms=gap,
                )
                continue

            old_end = current.end_ms
            suggested_end = next_entry.start_ms - self.config.max_gap_ms
            new_end = max(current.end_ms + self.config.max_gap_ms, suggested_end)

            if new_end > next_entry.start_ms:
                new_end = next_entry.start_ms - 50

            if new_end <= old_end:
                continue

            current.end_ms = new_end

            if self.config.mark_issues:
                current.issues.append(
                    f"延长结束时间填补{ms_to_readable(gap)}空白 "
                    f"({ms_to_srt(old_end)} → {ms_to_srt(current.end_ms)})"
                )
            self._log_op(
                result,
                "GAP_FIX",
                f"第{current.index}行：填补{ms_to_readable(gap)}空白间隔",
                entry_index=current.index,
                gap_ms=gap,
                old_end_ms=old_end,
                new_end_ms=current.end_ms,
            )

    def _check_and_fix_out_of_order(self, sub_file: SubtitleFile, result: PatchResult) -> None:
        """检测并修复时间顺序问题（某句被拆到下一镜导致的错位）"""
        needs_sort = False
        for i in range(1, len(sub_file.entries)):
            if sub_file.entries[i].start_ms < sub_file.entries[i - 1].start_ms:
                needs_sort = True
                self._log_op(
                    result,
                    "REORDER",
                    f"第{sub_file.entries[i].index}行时间早于前一行，需要重排",
                    entry_index=sub_file.entries[i].index,
                )

        if needs_sort:
            sub_file.sort_entries()
            self._log_op(result, "SORT", "按开始时间重排所有字幕行")

    def _align_to_reference(self, sub_file: SubtitleFile, ref_file: SubtitleFile,
                            result: PatchResult) -> None:
        """
        按参考语言对齐：
        1) 计算全局偏移（基于前 N 个样本的中位数）
        2) 仅在时间接近时做逐行微调（按时间窗口内的最近邻匹配，而非索引）
        3) 行数差过大或跨小时的极端值一律跳过，留给人工
        """
        if not ref_file or not ref_file.entries:
            return

        entries = sub_file.entries
        ref_entries = ref_file.entries

        if not entries:
            return

        REF_SAMPLES = min(10, len(ref_entries), len(entries))
        global_offset = calculate_offset(ref_entries[:REF_SAMPLES], entries[:REF_SAMPLES])
        result.average_offset_ms = global_offset

        if 0 < abs(global_offset) < 3600_000:
            self._apply_offset(sub_file, -global_offset, result)

        n_entries = len(entries)
        n_ref = len(ref_entries)
        count_diff = n_entries - n_ref

        if len(entries) != len(ref_entries):
            note = f"行数差异：{len(entries)} vs 参考 {len(ref_entries)}（差{count_diff:+d}行）"
            if count_diff > 0:
                note += "，多出的行请人工确认是否重复"
            else:
                note += "，缺少的行请人工确认是否漏句"
            self._log_op(result, "COUNT_MISMATCH", note, diff=count_diff)

        mismatch_ratio = abs(count_diff) / max(n_ref, 1)
        if mismatch_ratio > 0.3:
            self._log_op(
                result,
                "ALIGN_SKIP",
                f"行数差异过大（{mismatch_ratio:.0%}），跳过细粒度时间对齐，仅保留整体偏移",
            )
            return

        BIG_JUMP_MS = 10 * 60 * 1000
        WINDOW_MS = 3000

        ref_ptr = 0
        for entry in entries:
            best_ref = None
            best_diff = float("inf")

            local_ref_ptr = ref_ptr
            while local_ref_ptr < len(ref_entries):
                ref = ref_entries[local_ref_ptr]
                diff = entry.start_ms - ref.start_ms
                abs_diff = abs(diff)

                if abs_diff < best_diff and abs_diff < WINDOW_MS:
                    best_diff = abs_diff
                    best_ref = (local_ref_ptr, ref)

                if ref.start_ms - entry.start_ms > WINDOW_MS:
                    break

                if diff > WINDOW_MS * 3 and best_ref is not None:
                    break

                local_ref_ptr += 1

            if best_ref is None:
                continue

            ref_idx, ref = best_ref

            if abs(ref.start_ms - entries[0].start_ms) > BIG_JUMP_MS and ref_idx < REF_SAMPLES:
                continue

            start_diff = entry.start_ms - ref.start_ms
            end_diff = entry.end_ms - ref.end_ms

            if abs(start_diff) > 3600_000 or abs(end_diff) > 3600_000:
                continue

            if abs(start_diff) > self.config.offset_tolerance_ms:
                old_start = entry.start_ms
                entry.start_ms = ref.start_ms
                if self.config.mark_issues:
                    entry.issues.append(
                        f"开始时间对齐参考：偏移{ms_to_readable(start_diff)}"
                    )
                self._log_op(
                    result,
                    "ALIGN_START",
                    f"第{entry.index}行开始时间对齐参考（偏移{ms_to_readable(start_diff)}）",
                    entry_index=entry.index,
                    diff_ms=start_diff,
                    old_start_ms=old_start,
                    new_start_ms=ref.start_ms,
                )

            if abs(end_diff) > self.config.offset_tolerance_ms:
                old_end = entry.end_ms
                new_end = max(ref.end_ms, entry.start_ms + self.config.min_duration_ms)
                entry.end_ms = new_end
                if self.config.mark_issues:
                    entry.issues.append(
                        f"结束时间对齐参考：偏移{ms_to_readable(end_diff)}"
                    )
                self._log_op(
                    result,
                    "ALIGN_END",
                    f"第{entry.index}行结束时间对齐参考（偏移{ms_to_readable(end_diff)}）",
                    entry_index=entry.index,
                    diff_ms=end_diff,
                    old_end_ms=old_end,
                    new_end_ms=new_end,
                )

            ref_ptr = min(ref_idx + 1, len(ref_entries) - 1)

    def _find_duplicate_text(self, sub_file: SubtitleFile, result: PatchResult) -> None:
        """检测重复文本（同一句重复出现）"""
        def _normalize(t: str) -> str:
            t = t.replace("\n", " ").replace("\r", " ")
            t = re.sub(r"\s+", " ", t).strip().lower()
            return t

        text_counter: Dict[str, List[int]] = {}
        normalized_map: Dict[int, str] = {}
        for entry in sub_file.entries:
            norm = _normalize(entry.text)
            if not norm:
                continue
            normalized_map[entry.index] = norm
            text_counter.setdefault(norm, []).append(entry.index)

        for text, indices in text_counter.items():
            if len(indices) > 1 and self.config.allow_duplicate_text:
                preview = text[:30] + ("..." if len(text) > 30 else "")
                self._log_op(
                    result,
                    "DUPLICATE_TEXT",
                    f"文本重复：第{indices}行出现相同内容「{preview}」",
                    entry_index=indices[0],
                    indices=indices,
                    text_preview=preview,
                )
                if self.config.mark_issues:
                    for idx in indices:
                        sub_file.entries[idx - 1].issues.append(
                            f"文本重复（与第{[i for i in indices if i != idx]}行相同）"
                        )

    def patch_file(
        self,
        sub_file: SubtitleFile,
        reference_file: Optional[SubtitleFile] = None,
    ) -> PatchResult:
        """修补单个字幕文件"""
        import copy
        file_before = copy.deepcopy(sub_file)

        result = PatchResult(
            file=sub_file,
            file_before=file_before,
            entry_count_before=len(sub_file.entries),
            overlaps_before=find_overlaps(sub_file.entries),
            out_of_bounds_before=find_out_of_bounds(sub_file.entries),
        )

        if not sub_file.entries:
            result.entry_count_after = 0
            return result

        self._check_and_fix_out_of_order(sub_file, result)

        if reference_file and reference_file.entries:
            self._align_to_reference(sub_file, reference_file, result)

        self._merge_short_entries(sub_file, result)

        if reference_file:
            self._fix_large_gaps(sub_file, result, len(reference_file.entries))
        else:
            self._fix_large_gaps(sub_file, result)

        self._find_duplicate_text(sub_file, result)

        result.overlaps_after = find_overlaps(sub_file.entries)
        result.out_of_bounds_after = find_out_of_bounds(sub_file.entries)
        result.entry_count_after = len(sub_file.entries)

        for a_idx, b_idx in result.overlaps_after:
            self._log_op(
                result,
                "OVERLAP_STILL",
                f"重叠未解决：第{a_idx}行与第{b_idx}行时间重叠",
                entry_index=a_idx,
                overlapping_with=b_idx,
            )

        for idx in result.out_of_bounds_after:
            self._log_op(
                result,
                "OUT_OF_BOUNDS_STILL",
                f"越界未解决：第{idx}行开始/结束时间异常",
                entry_index=idx,
            )

        return result
