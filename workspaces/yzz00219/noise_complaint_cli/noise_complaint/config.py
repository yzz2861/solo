from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
import uuid


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNDETERMINED = "undetermined"


class BadRowReason(str, Enum):
    MISSING_REQUIRED_FIELD = "missing_required_field"
    INVALID_PHONE = "invalid_phone"
    INVALID_DATE = "invalid_date"
    INVALID_NOISE_TYPE = "invalid_noise_type"
    DUPLICATE_COMPLAINT_ID = "duplicate_complaint_id"
    OUT_OF_FILTER_RANGE = "out_of_filter_range"
    INVALID_ADDRESS = "invalid_address"
    UNKNOWN_ERROR = "unknown_error"


RISK_LABELS = {
    RiskLevel.LOW: "低风险",
    RiskLevel.MEDIUM: "中风险",
    RiskLevel.HIGH: "高风险",
    RiskLevel.UNDETERMINED: "无法判定",
}

BAD_ROW_LABELS = {
    BadRowReason.MISSING_REQUIRED_FIELD: "缺失必填字段",
    BadRowReason.INVALID_PHONE: "电话号码无效",
    BadRowReason.INVALID_DATE: "日期格式无效",
    BadRowReason.INVALID_NOISE_TYPE: "噪声类型无效",
    BadRowReason.DUPLICATE_COMPLAINT_ID: "投诉编号重复",
    BadRowReason.OUT_OF_FILTER_RANGE: "超出筛选范围",
    BadRowReason.INVALID_ADDRESS: "地址无效",
    BadRowReason.UNKNOWN_ERROR: "未知错误",
}

VALID_NOISE_TYPES = {
    "装修噪声",
    "施工噪声",
    "生活噪声",
    "交通噪声",
    "工业噪声",
    "商业噪声",
    "其他",
}

REQUIRED_FIELDS = [
    "complaint_id",
    "complaint_time",
    "complainant",
    "phone",
    "address",
    "complaint_content",
    "noise_type",
    "source",
]


@dataclass
class FilterParams:
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    noise_types: Optional[List[str]] = None
    districts: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    min_risk_level: Optional[RiskLevel] = None


@dataclass
class MergeParams:
    same_address_distance_threshold: int = 50
    same_complainant_merge: bool = True
    time_window_hours: int = 72
    risk_score_low_max: int = 3
    risk_score_medium_max: int = 7
    high_risk_keywords: List[str] = field(default_factory=lambda: [
        "夜间施工", "凌晨", "严重扰民", "多次投诉", "孕妇", "老人", "婴儿", "学生备考"
    ])
    medium_risk_keywords: List[str] = field(default_factory=lambda: [
        "午休", "周末", "节假日", "持续", "反复"
    ])


@dataclass
class OutputConfig:
    output_dir: str = "./output"
    success_file: str = "success_result.csv"
    bad_rows_file: str = "bad_rows.csv"
    diff_file: str = "diff_result.csv"
    log_file: str = "operation.log"
    encoding: str = "utf-8-sig"


@dataclass
class AppConfig:
    business_ledger_path: str
    params_path: str
    last_result_path: Optional[str] = None
    filter_path: Optional[str] = None
    dry_run: bool = False
    batch_no: str = field(default_factory=lambda: _generate_batch_no())
    source_system: str = "decoration_noise_complaint"
    output: OutputConfig = field(default_factory=OutputConfig)
    merge: MergeParams = field(default_factory=MergeParams)
    filters: FilterParams = field(default_factory=FilterParams)


def _generate_batch_no() -> str:
    now = datetime.now()
    random_suffix = uuid.uuid4().hex[:6].upper()
    return f"BATCH{now.strftime('%Y%m%d%H%M%S')}{random_suffix}"
