from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from pathlib import Path


class TermStatus(str, Enum):
    STANDARD = "standard"
    FORBIDDEN = "forbidden"
    NEEDS_REVIEW = "needs_review"


class FileType(str, Enum):
    SRT = "srt"
    VTT = "vtt"
    MARKDOWN = "md"
    UNKNOWN = "unknown"


@dataclass
class TermEntry:
    source: str
    preferred: str
    status: TermStatus = TermStatus.STANDARD
    alternatives: List[str] = field(default_factory=list)
    forbidden_variants: List[str] = field(default_factory=list)
    context_hint: Optional[str] = None
    chapter_exceptions: Dict[str, str] = field(default_factory=dict)
    case_sensitive: bool = False
    match_plural: bool = True
    word_boundary: bool = True
    priority: int = 0
    notes: Optional[str] = None


@dataclass
class DocumentSegment:
    index: int
    timestamp: Optional[str] = None
    content: str = ""
    chapter: Optional[str] = None
    line_start: int = 0
    line_end: int = 0


@dataclass
class Document:
    path: Path
    file_type: FileType
    segments: List[DocumentSegment]
    raw_content: str


@dataclass
class Match:
    segment_index: int
    start: int
    end: int
    original: str
    term_source: str
    suggested: str
    status: TermStatus
    reason: str = ""
    context_before: str = ""
    context_after: str = ""
    needs_manual_review: bool = False
    approved: Optional[bool] = None
    reviewer_note: Optional[str] = None


@dataclass
class ConflictReport:
    forbidden_matches: List[Match] = field(default_factory=list)
    inconsistent_matches: List[Match] = field(default_factory=list)
    needs_review_matches: List[Match] = field(default_factory=list)
    total_replacements: int = 0
    total_forbidden: int = 0
    total_inconsistent: int = 0
    total_needs_review: int = 0


@dataclass
class ReplacementRecord:
    timestamp: str
    document_path: str
    segment_index: int
    original_text: str
    revised_text: str
    term_source: str
    original_variant: str
    replacement: str
    status: TermStatus
    reason: str
    reviewer: Optional[str] = None
    chapter: Optional[str] = None
    line_number: int = 0
    context: str = ""


@dataclass
class AuditLog:
    entries: List[ReplacementRecord] = field(default_factory=list)

    def to_csv(self) -> str:
        import csv
        import io
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "timestamp", "document_path", "segment_index", "chapter",
            "line_number", "term_source", "original_variant", "replacement",
            "status", "reason", "reviewer", "context",
            "original_text", "revised_text"
        ])
        for e in self.entries:
            writer.writerow([
                e.timestamp, e.document_path, e.segment_index,
                e.chapter or "", e.line_number, e.term_source,
                e.original_variant, e.replacement, e.status.value,
                e.reason, e.reviewer or "", e.context,
                e.original_text, e.revised_text
            ])
        return buf.getvalue()
