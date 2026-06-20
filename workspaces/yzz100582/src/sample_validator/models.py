from dataclasses import dataclass, field
from datetime import date
from typing import Optional, List, Dict, Tuple
from enum import Enum


class SampleStatus(str, Enum):
    ACTIVE = "active"
    TEMPORARY = "temporary"
    DESTROYED = "destroyed"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class SampleRecord:
    sample_id: str
    box_id: str
    position: str
    status: SampleStatus = SampleStatus.ACTIVE
    batch_id: Optional[str] = None
    collect_date: Optional[date] = None
    sample_type: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None
    row_num: int = 0
    raw_id: str = ""

    def __post_init__(self):
        if not self.raw_id:
            self.raw_id = self.sample_id

    @property
    def normalized_id(self) -> str:
        return self.sample_id.strip().upper()

    @property
    def position_key(self) -> str:
        return f"{self.box_id}:{self.position.upper().strip()}"


@dataclass
class BoxLayout:
    box_id: str
    rows: int = 9
    cols: int = 9
    row_labels: List[str] = field(default_factory=list)
    col_labels: List[str] = field(default_factory=list)
    description: str = ""

    def __post_init__(self):
        if not self.row_labels:
            self.row_labels = [chr(ord('A') + i) for i in range(self.rows)]
        if not self.col_labels:
            self.col_labels = [str(i + 1) for i in range(self.cols)]

    def is_valid_position(self, position: str) -> bool:
        pos = position.strip().upper()
        if len(pos) < 2:
            return False
        row_char = pos[0]
        col_str = pos[1:]
        if row_char not in self.row_labels:
            return False
        try:
            col_num = int(col_str)
            return 1 <= col_num <= self.cols
        except ValueError:
            return False

    def get_all_positions(self) -> List[str]:
        positions = []
        for row in self.row_labels:
            for col in self.col_labels:
                positions.append(f"{row}{col}")
        return positions

    def total_slots(self) -> int:
        return self.rows * self.cols


@dataclass
class BatchRule:
    batch_id: str
    pattern: str = ""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    expected_count: Optional[int] = None
    description: str = ""


@dataclass
class ValidationIssue:
    issue_type: str
    severity: RiskLevel
    message: str
    sample_id: Optional[str] = None
    box_id: Optional[str] = None
    position: Optional[str] = None
    details: Dict[str, str] = field(default_factory=dict)


@dataclass
class BoxOccupancy:
    box_id: str
    layout: BoxLayout
    occupied: Dict[str, SampleRecord] = field(default_factory=dict)

    @property
    def total_slots(self) -> int:
        return self.layout.total_slots()

    @property
    def used_slots(self) -> int:
        return len(self.occupied)

    @property
    def free_slots(self) -> int:
        return self.total_slots - self.used_slots

    @property
    def occupancy_rate(self) -> float:
        if self.total_slots == 0:
            return 0.0
        return self.used_slots / self.total_slots

    def get_free_positions(self) -> List[str]:
        all_pos = set(self.layout.get_all_positions())
        used_pos = set(p.upper() for p in self.occupied.keys())
        return sorted(list(all_pos - used_pos))

    def get_occupied_positions(self) -> List[str]:
        return sorted(list(self.occupied.keys()))


@dataclass
class ValidationReport:
    total_samples: int = 0
    active_samples: int = 0
    temporary_samples: int = 0
    destroyed_samples: int = 0
    total_boxes: int = 0
    issues: List[ValidationIssue] = field(default_factory=list)
    boxes: Dict[str, BoxOccupancy] = field(default_factory=dict)

    @property
    def high_risk_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == RiskLevel.HIGH)

    @property
    def medium_risk_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == RiskLevel.MEDIUM)

    @property
    def low_risk_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == RiskLevel.LOW)

    def get_issues_by_severity(self, severity: RiskLevel) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == severity]
