from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime, date
import uuid
import hashlib
import json


@dataclass
class SourceRecord:
    source_file: str
    row_number: int
    raw_data: Dict[str, Any]
    raw_id: str = ""

    def compute_row_hash(self) -> str:
        payload = json.dumps(self.raw_data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


@dataclass
class PrecoolRecord:
    record_id: str
    batch_id: str
    source_file: str
    row_number: int
    source_row_hash: str
    product_name: str
    product_type: str
    quantity: float
    unit: str
    inbound_date: date
    target_temp: float
    current_temp: float
    precool_hours: float
    precool_start: datetime
    precool_end: datetime
    precool_room: str
    status: str
    review_required: bool = False
    review_reason: str = ""
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["inbound_date"] = self.inbound_date.isoformat()
        d["precool_start"] = self.precool_start.isoformat()
        d["precool_end"] = self.precool_end.isoformat()
        return d


@dataclass
class ValidationResult:
    passed: List[PrecoolRecord] = field(default_factory=list)
    exceptions: List[PrecoolRecord] = field(default_factory=list)

    @property
    def total_count(self) -> int:
        return len(self.passed) + len(self.exceptions)

    @property
    def pass_count(self) -> int:
        return len(self.passed)

    @property
    def exception_count(self) -> int:
        return len(self.exceptions)

    @property
    def review_count(self) -> int:
        return sum(1 for r in self.passed if r.review_required)


@dataclass
class BatchSummary:
    batch_id: str
    generated_at: str
    source_files: List[str]
    date_range_start: str
    date_range_end: str
    total_records: int
    passed_records: int
    exception_records: int
    review_records: int
    precool_rooms: List[str]
    total_precool_hours: float
    idempotency_key: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def generate_batch_id() -> str:
    return datetime.now().strftime("BATCH-%Y%m%d-%H%M%S")


def generate_record_id(batch_id: str, row_hash: str) -> str:
    return f"REC-{batch_id}-{row_hash}"
