"""文件匹配引擎：关键词匹配、最终版识别、多版本冲突检测."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from fuzzywuzzy import fuzz

from .models import AttachmentItem, AttachmentStatus, BidChecklistConfig
from .scanner import ScannedFile


KEYWORD_HIT_THRESHOLD = 65
FUZZY_MATCH_THRESHOLD = 85
MINIMUM_HARD_THRESHOLD = 60


def _keyword_weight(keyword: str) -> float:
    """给关键词计算权重：更长的专有名词权重更高."""
    cn_chars = sum(1 for c in keyword if '\u4e00' <= c <= '\u9fff')
    total = len(keyword.strip())
    if cn_chars >= 4:
        return 1.8
    if cn_chars >= 3:
        return 1.5
    if cn_chars >= 2 and total >= 3:
        return 1.2
    return 1.0


@dataclass
class MatchCandidate:
    """一个附件的匹配候选."""

    file: ScannedFile
    scores: List[Tuple[str, int]] = field(default_factory=list)
    total_score: float = 0.0
    is_chosen: bool = False

    def add_score(self, keyword: str, score: int):
        self.scores.append((keyword, score))
        self.total_score += score

    def avg_score(self) -> float:
        return self.total_score / len(self.scores) if self.scores else 0.0


@dataclass
class AttachmentCheckResult:
    """单个附件的检查结果."""

    item: AttachmentItem
    matched_file: Optional[ScannedFile] = None
    candidates: List[MatchCandidate] = field(default_factory=list)
    status: AttachmentStatus = AttachmentStatus.PENDING
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def add_issue(self, msg: str):
        self.issues.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def has_problems(self) -> bool:
        return bool(self.issues)


def _keyword_match_score(text: str, keyword: str) -> int:
    """计算关键词在文本中的匹配分数."""
    text_lower = text.lower()
    kw_lower = keyword.lower()

    if kw_lower in text_lower:
        bonus = 100 if len(keyword) >= 4 else 95
        idx = text_lower.find(kw_lower)
        if idx == 0 or (idx > 0 and text_lower[idx - 1] in " (-_·.【（["):
            bonus += 5
        return min(bonus, 100)

    partial = fuzz.partial_ratio(kw_lower, text_lower)
    if partial >= 80:
        return partial

    return fuzz.ratio(kw_lower, text_lower)


def _score_file_for_attachment(
    sf: ScannedFile, item: AttachmentItem
) -> MatchCandidate:
    """为单个文件计算匹配某个附件的分数."""
    candidate = MatchCandidate(file=sf)
    name_targets = [sf.name, sf.stem]
    if sf.pdf_text_cache:
        name_targets.append(sf.pdf_text_cache[:500])

    search_text = " | ".join(name_targets)
    hit_keywords_count = 0

    best_per_kw = {}
    for kw in item.keywords:
        best = 0
        for text in name_targets:
            s = _keyword_match_score(text, kw)
            if s > best:
                best = s
        best_per_kw[kw] = best
        weight = _keyword_weight(kw)
        if best >= KEYWORD_HIT_THRESHOLD:
            candidate.add_score(kw, int(best * weight))
            hit_keywords_count += 1
        elif best >= 50 and len(kw) >= 3:
            candidate.add_score(kw, int(best * 0.6 * weight))

    total_kw = max(1, len(item.keywords))
    coverage = hit_keywords_count / total_kw
    max_single_score = max((s for _, s in candidate.scores), default=0)

    if hit_keywords_count == 1 and total_kw >= 3:
        if max_single_score >= 98:
            candidate.total_score *= 0.85
        elif max_single_score >= 90:
            candidate.total_score *= 0.65
        else:
            candidate.total_score *= 0.45
    elif hit_keywords_count == 1 and total_kw >= 2:
        if max_single_score >= 98:
            candidate.total_score *= 0.92
        elif max_single_score >= 90:
            candidate.total_score *= 0.80
        else:
            candidate.total_score *= 0.65

    if coverage >= 0.75 and total_kw >= 2:
        candidate.total_score *= (1.0 + 0.3 * hit_keywords_count)
    elif coverage >= 0.5 and total_kw >= 2:
        candidate.total_score *= (1.0 + 0.15 * hit_keywords_count)

    if item.cert_number:
        cn = item.cert_number.lower()
        if cn in search_text.lower():
            candidate.add_score("证书编号", 100)
            candidate.total_score += 50

    has_specific_project_word_hit = False
    for kw, score in candidate.scores:
        if _keyword_weight(kw) >= 1.5 and score >= 95:
            has_specific_project_word_hit = True
            break

    if sf.is_final:
        candidate.total_score *= 1.10
    if sf.is_draft:
        if has_specific_project_word_hit:
            candidate.total_score *= 0.92
        else:
            candidate.total_score *= 0.75

    if has_specific_project_word_hit:
        candidate.total_score += 60

    return candidate


def _pick_best_candidate(candidates: List[MatchCandidate]) -> Optional[MatchCandidate]:
    """从多个候选中选出最优：按综合总分排序，考虑最终版/草稿/专有词命中."""
    if not candidates:
        return None

    qualified = [c for c in candidates if c.avg_score() >= FUZZY_MATCH_THRESHOLD]
    if not qualified:
        almost = [c for c in candidates if c.avg_score() >= MINIMUM_HARD_THRESHOLD]
        strong_almost = []
        for c in almost:
            has_strong = any(s >= 90 for _, s in c.scores)
            if len(almost) >= 2 or (c.avg_score() >= MINIMUM_HARD_THRESHOLD + 5 and has_strong):
                strong_almost.append(c)
        qualified = strong_almost

    if not qualified:
        return None

    def sort_key(c: MatchCandidate):
        return (
            c.total_score,
            1 if c.file.is_final else 0,
            0 if not c.file.is_draft else -1,
            c.avg_score(),
            c.file.mtime.timestamp(),
            c.file.size,
        )

    sorted_list = sorted(qualified, key=sort_key, reverse=True)
    return sorted_list[0]


def match_attachments(
    attachments: List[AttachmentItem],
    files: List[ScannedFile],
) -> List[AttachmentCheckResult]:
    """执行附件匹配."""
    results: List[AttachmentCheckResult] = []

    for item in attachments:
        result = AttachmentCheckResult(item=item)

        all_candidates: List[MatchCandidate] = []
        for sf in files:
            cand = _score_file_for_attachment(sf, item)
            if cand.scores or cand.avg_score() >= 40:
                all_candidates.append(cand)

        all_candidates.sort(key=lambda c: c.avg_score(), reverse=True)
        result.candidates = all_candidates

        chosen = _pick_best_candidate(all_candidates)
        if chosen:
            result.matched_file = chosen.file
            chosen.is_chosen = True
            result.status = AttachmentStatus.MATCHED

            if chosen.file.is_final:
                pass
            elif chosen.file.is_draft:
                result.add_warning(f"匹配到草稿文件（{chosen.file.name}），请确认是否为最终版")

            duplicates = [
                c for c in all_candidates
                if c.avg_score() >= FUZZY_MATCH_THRESHOLD and not c.is_chosen
            ]
            if duplicates:
                dup_names = ", ".join(f"{c.file.name}({int(c.avg_score())}分)" for c in duplicates[:3])
                result.add_warning(f"存在相似文件可能重复：{dup_names}")
        else:
            result.status = AttachmentStatus.MISSING
            result.add_issue("未找到匹配的文件")

        results.append(result)

    _detect_cross_duplicates(results, files)
    return results


def _detect_cross_duplicates(
    results: List[AttachmentCheckResult],
    files: List[ScannedFile],
):
    """检测同一文件被多个附件同时选中的情况."""
    usage: Dict[str, List[AttachmentCheckResult]] = {}
    for r in results:
        if r.matched_file:
            key = str(r.matched_file.path.resolve())
            usage.setdefault(key, []).append(r)

    for key, users in usage.items():
        if len(users) > 1:
            sf = users[0].matched_file
            for u in users:
                u.add_warning(
                    f"文件 {sf.name} 同时被「{u.item.name}」和其他"
                    f"{len(users) - 1}个附件引用，请确认是否误配"
                )


def apply_status_based_on_issues(results: List[AttachmentCheckResult]):
    """根据问题列表调整最终状态（供检查器使用）."""
    for r in results:
        if not r.issues:
            continue
        issue_text = " ".join(r.issues)
        if "过期" in issue_text:
            r.status = AttachmentStatus.EXPIRED
        elif "页数" in issue_text or "漏页" in issue_text:
            r.status = AttachmentStatus.PAGE_ERROR
        elif "盖章" in issue_text:
            r.status = AttachmentStatus.STAMP_MISSING
        elif "姓名" in issue_text or "授权人" in issue_text:
            r.status = AttachmentStatus.NAME_MISMATCH
        elif "未找到" in issue_text and r.status != AttachmentStatus.MATCHED:
            r.status = AttachmentStatus.MISSING
