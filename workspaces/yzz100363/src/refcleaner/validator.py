"""待确认项检测模块"""

from __future__ import annotations

import re
from typing import Optional

from .models import (
    ConfirmationItem,
    ConfirmationSeverity,
    ConfirmationType,
    ProcessingStatus,
    ReferenceEntry,
)


CHINESE_PUNCTUATION_PATTERN = re.compile(r'[，。；：""''（）【】《》、]')
HYPHENATED_NAME_PATTERN = re.compile(r'[A-Za-z]+\-[A-Za-z]+')

JOURNAL_ABBREVIATIONS = {
    'journal of the american chemical society': ['j. am. chem. soc.', 'jacs'],
    'nature': ['nature'],
    'science': ['science'],
    'physical review letters': ['phys. rev. lett.', 'prl'],
    'cell': ['cell'],
    'the lancet': ['lancet'],
    'new england journal of medicine': ['n. engl. j. med.', 'nejm'],
    'journal of biological chemistry': ['j. biol. chem.', 'jbc'],
    'proceedings of the national academy of sciences': ['proc. natl. acad. sci. u.s.a.', 'pnas'],
    'advanced materials': ['adv. mater.'],
    'chemical reviews': ['chem. rev.'],
    'nano letters': ['nano lett.'],
    'acs nano': ['acs nano'],
    'journal of physical chemistry letters': ['j. phys. chem. lett.', 'jpcl'],
    'applied physics letters': ['appl. phys. lett.', 'apl'],
    'optics letters': ['opt. lett.', 'ol'],
    'ieee transactions on pattern analysis and machine intelligence': ['ieee trans. pattern anal. mach. intell.', 'tpami'],
    'communications of the acm': ['commun. acm', 'cacm'],
    'computer': ['computer'],
}


