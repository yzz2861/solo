"""配置常量与默认值"""

from enum import Enum


class RecordStatus(str, Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    PENDING_REVIEW = "pending_review"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNDETERMINED = "undetermined"


STATUS_CN = {
    RecordStatus.NORMAL: "正常",
    RecordStatus.ABNORMAL: "异常",
    RecordStatus.PENDING_REVIEW: "待复核",
}

RISK_CN = {
    RiskLevel.LOW: "低风险",
    RiskLevel.MEDIUM: "中风险",
    RiskLevel.HIGH: "高风险",
    RiskLevel.UNDETERMINED: "无法判定",
}

DEFAULT_FIELD_MAPPING = {
    "name": "姓名",
    "id_card": "身份证号",
    "phone": "联系电话",
    "school": "学校",
    "grade": "年级",
    "activity_name": "活动名称",
    "start_date": "活动开始日期",
    "end_date": "活动结束日期",
    "insurance_company": "保险公司",
    "policy_number": "保单号",
    "insurance_amount": "保额",
    "premium": "保费",
}

REQUIRED_FIELDS = ["name", "id_card", "activity_name", "start_date", "end_date"]

EXPORT_FORMATS = ["csv", "excel", "json"]

BATCH_FILE = ".batch_history.json"
