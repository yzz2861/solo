"""枚举类型定义"""
from enum import Enum


class RiskLevel(str, Enum):
    """风险等级"""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ProcessAction(str, Enum):
    """处理动作"""
    SUBMIT = "SUBMIT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REVIEW = "REVIEW"
    SUPPLEMENT = "SUPPLEMENT"


class BusinessConclusion(str, Enum):
    """业务结论"""
    PASSED = "PASSED"
    REJECTED = "REJECTED"
    PENDING_REVIEW = "PENDING_REVIEW"
    PENDING_SUPPLEMENT = "PENDING_SUPPLEMENT"


class NextAction(str, Enum):
    """下一步动作"""
    WAIT_REVIEW = "WAIT_REVIEW"
    SUPPLY_MATERIALS = "SUPPLY_MATERIALS"
    COMPLETE = "COMPLETE"
    ARCHIVE = "ARCHIVE"


class SourceChannel(str, Enum):
    """来源渠道"""
    COURT = "COURT"
    ARBITRATION_COMMISSION = "ARBITRATION_COMMISSION"
    POST_SERVICE = "POST_SERVICE"
    ELECTRONIC_DELIVERY = "ELECTRONIC_DELIVERY"
    ON_SITE = "ON_SITE"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUPPLEMENTING = "SUPPLEMENTING"
    CLOSED = "CLOSED"


class RuleType(str, Enum):
    """规则类型"""
    MATERIAL_CHECK = "MATERIAL_CHECK"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    COMPLIANCE_CHECK = "COMPLIANCE_CHECK"
    FLOW_CONTROL = "FLOW_CONTROL"
