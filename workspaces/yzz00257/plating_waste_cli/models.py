from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime


class RecordStatus(str, Enum):
    PASS = "pass"
    EXCEPTION = "exception"
    BAD_ROW = "bad_row"
    DUPLICATE = "duplicate"
    RULE_CONFLICT = "rule_conflict"
    MISSING_FIELD = "missing_field"


class ExceptionType(str, Enum):
    MISSING_FIELD = "missing_field"
    RULE_CONFLICT = "rule_conflict"
    DUPLICATE = "duplicate"
    INVALID_VALUE = "invalid_value"


@dataclass
class PlatingRecord:
    raw: Dict[str, str]
    line_no: int = 0
    source_file: str = ""
    batch_id: str = ""
    status: RecordStatus = RecordStatus.PASS
    exception_types: List[ExceptionType] = field(default_factory=list)
    exception_messages: List[str] = field(default_factory=list)
    rule_matches: List[str] = field(default_factory=list)

    def get(self, key: str, default: str = "") -> str:
        return self.raw.get(key, default)

    def has_field(self, key: str) -> bool:
        return key in self.raw and self.raw[key].strip() != ""


@dataclass
class ProcessingSummary:
    batch_id: str
    source_file: str
    total_input: int = 0
    pass_count: int = 0
    exception_count: int = 0
    bad_row_count: int = 0
    duplicate_count: int = 0
    rule_conflict_count: int = 0
    missing_field_count: int = 0
    output_pass_file: str = ""
    output_exception_file: str = ""
    output_summary_file: str = ""
    bad_row_file: str = ""
    dry_run: bool = False
    started_at: datetime = field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "source_file": self.source_file,
            "total_input": self.total_input,
            "pass_count": self.pass_count,
            "exception_count": self.exception_count,
            "bad_row_count": self.bad_row_count,
            "duplicate_count": self.duplicate_count,
            "rule_conflict_count": self.rule_conflict_count,
            "missing_field_count": self.missing_field_count,
            "output_pass_file": self.output_pass_file,
            "output_exception_file": self.output_exception_file,
            "output_summary_file": self.output_summary_file,
            "bad_row_file": self.bad_row_file,
            "dry_run": self.dry_run,
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }
