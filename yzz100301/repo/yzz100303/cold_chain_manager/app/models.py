from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List
from datetime import datetime


class BoxStatus(str, Enum):
    REGISTERED = "已登记"
    BORROWED = "已借出"
    RETURNED = "已回收"
    REVIEWED = "已复核"
    ISOLATED = "已隔离"


class ReviewResult(str, Enum):
    PENDING = "待复核"
    NORMAL = "正常"
    ABNORMAL = "异常"
    ISOLATED = "隔离"


@dataclass
class BoxInventory:
    box_id: str
    box_type: str = ""
    location: str = ""
    remark: str = ""


@dataclass
class BorrowRecord:
    record_id: str
    box_id: str
    borrow_time: datetime
    borrower: str
    drug_batch: str = ""
    drug_name: str = ""
    purpose: str = ""
    source_file: str = ""

    def __post_init__(self):
        if isinstance(self.borrow_time, str):
            self.borrow_time = datetime.fromisoformat(self.borrow_time)


@dataclass
class TemperaturePoint:
    time: datetime
    temperature: float

    def __post_init__(self):
        if isinstance(self.time, str):
            self.time = datetime.fromisoformat(self.time)


@dataclass
class ReturnRecord:
    record_id: str
    box_id: str
    return_time: datetime
    returner: str
    temperature_points: List[TemperaturePoint] = field(default_factory=list)
    source_file: str = ""
    remark: str = ""

    def __post_init__(self):
        if isinstance(self.return_time, str):
            self.return_time = datetime.fromisoformat(self.return_time)

    @property
    def max_temp(self) -> Optional[float]:
        if not self.temperature_points:
            return None
        return max(p.temperature for p in self.temperature_points)

    @property
    def min_temp(self) -> Optional[float]:
        if not self.temperature_points:
            return None
        return min(p.temperature for p in self.temperature_points)

    @property
    def avg_temp(self) -> Optional[float]:
        if not self.temperature_points:
            return None
        return sum(p.temperature for p in self.temperature_points) / len(self.temperature_points)


@dataclass
class BoxState:
    box_id: str
    inventory: Optional[BoxInventory] = None
    borrow: Optional[BorrowRecord] = None
    return_record: Optional[ReturnRecord] = None
    status: BoxStatus = BoxStatus.REGISTERED
    review_result: ReviewResult = ReviewResult.PENDING
    review_comment: str = ""
    reviewer: str = ""
    review_time: Optional[datetime] = None
    import_sources: set = field(default_factory=set)

    @property
    def has_overtemp(self) -> bool:
        if self.return_record and self.return_record.max_temp is not None:
            return self.return_record.max_temp > 8.0
        return False

    @property
    def returner_mismatch(self) -> bool:
        if self.borrow and self.return_record:
            return self.borrow.borrower != self.return_record.returner
        return False

    @property
    def batch_missing(self) -> bool:
        if self.borrow:
            return not self.borrow.drug_batch.strip()
        return False

    @property
    def has_issues(self) -> bool:
        return self.has_overtemp or self.returner_mismatch or self.batch_missing
