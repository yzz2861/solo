"""测试重复文献检测"""

from typing import List, Optional

import pytest
from refcleaner.duplicate_detector import calculate_similarity, detect_duplicates
from refcleaner.models import ReferenceEntry, ReferenceType


def create_entry(
    original_position: int,
    title: str = "",
    authors: Optional[List[str]] = None,
    year: Optional[int] = None,
    doi: Optional[str] = None,
    journal: Optional[str] = None,
) -> ReferenceEntry:
    entry = ReferenceEntry(
        original_text=f"{title} by {authors}",
        original_position=original_position,
        entry_type=ReferenceType.ARTICLE,
        title=title,
        authors=authors or [],
        year=year,
        doi=doi,
        journal=journal,
    )
    return entry


def test_doi_exact_match():
    entry1 = create_entry(0, "Test Title", ["Author A"], 2020, "10.1038/test123")
    entry2 = create_entry(1, "Test Title", ["Author A"], 2020, "10.1038/TEST123")

    similarity, reason = calculate_similarity(entry1, entry2)
    assert similarity == 100.0
    assert "DOI" in reason


def test_title_author_exact_match():
    entry1 = create_entry(0, "Deep Learning Methods", ["Smith, J.", "Li, X."], 2020)
    entry2 = create_entry(1, "Deep Learning Methods", ["Smith, J.", "Li, X."], 2020)

    similarity, reason = calculate_similarity(entry1, entry2)
    assert similarity >= 95.0


def test_title_similarity():
    entry1 = create_entry(
        0,
        "Deep Learning for Image Recognition and Classification",
        ["Smith, J."],
        2020,
        journal="Nature",
    )
    entry2 = create_entry(
        1,
        "Deep Learning for Image Recognition and Classification",
        ["Smith, J."],
        2020,
        journal="Nature",
    )

    similarity, reason = calculate_similarity(entry1, entry2)
    assert similarity >= 90.0


def test_no_duplicate():
    entry1 = create_entry(0, "Deep Learning", ["Smith, J."], 2020)
    entry2 = create_entry(1, "Quantum Computing", ["Brown, A."], 2021)

    similarity, _ = calculate_similarity(entry1, entry2)
    assert similarity < 50.0


def test_detect_duplicate_group():
    entries = [
        create_entry(0, "Title A", ["Author 1"], 2020, "10.1038/abc"),
        create_entry(1, "Title B", ["Author 2"], 2021, "10.1038/def"),
        create_entry(2, "Title A", ["Author 1"], 2020, "10.1038/ABC"),
    ]

    groups = detect_duplicates(entries, threshold=75.0)
    assert len(groups) == 1
    assert len(groups[0].duplicate_indices) == 1
    assert groups[0].primary_index in (0, 2)
    assert groups[0].duplicate_indices[0] in (0, 2)


def test_select_primary_more_complete():
    entry1 = create_entry(0, "Title A", ["Author 1"], 2020, "10.1038/abc", journal="Nature")
    entry2 = create_entry(1, "Title A", ["Author 1"], None, None)

    groups = detect_duplicates([entry1, entry2], threshold=75.0)
    assert len(groups) == 1
    assert groups[0].primary_index == 0
