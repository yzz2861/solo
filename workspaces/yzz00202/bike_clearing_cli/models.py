from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


class RiskLevel(Enum):
    LOW = "low_risk"
    MEDIUM = "medium_risk"
    HIGH = "high_risk"
    UNKNOWN = "undetermined"

    @classmethod
    def from_value(cls, value: str) -> "RiskLevel":
        for level in cls:
            if level.value == value:
                return level
        return cls.UNKNOWN


class CheckStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    PENDING = "pending"


@dataclass
class BikeRecord:
    bike_id: str
    station_id: str
    station_name: str
    longitude: float = 0.0
    latitude: float = 0.0
    parking_count: int = 0
    capacity: int = 0
    last_update: str = ""
    source: str = ""
    batch_id: str = ""
    raw_data: Dict[str, str] = field(default_factory=dict)
    row_number: int = 0

    @property
    def occupancy_rate(self) -> float:
        if self.capacity <= 0:
            return 0.0
        return self.parking_count / self.capacity


@dataclass
class BadRecord:
    row_number: int
    raw_data: Dict[str, str]
    error_reasons: List[str]
    source: str = ""
    batch_id: str = ""


@dataclass
class DiffRecord:
    bike_id: str
    station_id: str
    field_name: str
    old_value: str
    new_value: str
    change_type: str
    source: str = ""
    batch_id: str = ""


@dataclass
class AssessmentResult:
    bike_id: str
    station_id: str
    station_name: str
    risk_level: RiskLevel
    check_status: CheckStatus
    reason: str
    export_result: str
    history_trace: str = ""
    source: str = ""
    batch_id: str = ""
    raw_record: Optional[BikeRecord] = None


@dataclass
class ProcessingSummary:
    batch_id: str
    source: str
    total_count: int = 0
    success_count: int = 0
    bad_count: int = 0
    diff_count: int = 0
    low_risk_count: int = 0
    medium_risk_count: int = 0
    high_risk_count: int = 0
    unknown_risk_count: int = 0
    started_at: datetime = field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    is_dry_run: bool = False


@dataclass
class RuleConfig:
    station_capacity_low: int = 20
    station_capacity_medium: int = 50
    occupancy_rate_medium: float = 0.7
    occupancy_rate_high: float = 0.9
    required_fields: List[str] = field(default_factory=lambda: [
        "bike_id", "station_id", "station_name",
        "parking_count", "capacity", "last_update"
    ])
    numeric_fields: List[str] = field(default_factory=lambda: [
        "parking_count", "capacity", "longitude", "latitude"
    ])
    diff_fields: List[str] = field(default_factory=lambda: [
        "station_id", "station_name", "parking_count",
        "capacity", "longitude", "latitude"
    ])
