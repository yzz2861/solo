from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class LeaveType(str, Enum):
    SICK = "病假"
    PERSONAL = "事假"
    PUBLIC = "公假"
    OTHER = "其他"


class SourceType(str, Enum):
    SMS = "短信"
    PAPER = "请假条"
    ABSENCE = "缺勤记录"


class AnomalyType(str, Enum):
    HOMONYM = "姓名同音"
    HALF_DAY = "半天假歧义"
    TYPE_CONFLICT = "病假转事假"
    NO_LETTER = "缺勤无请假条"
    DUPLICATE = "重复记录"


@dataclass
class LeaveRecord:
    student_name: str
    record_date: date
    period: str
    leave_type: LeaveType
    reason: str
    source: SourceType
    raw_content: str = ""
    is_half_day: Optional[bool] = None
    teacher: Optional[str] = None
    contact: Optional[str] = None
    record_id: str = ""

    def merge_key(self) -> tuple:
        return (self.student_name, self.record_date, self.period)

    def detail_key(self) -> tuple:
        return (self.student_name, self.record_date, self.period, self.leave_type.value, self.reason)


@dataclass
class Anomaly:
    anomaly_type: AnomalyType
    description: str
    related_records: List[LeaveRecord]
    severity: str = "warning"
    suggestions: str = ""


@dataclass
class ClassSummary:
    class_name: str
    total_days: int
    total_leave_count: int
    sick_count: int
    personal_count: int
    public_count: int
    other_count: int
    anomaly_count: int
    students_with_leave: List[str]


@dataclass
class SickAlert:
    date: date
    sick_count: int
    threshold: int
    student_names: List[str]
    message: str
