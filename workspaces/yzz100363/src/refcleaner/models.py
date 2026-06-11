"""核心数据模型"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class ReferenceType(str, Enum):
    ARTICLE = "article"
    BOOK = "book"
    INCOLLECTION = "incollection"
    INPROCEEDINGS = "inproceedings"
    THESIS = "thesis"
    ONLINE = "online"
    UNKNOWN = "unknown"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    NEEDS_CONFIRMATION = "needs_confirmation"
    DUPLICATE = "duplicate"
    ERROR = "error"


class ConfirmationSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class ConfirmationType(str, Enum):
    HYPHENATED_AUTHOR = "hyphenated_author"
    MISSING_YEAR = "missing_year"
    JOURNAL_ABBREVIATION_CONFLICT = "journal_abbreviation_conflict"
    DOI_CASE_DIFFERENCE = "doi_case_difference"
    CHINESE_PUNCTUATION = "chinese_punctuation"
    MIXED_LANGUAGE = "mixed_language"
    INCOMPLETE_FIELD = "incomplete_field"
    UNCERTAIN_TYPE = "uncertain_type"
    POSSIBLE_DUPLICATE = "possible_duplicate"


@dataclass
class ConfirmationItem:
    type: ConfirmationType
    severity: ConfirmationSeverity
    message: str
    field: Optional[str] = None
    original_value: Optional[str] = None
    suggested_value: Optional[str] = None
    consult_advisor: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "message": self.message,
            "field": self.field,
            "original_value": self.original_value,
            "suggested_value": self.suggested_value,
            "consult_advisor": self.consult_advisor,
        }


@dataclass
class DuplicateGroup:
    group_id: str
    primary_index: int
    duplicate_indices: list[int]
    confidence: float
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "group_id": self.group_id,
            "primary_index": self.primary_index,
            "duplicate_indices": self.duplicate_indices,
            "confidence": self.confidence,
            "reason": self.reason,
        }


@dataclass
class AutoFix:
    field: str
    original_value: str
    new_value: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "field": self.field,
            "original_value": self.original_value,
            "new_value": self.new_value,
            "reason": self.reason,
        }


@dataclass
class ReferenceEntry:
    original_text: str
    original_position: int
    entry_type: ReferenceType = ReferenceType.UNKNOWN
    citation_key: Optional[str] = None
    authors: list[str] = field(default_factory=list)
    title: Optional[str] = None
    journal: Optional[str] = None
    booktitle: Optional[str] = None
    year: Optional[int] = None
    volume: Optional[str] = None
    number: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    isbn: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.PENDING
    auto_fixes: list[AutoFix] = field(default_factory=list)
    confirmation_items: list[ConfirmationItem] = field(default_factory=list)
    raw_fields: dict[str, Any] = field(default_factory=dict)
    stable_id: str = ""
    output_position: int = -1

    def __post_init__(self) -> None:
        if not self.stable_id:
            self.stable_id = f"ref_{self.original_position:06d}_{hash(self.original_text) & 0xFFFFFFFF:08x}"

    def add_auto_fix(self, field: str, original: str, new: str, reason: str) -> None:
        self.auto_fixes.append(AutoFix(field, original, new, reason))

    def add_confirmation(self, item: ConfirmationItem) -> None:
        self.confirmation_items.append(item)
        if self.status == ProcessingStatus.PROCESSED:
            self.status = ProcessingStatus.NEEDS_CONFIRMATION

    def needs_confirmation(self) -> bool:
        return any(item.consult_advisor for item in self.confirmation_items)

    def to_dict(self) -> dict[str, Any]:
        return {
            "original_position": self.original_position,
            "output_position": self.output_position,
            "stable_id": self.stable_id,
            "entry_type": self.entry_type.value,
            "citation_key": self.citation_key,
            "authors": self.authors,
            "title": self.title,
            "journal": self.journal,
            "booktitle": self.booktitle,
            "year": self.year,
            "volume": self.volume,
            "number": self.number,
            "pages": self.pages,
            "publisher": self.publisher,
            "doi": self.doi,
            "url": self.url,
            "status": self.status.value,
            "auto_fixes": [f.to_dict() for f in self.auto_fixes],
            "confirmation_items": [c.to_dict() for c in self.confirmation_items],
            "original_text": self.original_text,
        }


@dataclass
class ProcessingReport:
    total_entries: int = 0
    processed_entries: int = 0
    auto_fixed_entries: int = 0
    needs_confirmation_entries: int = 0
    duplicate_entries: int = 0
    error_entries: int = 0
    duplicate_groups: list[DuplicateGroup] = field(default_factory=list)
    auto_fixes_count: int = 0
    confirmation_items_count: int = 0
    consult_advisor_count: int = 0
    processing_time: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_entries": self.total_entries,
            "processed_entries": self.processed_entries,
            "auto_fixed_entries": self.auto_fixed_entries,
            "needs_confirmation_entries": self.needs_confirmation_entries,
            "duplicate_entries": self.duplicate_entries,
            "error_entries": self.error_entries,
            "duplicate_groups": [g.to_dict() for g in self.duplicate_groups],
            "auto_fixes_count": self.auto_fixes_count,
            "confirmation_items_count": self.confirmation_items_count,
            "consult_advisor_count": self.consult_advisor_count,
            "processing_time": round(self.processing_time, 2),
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class ProcessedResult:
    entries: list[ReferenceEntry]
    report: ProcessingReport

    def get_output_order_entries(self) -> list[ReferenceEntry]:
        return sorted(
            [e for e in self.entries if e.status != ProcessingStatus.DUPLICATE],
            key=lambda e: e.output_position,
        )

    def get_duplicate_entries(self) -> list[ReferenceEntry]:
        return [e for e in self.entries if e.status == ProcessingStatus.DUPLICATE]

    def get_confirmation_entries(self) -> list[ReferenceEntry]:
        return [e for e in self.entries if e.confirmation_items]
