"""参考文献清洗补全工具"""

__version__ = "0.1.0"

from .models import (
    ReferenceEntry,
    ReferenceType,
    ProcessingStatus,
    ConfirmationItem,
    DuplicateGroup,
    ProcessingReport,
    ProcessedResult,
)

from .pipeline import process_references

__all__ = [
    "ReferenceEntry",
    "ReferenceType",
    "ProcessingStatus",
    "ConfirmationItem",
    "DuplicateGroup",
    "ProcessingReport",
    "ProcessedResult",
    "process_references",
]
