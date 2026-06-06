"""数据模型定义"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from enum import Enum
import uuid
import time


class TaskStatus(str, Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    VALIDATED = "validated"
    GENERATING = "generating"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL_SUCCESS = "partial_success"
    MANUAL_REVIEW = "manual_review"


class ConflictType(str, Enum):
    SAME_INSTITUTION = "same_institution"
    CO_AUTHOR = "co_author"
    SUPERVISOR = "supervisor"
    RECENT_COLLABORATION = "recent_collaboration"
    CUSTOM = "custom"


class RecordStatus(str, Enum):
    SUCCESS = "success"
    BAD_RECORD = "bad_record"
    CONFLICT_DETECTED = "conflict_detected"
    MANUAL_REVIEW = "manual_review"


@dataclass
class PaperRecord:
    paper_id: str
    title: str
    author_name: str
    author_institution: str
    author_email: str = ""
    keywords: str = ""
    abstract: str = ""
    source_file: str = ""
    source_line: int = 0
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReviewerRecord:
    reviewer_id: str
    name: str
    institution: str
    email: str = ""
    research_fields: str = ""
    source_file: str = ""
    source_line: int = 0
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConflictRule:
    rule_type: ConflictType
    description: str
    enabled: bool = True
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssignmentResult:
    paper_id: str
    reviewer_id: str
    reviewer_name: str
    reviewer_institution: str
    conflicts: List[ConflictType] = field(default_factory=list)
    status: RecordStatus = RecordStatus.SUCCESS
    error_message: str = ""
    batch_id: str = ""
    source_file: str = ""
    source_line: int = 0

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["conflicts"] = [c.value for c in self.conflicts]
        d["status"] = self.status.value
        return d


@dataclass
class BatchInfo:
    batch_id: str
    command: str
    start_time: float = field(default_factory=time.time)
    end_time: float = 0.0
    status: TaskStatus = TaskStatus.PENDING
    input_file: str = ""
    rules_file: str = ""
    snapshot_file: str = ""
    output_dir: str = ""
    total_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    bad_count: int = 0
    manual_review_count: int = 0

    @classmethod
    def generate_id(cls) -> str:
        return f"B{int(time.time())}-{uuid.uuid4().hex[:8].upper()}"


@dataclass
class ProcessResult:
    batch: BatchInfo
    assignments: List[AssignmentResult] = field(default_factory=list)
    bad_records: List[Dict[str, Any]] = field(default_factory=list)
    diff_records: List[Dict[str, Any]] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)

    def add_log(self, level: str, message: str):
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        self.logs.append(f"[{ts}] [{level.upper()}] {message}")
