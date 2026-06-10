"""
修补报告生成器
Patch report generator: human-readable summary for editors
"""

import os
import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field

from .patcher import PatchResult, PatchConfig
from .backup import BatchBackup
from .models import SubtitleFile, PatchOperation
from .timecode import ms_to_srt, ms_to_readable


@dataclass
class BatchReport:
    """批量修补报告"""
    session_tag: str
    created_at: str
    file_results: List[PatchResult] = field(default_factory=list)
    reference_file: Optional[str] = None
    backup: Optional[BatchBackup] = None
    warnings: List[str] = field(default_factory=list)

    @property
    def total_files(self) -> int:
        return len(self.file_results)

    @property
    def total_ops(self) -> int:
        return sum(len(r.operations) for r in self.file_results)

    @property
    def language_counts(self) -> Dict[str, Tuple[int, int]]:
        """每种语言的（修补前行数, 修补后行数）"""
        counts: Dict[str, Tuple[int, int]] = {}
        for r in self.file_results:
            lang = r.file.language or "未标注"
            before, after = counts.get(lang, (0, 0))
            counts[lang] = (before + r.entry_count_before, after + r.entry_count_after)
        return counts


class ReportGenerator:
    """报告生成器"""

    def __init__(self, output_dir: Optional[str] = None):
        if output_dir is None:
            output_dir = os.path.join(os.getcwd(), "_patch_reports")
        self.output_dir = os.path.abspath(output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

    def _op_type_cn(self, op_type: str) -> str:
        mapping = {
            "OFFSET": "整体偏移",
            "MERGE": "合并短片段",
            "ALIGN_START": "对齐开始时间",
            "ALIGN_END": "对齐结束时间",
            "GAP_FIX": "填补空白间隔",
            "REORDER": "纠正时间顺序",
            "SORT": "重排字幕顺序",
            "DUPLICATE_TEXT": "文本重复提醒",
            "COUNT_MISMATCH": "行数差异提醒",
            "OVERLAP_STILL": "遗留时间重叠",
            "OUT_OF_BOUNDS_STILL": "遗留时间越界",
        }
        return mapping.get(op_type, op_type)

    def _op_severity(self, op_type: str) -> str:
        if op_type in ("OVERLAP_STILL", "OUT_OF_BOUNDS_STILL"):
            return "【需人工复查】"
        if op_type in ("COUNT_MISMATCH", "DUPLICATE_TEXT"):
            return "【建议检查】"
        if op_type in ("OFFSET", "ALIGN_START", "ALIGN_END"):
            return "【已自动调整】"
        return "【已处理】"

    def generate_text_report(self, report: BatchReport, filename: Optional[str] = None) -> str:
        """生成纯文本报告（剪辑师友好）"""
        if filename is None:
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patch_report_{report.session_tag or ts}.txt"

        out_path = os.path.join(self.output_dir, filename)
        lines: List[str] = []

        lines.append("╔" + "═" * 70 + "╗")
        lines.append("║" + "字幕时间轴修补报告".center(70) + "║")
        lines.append("║" + "SUBTITLE PATCH REPORT".center(70) + "║")
        lines.append("╚" + "═" * 70 + "╝")
        lines.append("")
        lines.append(f"  报告生成时间 : {report.created_at}")
        lines.append(f"  处理文件数   : {report.total_files}")
        lines.append(f"  总操作数     : {report.total_ops}")
        if report.reference_file:
            lines.append(f"  参考字幕文件 : {report.reference_file}")
        if report.backup:
            lines.append(f"  备份目录     : {report.backup.backup_dir}")
        lines.append("")

        lines.append("━" * 72)
        lines.append("  一、各语言行数差异总览（方便判断是否漏段）")
        lines.append("━" * 72)
        lines.append("")
        lines.append(f"  {'语言':<12}{'修补前':>10}{'修补后':>10}{'变化':>10}{'状态':<10}")
        lines.append(f"  {'─'*12}{'─'*10}{'─'*10}{'─'*10}{'─'*10}")

        lang_counts = report.language_counts
        for lang, (before, after) in sorted(lang_counts.items()):
            diff = after - before
            status = ""
            if abs(diff) > 5:
                status = "⚠ 差异大，检查漏段"
            elif diff != 0:
                status = "有变化"
            else:
                status = "✓ 一致"
            lines.append(
                f"  {lang:<12}{before:>10,}{after:>10,}{diff:>+10,}{status:<10}"
            )
        lines.append("")

        ref_lang = None
        if report.file_results:
            langs = [r.file.language for r in report.file_results if r.file.language]
            if langs:
                from collections import Counter
                ref_lang = Counter(langs).most_common(1)[0][0]

        if ref_lang and len(lang_counts) >= 2:
            lines.append("  ▶ 与参考语言对比：")
            ref_before, ref_after = lang_counts.get(ref_lang, (0, 0))
            for lang, (before, after) in sorted(lang_counts.items()):
                if lang == ref_lang:
                    continue
                diff_after = after - ref_after
                marker = "⚠ " if abs(diff_after) > 3 else "  "
                lines.append(
                    f"    {marker}{lang} vs {ref_lang}: 差 {diff_after:+d} 行"
                    + ("（建议检查是否漏段旁白）" if abs(diff_after) > 3 else "")
                )
            lines.append("")

        lines.append("━" * 72)
        lines.append("  二、各文件修补明细")
        lines.append("━" * 72)
        lines.append("")

        for file_idx, result in enumerate(report.file_results, 1):
            sub_file = result.file
            fname = os.path.basename(sub_file.filepath)
            lang = sub_file.language or "未标注"

            lines.append(f"  [{file_idx}] {fname}")
            lines.append(f"      语言: {lang}  |  路径: {sub_file.filepath}")
            lines.append(
                f"      行数: {result.entry_count_before} → {result.entry_count_after}"
                f"  ({result.count_diff:+d})"
            )
            lines.append(
                f"      重叠: {len(result.overlaps_before)} → {len(result.overlaps_after)}"
                f"  |  越界: {len(result.out_of_bounds_before)} → {len(result.out_of_bounds_after)}"
            )
            lines.append(
                f"      合并: {result.merged_count} 次 | 移位: {result.shifted_count} 行"
            )
            if result.average_offset_ms != 0:
                lines.append(f"      平均偏移量: {ms_to_readable(result.average_offset_ms)}")
            lines.append("")

            if result.operations:
                lines.append("      操作日志：")
                lines.append(f"      {'#':>4}  {'类型':<14}{'严重度':<12}  描述")
                lines.append(f"      {'─'*4}  {'─'*14}{'─'*12}  {'─'*30}")

                for op_idx, op in enumerate(result.operations, 1):
                    sev = self._op_severity(op.op_type)
                    cn_type = self._op_type_cn(op.op_type)
                    desc = op.description[:60]
                    lines.append(f"      {op_idx:>4}  {cn_type:<14}{sev:<12}  {desc}")

                lines.append("")

            if result.overlaps_after:
                lines.append("      ⚠ 遗留重叠行（需人工复查）:")
                for a, b in result.overlaps_after:
                    ea = sub_file.entries[a - 1] if a <= len(sub_file.entries) else None
                    eb = sub_file.entries[b - 1] if b <= len(sub_file.entries) else None
                    info_a = f"#{a}" + (f" {ms_to_srt(ea.start_ms)}→" if ea else "")
                    info_b = f"#{b}" + (f" {ms_to_srt(eb.start_ms)}→" if eb else "")
                    lines.append(f"        · 第 {info_a}  <->  第 {info_b}")
                lines.append("")

            if result.out_of_bounds_after:
                lines.append("      ⚠ 遗留越界行（需人工复查）:")
                for idx in result.out_of_bounds_after:
                    e = sub_file.entries[idx - 1] if idx <= len(sub_file.entries) else None
                    if e:
                        lines.append(
                            f"        · 第 {idx} 行: {ms_to_srt(e.start_ms)} --> {ms_to_srt(e.end_ms)}"
                            f"  「{e.text[:30]}...」" if len(e.text) > 30 else f"  「{e.text}」"
                        )
                lines.append("")

        lines.append("━" * 72)
        lines.append("  三、复查指引（剪辑师请按此清单回到视频确认）")
        lines.append("━" * 72)
        lines.append("")
        check_items = self._build_checklist(report)
        for i, item in enumerate(check_items, 1):
            lines.append(f"  {i:>2}. [ ] {item}")
        lines.append("")

        if report.backup:
            lines.append("━" * 72)
            lines.append("  四、备份信息（如需恢复请参照）")
            lines.append("━" * 72)
            lines.append("")
            lines.append(f"  备份会话 : {report.backup.session_id}")
            lines.append(f"  备份目录 : {report.backup.backup_dir}")
            lines.append(f"  备份数量 : {len(report.backup.records)} 个文件")
            lines.append("")
            lines.append("  各文件备份：")
            for i, rec in enumerate(report.backup.records, 1):
                orig_base = os.path.basename(rec.original_path)
                lines.append(
                    f"    [{i}] {orig_base}"
                    + f"\n        ← 原: {rec.original_path}"
                    + f"\n        → 备: {rec.backup_path}"
                )
            lines.append("")

        lines.append("╔" + "═" * 70 + "╗")
        lines.append("║  报告结束 | 如有疑问请保留备份目录后联系技术支持  ║")
        lines.append("╚" + "═" * 70 + "╝")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return out_path

    def _build_checklist(self, report: BatchReport) -> List[str]:
        """构建复查清单"""
        items: List[str] = []

        for result in report.file_results:
            fname = os.path.basename(result.file.filepath)
            lang = result.file.language or "未标注"

            still_issues = False
            if result.overlaps_after:
                items.append(
                    f"视频「{fname}」（{lang}）：检查 {len(result.overlaps_after)} 处重叠字幕"
                )
                still_issues = True
            if result.out_of_bounds_after:
                items.append(
                    f"视频「{fname}」（{lang}）：检查 {len(result.out_of_bounds_after)} 处时间越界"
                )
                still_issues = True
            if result.count_diff != 0:
                items.append(
                    f"视频「{fname}」（{lang}）：行数变化 {result.count_diff:+d}，确认无漏段或重复"
                )
            if result.merged_count > 0:
                items.append(
                    f"视频「{fname}」（{lang}）：抽查 {result.merged_count} 处合并后的字幕完整性"
                )
            if abs(result.average_offset_ms) > 500:
                items.append(
                    f"视频「{fname}」（{lang}）：整体偏移 {ms_to_readable(result.average_offset_ms)}，抽查口型同步"
                )

            for op in result.operations:
                if op.op_type == "COUNT_MISMATCH" and op.details.get("diff", 0) < -2:
                    items.append(
                        f"视频「{fname}」（{lang}）：{op.description}"
                    )
                    break

        if not items:
            items.append("未检测到需要人工复查的问题，可抽查 2-3 处合并或对齐位置确认效果")

        items.append("对比参考语言，抽查片头/片尾/中间转场位置的时间轴是否同步")
        items.append("快进全片一遍，确认无明显空白过长或字幕闪退的情况")

        return items

    def generate_csv_summary(self, report: BatchReport, filename: Optional[str] = None) -> str:
        """生成 CSV 格式摘要（便于财务或项目经理汇总）"""
        if filename is None:
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"patch_summary_{report.session_tag or ts}.csv"

        out_path = os.path.join(self.output_dir, filename)

        import csv
        headers = [
            "文件名", "语言", "路径",
            "修补前行数", "修补后行数", "行数变化",
            "修补前重叠数", "修补后重叠数",
            "修补前越界数", "修补后越界数",
            "合并次数", "移位行数",
            "平均偏移(ms)", "遗留问题数",
            "备份路径",
        ]

        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)

            for result in report.file_results:
                backup_path = ""
                if report.backup:
                    for rec in report.backup.records:
                        if rec.original_path == os.path.abspath(result.file.filepath):
                            backup_path = rec.backup_path
                            break

                still_issues = len(result.overlaps_after) + len(result.out_of_bounds_after)

                writer.writerow([
                    os.path.basename(result.file.filepath),
                    result.file.language,
                    result.file.filepath,
                    result.entry_count_before,
                    result.entry_count_after,
                    result.count_diff,
                    len(result.overlaps_before),
                    len(result.overlaps_after),
                    len(result.out_of_bounds_before),
                    len(result.out_of_bounds_after),
                    result.merged_count,
                    result.shifted_count,
                    result.average_offset_ms,
                    still_issues,
                    backup_path,
                ])

        return out_path
