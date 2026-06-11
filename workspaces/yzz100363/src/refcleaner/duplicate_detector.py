"""重复文献检测模块"""

from __future__ import annotations

import re
from typing import Optional

from .doi_normalizer import get_doi_for_comparison
from .models import (
    ConfirmationItem,
    ConfirmationSeverity,
    ConfirmationType,
    DuplicateGroup,
    ProcessingStatus,
    ReferenceEntry,
)


try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False

    class _DummyFuzz:
        @staticmethod
        def token_set_ratio(a: str, b: str) -> float:
            a_words = set(re.findall(r'\w+', a.lower()))
            b_words = set(re.findall(r'\w+', b.lower()))
            if not a_words or not b_words:
                return 0.0
            intersection = len(a_words & b_words)
            union = len(a_words | b_words)
            return (intersection / union) * 100

        @staticmethod
        def ratio(a: str, b: str) -> float:
            from difflib import SequenceMatcher
            return SequenceMatcher(None, a.lower(), b.lower()).ratio() * 100

    fuzz = _DummyFuzz()  # type: ignore


TITLE_SIMILARITY_THRESHOLD = 85
AUTHOR_SIMILARITY_THRESHOLD = 70
COMBINED_THRESHOLD = 75


def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


def normalize_title(title: Optional[str]) -> str:
    if not title:
        return ""
    title = re.sub(r'[《》""''""]', '', title)
    title = re.sub(r'[^\w\s\-]', ' ', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip().lower()


def normalize_authors(authors: list[str]) -> str:
    if not authors:
        return ""
    normalized = []
    for author in authors:
        author = re.sub(r'[,\.\-]', ' ', author)
        author = re.sub(r'\s+', ' ', author)
        normalized.append(author.strip().lower())
    return ' '.join(normalized)


def calculate_similarity(
    entry1: ReferenceEntry,
    entry2: ReferenceEntry,
) -> tuple[float, str]:
    doi1 = get_doi_for_comparison(entry1.doi)
    doi2 = get_doi_for_comparison(entry2.doi)

    if doi1 and doi2 and doi1 == doi2:
        return 100.0, "DOI 完全匹配"

    title1 = normalize_title(entry1.title)
    title2 = normalize_title(entry2.title)

    if title1 and title2 and title1 == title2:
        authors1 = normalize_authors(entry1.authors)
        authors2 = normalize_authors(entry2.authors)
        if authors1 and authors2 and authors1 == authors2:
            return 98.0, "标题和作者完全匹配"
        if entry1.year and entry2.year and entry1.year == entry2.year:
            return 95.0, "标题和年份完全匹配"

    title_sim = 0.0
    if title1 and title2:
        title_sim = fuzz.token_set_ratio(title1, title2)

    author_sim = 0.0
    authors1 = normalize_authors(entry1.authors)
    authors2 = normalize_authors(entry2.authors)
    if authors1 and authors2:
        author_sim = fuzz.token_set_ratio(authors1, authors2)

    year_match = (
        entry1.year
        and entry2.year
        and entry1.year == entry2.year
    )

    journal1 = normalize_text(entry1.journal)
    journal2 = normalize_text(entry2.journal)
    journal_match = journal1 and journal2 and journal1 == journal2

    if title_sim >= TITLE_SIMILARITY_THRESHOLD:
        reasons = [f"标题相似度 {title_sim:.1f}%"]
        if year_match:
            reasons.append("年份匹配")
        if author_sim >= AUTHOR_SIMILARITY_THRESHOLD:
            reasons.append(f"作者相似度 {author_sim:.1f}%")
        if journal_match:
            reasons.append("期刊匹配")

        combined = (title_sim * 0.5 + author_sim * 0.3 + (100 if year_match else 0) * 0.2)
        if combined >= COMBINED_THRESHOLD:
            return min(combined, 99.0), "; ".join(reasons)

    if title_sim >= 70 and author_sim >= 60 and year_match:
        return 80.0, f"标题相似度 {title_sim:.1f}%，作者相似度 {author_sim:.1f}%，年份匹配"

    return 0.0, ""


def detect_duplicates(
    entries: list[ReferenceEntry],
    threshold: float = 75.0,
) -> list[DuplicateGroup]:
    duplicate_groups: list[DuplicateGroup] = []
    processed_indices: set[int] = set()

    n = len(entries)
    for i in range(n):
        if i in processed_indices:
            continue

        entry_i = entries[i]
        group_indices = [i]
        group_reasons: list[str] = []
        max_confidence = 0.0

        for j in range(i + 1, n):
            if j in processed_indices:
                continue

            entry_j = entries[j]
            similarity, reason = calculate_similarity(entry_i, entry_j)

            if similarity >= threshold:
                group_indices.append(j)
                group_reasons.append(f"条目 {i+1} 与 {j+1}: {reason}")
                max_confidence = max(max_confidence, similarity)

        if len(group_indices) > 1:
            primary_idx = _select_primary(entries, group_indices)
            duplicate_indices = [idx for idx in group_indices if idx != primary_idx]

            group_id = f"dup_group_{len(duplicate_groups) + 1:03d}"
            group = DuplicateGroup(
                group_id=group_id,
                primary_index=primary_idx,
                duplicate_indices=duplicate_indices,
                confidence=max_confidence,
                reason="; ".join(group_reasons),
            )
            duplicate_groups.append(group)

            for idx in group_indices:
                processed_indices.add(idx)

            _mark_duplicate_entries(entries, group)

    return duplicate_groups


def _select_primary(entries: list[ReferenceEntry], indices: list[int]) -> int:
    candidates = [(idx, entries[idx]) for idx in indices]

    def score_entry(entry: ReferenceEntry) -> tuple[int, int, int, int]:
        score = 0
        score += 3 if entry.doi else 0
        score += 2 if entry.title else 0
        score += 2 if entry.authors else 0
        score += 1 if entry.year else 0
        score += 1 if entry.journal else 0
        score += 1 if entry.volume else 0
        score += 1 if entry.pages else 0

        auto_fix_count = len(entry.auto_fixes)
        confirmation_count = len(entry.confirmation_items)
        length = len(entry.original_text)

        return (score, -auto_fix_count, -confirmation_count, length)

    best_idx = indices[0]
    best_score = score_entry(entries[best_idx])

    for idx in indices[1:]:
        current_score = score_entry(entries[idx])
        if current_score > best_score:
            best_score = current_score
            best_idx = idx

    return best_idx


def _mark_duplicate_entries(
    entries: list[ReferenceEntry],
    group: DuplicateGroup,
) -> None:
    primary = entries[group.primary_index]

    for dup_idx in group.duplicate_indices:
        dup_entry = entries[dup_idx]
        dup_entry.status = ProcessingStatus.DUPLICATE

        primary.add_confirmation(
            ConfirmationItem(
                type=ConfirmationType.POSSIBLE_DUPLICATE,
                severity=ConfirmationSeverity.WARNING,
                message=(
                    f"疑似重复条目：与原始位置 {dup_idx + 1} 的条目相似度 {group.confidence:.1f}%。"
                    f"该条目将被标记为重复，保留当前条目。原因：{group.reason}"
                ),
                consult_advisor=True,
            )
        )

        dup_entry.add_confirmation(
            ConfirmationItem(
                type=ConfirmationType.POSSIBLE_DUPLICATE,
                severity=ConfirmationSeverity.WARNING,
                message=(
                    f"疑似重复条目：与原始位置 {group.primary_index + 1} 的条目相似度 {group.confidence:.1f}%。"
                    f"已被标记为重复，将从输出列表中移除。原因：{group.reason}"
                ),
                original_value=dup_entry.original_text,
                suggested_value=primary.original_text,
                consult_advisor=True,
            )
        )
