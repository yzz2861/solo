"""DOI 规范化模块"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional, Tuple

from .models import ConfirmationItem, ConfirmationSeverity, ConfirmationType, ReferenceEntry


DOI_REGEX = re.compile(
    r'^10\.\d{4,9}/[\-._;()/:A-Za-z0-9]+$',
)

DOI_EXTRACT_REGEX = re.compile(
    r'(?:https?://(?:dx\.)?doi\.org/|doi:\s*|DOI:\s*)?(10\.\d{4,9}/[\-._;()/:A-Za-z0-9]+)',
)

DOI_PREFIX_REGEX = re.compile(r'^10\.\d{4,9}/')


@dataclass
class DOIValidationResult:
    is_valid: bool
    normalized_doi: Optional[str]
    original_doi: Optional[str]
    issues: list[str]
    auto_fixed: bool


def normalize_doi(doi: Optional[str]) -> DOIValidationResult:
    if not doi:
        return DOIValidationResult(
            is_valid=False,
            normalized_doi=None,
            original_doi=None,
            issues=["DOI is empty"],
            auto_fixed=False,
        )

    original = doi.strip()
    issues: list[str] = []
    auto_fixed = False

    match = DOI_EXTRACT_REGEX.search(original)
    if not match:
        return DOIValidationResult(
            is_valid=False,
            normalized_doi=None,
            original_doi=original,
            issues=["No valid DOI pattern found"],
            auto_fixed=False,
        )

    extracted = match.group(1)
    working = extracted

    if working != original:
        issues.append(f"Extracted DOI from prefix: {original} -> {working}")
        auto_fixed = True

    prefix_match = DOI_PREFIX_REGEX.match(working)
    if not prefix_match:
        issues.append("Invalid DOI prefix format (should be 10.xxxx/)")
        return DOIValidationResult(
            is_valid=False,
            normalized_doi=None,
            original_doi=original,
            issues=issues,
            auto_fixed=auto_fixed,
        )

    prefix = prefix_match.group(0)
    suffix = working[len(prefix):]

    normalized_prefix = prefix.lower()
    normalized_suffix = suffix.lower()

    if normalized_prefix != prefix or normalized_suffix != suffix:
        issues.append(
            f"DOI normalized to lowercase: {prefix}{suffix} -> "
            f"{normalized_prefix}{normalized_suffix}"
        )
        auto_fixed = True

    if normalized_suffix.endswith('.') or normalized_suffix.endswith(',') or normalized_suffix.endswith(';'):
        normalized_suffix = normalized_suffix.rstrip('.,;')
        issues.append("Removed trailing punctuation from DOI")
        auto_fixed = True

    normalized = normalized_prefix + normalized_suffix

    if not DOI_REGEX.match(normalized):
        issues.append("DOI does not match standard format after normalization")
        return DOIValidationResult(
            is_valid=False,
            normalized_doi=None,
            original_doi=original,
            issues=issues,
            auto_fixed=auto_fixed,
        )

    if normalized != extracted:
        auto_fixed = True

    return DOIValidationResult(
        is_valid=True,
        normalized_doi=normalized,
        original_doi=original,
        issues=issues,
        auto_fixed=auto_fixed,
    )


def process_entry_doi(entry: ReferenceEntry) -> None:
    if not entry.doi:
        return

    original_doi = entry.doi
    result = normalize_doi(original_doi)

    if not result.is_valid:
        entry.add_confirmation(
            ConfirmationItem(
                type=ConfirmationType.INCOMPLETE_FIELD,
                severity=ConfirmationSeverity.WARNING,
                message=f"DOI 格式无效: {original_doi}",
                field="doi",
                original_value=original_doi,
                consult_advisor=False,
            )
        )
        return

    if result.auto_fixed and result.normalized_doi:
        entry.doi = result.normalized_doi
        reason = "; ".join(result.issues) if result.issues else "DOI 规范化"
        entry.add_auto_fix("doi", original_doi, result.normalized_doi, reason)

    if original_doi and result.normalized_doi and original_doi != result.normalized_doi:
        has_case_diff = (
            original_doi.lower() == result.normalized_doi.lower()
            and original_doi != result.normalized_doi
        )
        if has_case_diff:
            entry.add_confirmation(
                ConfirmationItem(
                    type=ConfirmationType.DOI_CASE_DIFFERENCE,
                    severity=ConfirmationSeverity.INFO,
                    message="DOI 存在大小写差异，已统一为标准格式",
                    field="doi",
                    original_value=original_doi,
                    suggested_value=result.normalized_doi,
                    consult_advisor=False,
                )
            )


def get_doi_for_comparison(doi: Optional[str]) -> Optional[str]:
    if not doi:
        return None
    result = normalize_doi(doi)
    if result.is_valid and result.normalized_doi:
        return result.normalized_doi.lower()
    return None


def check_doi_case_conflicts(entries: list[ReferenceEntry]) -> dict[str, list[tuple[int, str]]]:
    doi_groups: dict[str, list[tuple[int, str]]] = {}

    for entry in entries:
        if entry.doi:
            normalized_lower = get_doi_for_comparison(entry.doi)
            if normalized_lower:
                doi_groups.setdefault(normalized_lower, []).append(
                    (entry.original_position, entry.doi)
                )

    return {k: v for k, v in doi_groups.items() if len(v) > 1}


def extract_doi_from_text(text: str) -> Optional[str]:
    match = DOI_EXTRACT_REGEX.search(text)
    if match:
        result = normalize_doi(match.group(1))
        if result.is_valid:
            return result.normalized_doi
    return None
