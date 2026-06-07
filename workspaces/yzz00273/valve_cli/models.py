import uuid
import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Any, Optional


class RecordStatus(str, enum.Enum):
    PASSED = "PASSED"
    EXCEPTION = "EXCEPTION"
    BAD = "BAD"


class ExceptionType(str, enum.Enum):
    OVER_THRESHOLD = "OVER_THRESHOLD"
    MISSING_MATERIAL = "MISSING_MATERIAL"
    INVALID_DATE = "INVALID_DATE"
    INVALID_VALUE = "INVALID_VALUE"
    DATE_OUT_OF_RANGE = "DATE_OUT_OF_RANGE"
    DUPLICATE = "DUPLICATE"
    HISTORY_REPLAY = "HISTORY_REPLAY"


class ExportFormat(str, enum.Enum):
    CSV = "csv"
    JSON = "json"
    EXCEL = "xlsx"


@dataclass
class ValveRecord:
    valve_id: str
    valve_name: str = ""
    operation_type: str = ""
    operation_date: datetime = None
    operator: str = ""
    pressure_before: float = 0.0
    pressure_after: float = 0.0
    material: str = ""
    location: str = ""
    remark: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    source_file: str = ""
    batch_id: str = ""
    row_number: int = 0
    status: RecordStatus = RecordStatus.PASSED
    exception_types: List[ExceptionType] = field(default_factory=list)
    exception_reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "valve_id": self.valve_id,
            "valve_name": self.valve_name,
            "operation_type": self.operation_type,
            "operation_date": self.operation_date.strftime("%Y-%m-%d %H:%M:%S") if self.operation_date else "",
            "operator": self.operator,
            "pressure_before": self.pressure_before,
            "pressure_after": self.pressure_after,
            "material": self.material,
            "location": self.location,
            "remark": self.remark,
            "source_file": self.source_file,
            "batch_id": self.batch_id,
            "row_number": self.row_number,
            "status": self.status.value,
            "exception_types": ",".join([e.value for e in self.exception_types]),
            "exception_reasons": "; ".join(self.exception_reasons),
        }
        return d


@dataclass
class FieldMapping:
    valve_id: str = "阀门编号"
    valve_name: str = "阀门名称"
    operation_type: str = "操作类型"
    operation_date: str = "操作时间"
    operator: str = "操作人"
    pressure_before: str = "操作前压力"
    pressure_after: str = "操作后压力"
    material: str = "材料"
    location: str = "位置"
    remark: str = "备注"

    @classmethod
    def from_dict(cls, d: Dict[str, str]) -> "FieldMapping":
        mapping = cls()
        field_names = {f for f in cls.__dataclass_fields__.keys()}
        for k, v in d.items():
            if k in field_names:
                setattr(mapping, k, v)
        return mapping

    def reverse_map(self) -> Dict[str, str]:
        return {v: k for k, v in self.__dict__.items()}


@dataclass
class ProcessConfig:
    input_files: List[str]
    output_dir: str
    field_mapping: FieldMapping
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    export_format: ExportFormat = ExportFormat.CSV
    dry_run: bool = False
    pressure_threshold: float = 0.5
    require_material: bool = True
    batch_id: str = ""
    history_files: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.batch_id:
            self.batch_id = datetime.now().strftime("BATCH_%Y%m%d_%H%M%S")


@dataclass
class ProcessSummary:
    batch_id: str = ""
    total_records: int = 0
    passed_count: int = 0
    exception_count: int = 0
    bad_count: int = 0
    exception_breakdown: Dict[str, int] = field(default_factory=dict)
    source_files: List[str] = field(default_factory=list)
    output_files: List[str] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    dry_run: bool = False

    @property
    def duration_seconds(self) -> float:
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "total_records": self.total_records,
            "passed_count": self.passed_count,
            "exception_count": self.exception_count,
            "bad_count": self.bad_count,
            "pass_rate": f"{(self.passed_count / self.total_records * 100):.2f}%" if self.total_records > 0 else "0%",
            "exception_breakdown": self.exception_breakdown,
            "source_files": self.source_files,
            "output_files": self.output_files,
            "dry_run": self.dry_run,
            "start_time": self.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": self.end_time.strftime("%Y-%m-%d %H:%M:%S") if self.end_time else "",
            "duration_seconds": round(self.duration_seconds, 2),
        }


EXIT_OK = 0
EXIT_WITH_EXCEPTIONS = 1
EXIT_WITH_ERROR = 2
EXIT_INVALID_ARGS = 3
