from .models import (
    TermEntry, TermStatus, FileType,
    DocumentSegment, Document, Match, ConflictReport,
    ReplacementRecord, AuditLog,
)
from .glossary_loader import load_glossary
from .document_loader import load_document, detect_file_type
from .matcher import find_matches
from .reporter import generate_preview, generate_report_text
from .confirmator import confirm_interactive
from .writer import write_revised, write_diff, write_audit_log

__version__ = "1.0.0"
__all__ = [
    "TermEntry", "TermStatus", "FileType",
    "DocumentSegment", "Document", "Match", "ConflictReport",
    "ReplacementRecord", "AuditLog",
    "load_glossary", "load_document", "detect_file_type",
    "find_matches", "generate_preview", "generate_report_text",
    "confirm_interactive", "write_revised", "write_diff", "write_audit_log",
]
