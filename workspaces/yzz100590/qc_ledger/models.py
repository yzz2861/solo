from dataclasses import dataclass, field
from typing import List, Optional, Dict
from datetime import datetime

STATUS_PENDING = "待复检"
STATUS_REWORK_PASSED = "返工通过"
STATUS_CONCESSION = "让步接收"
STATUS_SCRAPPED = "报废"
STATUS_TAKEN_AWAY = "未复检被取走"
STATUS_REWORKING = "返工中"

ALL_STATUSES = [
    STATUS_PENDING,
    STATUS_REWORK_PASSED,
    STATUS_CONCESSION,
    STATUS_SCRAPPED,
    STATUS_TAKEN_AWAY,
    STATUS_REWORKING,
]

TEAM_ALIASES = {
    "一": "一组", "1组": "一组", "一组": "一组", "1班": "一组",
    "二": "二组", "2组": "二组", "二组": "二组", "2班": "二组",
    "三": "三组", "3组": "三组", "三组": "三组", "3班": "三组",
    "四": "四组", "4组": "四组", "四组": "四组", "4班": "四组",
    "五": "五组", "5组": "五组", "五组": "五组", "5班": "五组",
    "焊": "焊接组", "焊接": "焊接组", "焊接组": "焊接组",
    "装": "装配组", "装配": "装配组", "装配组": "装配组",
    "冲": "冲压组", "冲压": "冲压组", "冲压组": "冲压组",
    "车": "车削组", "车削": "车削组", "车削组": "车削组",
    "磨": "磨削组", "磨削": "磨削组", "磨削组": "磨削组",
    "检": "质检组", "质检": "质检组", "质检组": "质检组",
}


@dataclass
class DefectRecord:
    batch_no: str
    process: str
    defect_item: str
    defect_date: Optional[datetime]
    responsible_team: str
    raw_responsible_team: str = ""
    quantity: int = 1
    status: str = STATUS_PENDING
    inspector: str = ""
    remark: str = ""
    record_id: str = ""


@dataclass
class ReinspectionRecord:
    batch_no: str
    reinspection_date: Optional[datetime]
    result: str
    reinspector: str = ""
    is_concession_approved: Optional[bool] = None
    rework_count: int = 1
    remark: str = ""


@dataclass
class Warning:
    level: str
    category: str
    message: str
    batch_no: str = ""
    process: str = ""


@dataclass
class MergedRecord:
    batch_no: str
    process: str
    defect_item: str
    defect_date: Optional[datetime]
    responsible_team: str
    quantity: int
    status: str
    inspector: str
    defect_remark: str
    reinspection_date: Optional[datetime]
    reinspection_result: str
    reinspector: str
    is_concession_approved: Optional[bool]
    rework_count: int
    reinspection_remark: str
    warnings: List[Warning] = field(default_factory=list)