class EntryValidator:
    def __init__(self) -> None:
        self.journal_abbrev_map = self._build_journal_map()

    def _build_journal_map(self) -> dict[str, list[str]]:
        mapping: dict[str, list[str]] = {}
        for full_name, abbreviations in JOURNAL_ABBREVIATIONS.items():
            mapping[full_name] = abbreviations
            for abbr in abbreviations:
                mapping[abbr] = [full_name] + [a for a in abbreviations if a != abbr]
        return mapping

    def validate(self, entry: ReferenceEntry) -> None:
        if entry.status == ProcessingStatus.DUPLICATE:
            return

        self._check_missing_fields(entry)
        self._check_hyphenated_authors(entry)
        self._check_chinese_punctuation(entry)
        self._check_mixed_language(entry)
        self._check_journal_abbreviation(entry)
        self._check_uncertain_type(entry)

    def _check_missing_fields(self, entry: ReferenceEntry) -> None:
        missing_fields = []

        if not entry.authors:
            missing_fields.append("作者")
        if not entry.title:
            missing_fields.append("标题")
        if not entry.year:
            entry.add_confirmation(
                ConfirmationItem(
                    type=ConfirmationType.MISSING_YEAR,
                    severity=ConfirmationSeverity.WARNING,
                    message="年份缺失，建议补充或咨询导师",
                    field="year",
                    consult_advisor=True,
                )
            )
            missing_fields.append("年份")

        if entry.entry_type in (
            ReferenceEntry.ARTICLE if hasattr(ReferenceEntry, 'ARTICLE') else None,
        ):
            if not entry.journal:
                missing_fields.append("期刊")

        if missing_fields:
            entry.add_confirmation(
                ConfirmationItem(
                    type=ConfirmationType.INCOMPLETE_FIELD,
                    severity=ConfirmationSeverity.WARNING,
                    message=f"字段不完整，缺少: {', '.join(missing_fields)}",
                    consult_advisor=len(missing_fields) > 1,
                )
            )

    def _check_hyphenated_authors(self, entry: ReferenceEntry) -> None:
        for i, author in enumerate(entry.authors):
            if HYPHENATED_NAME_PATTERN.search(author):
                entry.add_confirmation(
                    ConfirmationItem(
                        type=ConfirmationType.HYPHENATED_AUTHOR,
                        severity=ConfirmationSeverity.INFO,
                        message=f"作者名包含连字符: {author}，请确认格式是否正确",
                        field=f"authors[{i}]",
                        original_value=author,
                        consult_advisor=False,
                    )
                )

    def _check_chinese_punctuation(self, entry: ReferenceEntry) -> None:
        text = entry.original_text
        matches = CHINESE_PUNCTUATION_PATTERN.findall(text)

        if matches:
            unique_matches = sorted(set(matches))
            entry.add_confirmation(
                ConfirmationItem(
                    type=ConfirmationType.CHINESE_PUNCTUATION,
                    severity=ConfirmationSeverity.WARNING,
                    message=f"检测到中文标点: {', '.join(unique_matches)}，已自动替换为英文标点",
                    original_value=''.join(unique_matches),
                    consult_advisor=False,
                )
            )

            self._fix_chinese_punctuation(entry)

    def _fix_chinese_punctuation(self, entry: ReferenceEntry) -> None:
        replace_map = {
            '，': ', ',
            '。': '. ',
            '；': '; ',
            '：': ': ',
            '"': '"',
            '"': '"',
            ''': "'",
            ''': "'",
            '（': '(',
            '）': ')',
            '【': '[',
            '】': ']',
            '《': '"',
            '》': '"',
            '、': ', ',
        }

        fields_to_check = ['title', 'journal', 'booktitle', 'publisher']

        for field in fields_to_check:
            value = getattr(entry, field, None)
            if isinstance(value, str):
                original = value
                new = original
                for ch, en in replace_map.items():
                    new = new.replace(ch, en)
                if new != original:
                    setattr(entry, field, new)
                    entry.add_auto_fix(field, original, new, "替换中文标点为英文标点")

    def _check_mixed_language(self, entry: ReferenceEntry) -> None:
        fields_to_check = [
            ('title', entry.title),
            ('journal', entry.journal),
        ]

        for field_name, value in fields_to_check:
            if not value:
                continue

            has_chinese = bool(re.search(r'[\u4e00-\u9fff]', value))
            has_english = bool(re.search(r'[A-Za-z]', value))

            if has_chinese and has_english:
                entry.add_confirmation(
                    ConfirmationItem(
                        type=ConfirmationType.MIXED_LANGUAGE,
                        severity=ConfirmationSeverity.WARNING,
                        message=f"{field_name} 中英混排，请确认期刊名是否需要统一语言",
                        field=field_name,
                        original_value=value,
                        consult_advisor=True,
                    )
                )

    def _check_journal_abbreviation(self, entry: ReferenceEntry) -> None:
        if not entry.journal:
            return

        journal_normalized = entry.journal.strip().lower().rstrip('.')

        for full_name, abbreviations in JOURNAL_ABBREVIATIONS.items():
            if journal_normalized == full_name:
                standard_abbr = abbreviations[0]
                entry.add_confirmation(
                    ConfirmationItem(
                        type=ConfirmationType.JOURNAL_ABBREVIATION_CONFLICT,
                        severity=ConfirmationSeverity.INFO,
                        message=(
                            f"期刊名检测到全称: {entry.journal}，"
                            f"标准缩写为: {standard_abbr}，请确认是否需要缩写"
                        ),
                        field="journal",
                        original_value=entry.journal,
                        suggested_value=standard_abbr,
                        consult_advisor=True,
                    )
                )
                break

            if journal_normalized in [a.lower().rstrip('.') for a in abbreviations]:
                entry.add_confirmation(
                    ConfirmationItem(
                        type=ConfirmationType.JOURNAL_ABBREVIATION_CONFLICT,
                        severity=ConfirmationSeverity.INFO,
                        message=(
                            f"期刊名检测到缩写: {entry.journal}，"
                            f"全称为: {full_name}，请确认是否需要全称"
                        ),
                        field="journal",
                        original_value=entry.journal,
                        suggested_value=full_name,
                        consult_advisor=True,
                    )
                )
                break

    def _check_uncertain_type(self, entry: ReferenceEntry) -> None:
        from .models import ReferenceType
        if entry.entry_type == ReferenceType.UNKNOWN:
            entry.add_confirmation(
                ConfirmationItem(
                    type=ConfirmationType.UNCERTAIN_TYPE,
                    severity=ConfirmationSeverity.INFO,
                    message="文献类型无法自动识别，请确认并手动指定",
                    field="entry_type",
                    consult_advisor=False,
                )
            )


def validate_entries(entries: list[ReferenceEntry]) -> None:
    validator = EntryValidator()
    for entry in entries:
        validator.validate(entry)
