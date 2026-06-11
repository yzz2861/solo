"""测试 DOI 规范化"""

import pytest
from refcleaner.doi_normalizer import normalize_doi, get_doi_for_comparison


def test_doi_normalization_lowercase_prefix():
    result = normalize_doi("10.1038/NATURE14539")
    assert result.is_valid
    assert result.normalized_doi == "10.1038/nature14539"
    assert result.auto_fixed


def test_doi_extraction_from_url():
    result = normalize_doi("https://doi.org/10.1038/nature14539")
    assert result.is_valid
    assert result.normalized_doi == "10.1038/nature14539"
    assert result.auto_fixed


def test_doi_extraction_from_prefix():
    result = normalize_doi("doi:10.1038/nature14539")
    assert result.is_valid
    assert result.normalized_doi == "10.1038/nature14539"
    assert result.auto_fixed


def test_doi_with_trailing_punctuation():
    result = normalize_doi("10.1038/nature14539.")
    assert result.is_valid
    assert result.normalized_doi == "10.1038/nature14539"
    assert result.auto_fixed


def test_invalid_doi():
    result = normalize_doi("not-a-doi")
    assert not result.is_valid
    assert result.normalized_doi is None


def test_empty_doi():
    result = normalize_doi(None)
    assert not result.is_valid
    assert result.normalized_doi is None


def test_doi_case_insensitive_comparison():
    doi1 = get_doi_for_comparison("10.1038/NATURE14539")
    doi2 = get_doi_for_comparison("10.1038/nature14539")
    assert doi1 == doi2


def test_doi_already_normalized():
    result = normalize_doi("10.1038/nature14539")
    assert result.is_valid
    assert result.normalized_doi == "10.1038/nature14539"
    assert not result.auto_fixed
