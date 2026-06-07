import hashlib
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from enum import Enum


class RecordStatus(str, Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    REVIEW = "review"
    SCHEDULED = "scheduled"
    EXPORTED = "exported"


class DiffType(str, Enum):
    NEW = "new"
    UPDATED = "updated"
    UNCHANGED = "unchanged"
    DELETED = "deleted"


@dataclass
class BatchInfo:
    batch_id: str
    batch_time: datetime
    source_files: List[str]
    operator: str = "system"
    remark: str = ""

    @classmethod
    def create(cls, source_files: List[str], operator: str = "system", remark: str = "") -> "BatchInfo":
        return cls(
            batch_id=datetime.now().strftime("%Y%m%d%H%M%S") + "_" + uuid.uuid4().hex[:8],
            batch_time=datetime.now(),
            source_files=source_files,
            operator=operator,
            remark=remark,
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["batch_time"] = self.batch_time.strftime("%Y-%m-%d %H:%M:%S")
        return d


@dataclass
class ScheduleRecord:
    record_id: str
    member_name: str
    member_phone: str
    coach_name: str
    course_name: str
    course_date: date
    course_time: str
    duration_minutes: int
    status: RecordStatus = RecordStatus.PENDING
    source_file: str = ""
    source_row: int = 0
    batch_id: str = ""
    errors: List[str] = field(default_factory=list)
    review_comment: str = ""

    def content_hash(self) -> str:
        content = "|".join([
            self.member_name,
            self.member_phone,
            self.coach_name,
            self.course_name,
            self.course_date.isoformat(),
            self.course_time,
            str(self.duration_minutes),
        ])
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["course_date"] = self.course_date.isoformat()
        d["status"] = self.status.value
        return d


@dataclass
class ValidationResult:
    total_count: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    review_count: int = 0
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DiffResult:
    diff_type: DiffType
    record: ScheduleRecord
    old_record: Optional[ScheduleRecord] = None
    changed_fields: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "diff_type": self.diff_type.value,
            "record_id": self.record.record_id,
            "content_hash": self.record.content_hash(),
            "changed_fields": self.changed_fields,
            "new_data": self.record.to_dict(),
            "old_data": self.old_record.to_dict() if self.old_record else None,
        }


@dataclass
class ProcessSummary:
    batch: BatchInfo
    validation: ValidationResult
    diff_summary: Dict[str, int] = field(default_factory=dict)
    output_files: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch": self.batch.to_dict(),
            "validation": self.validation.to_dict(),
            "diff_summary": self.diff_summary,
            "output_files": self.output_files,
        }
