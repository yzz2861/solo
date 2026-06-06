"""对象层：领域模型定义

包含所有业务实体的数据模型，是四层架构的基础。
"""
from .enums import (
    RiskLevel,
    ProcessAction,
    BusinessConclusion,
    NextAction,
    SourceChannel,
    TaskStatus,
)
from .models import (
    DetailItem,
    RiskTag,
    ServiceReceiptRequest,
    ServiceReceiptResponse,
    ReceiptRecord,
)

__all__ = [
    "RiskLevel",
    "ProcessAction",
    "BusinessConclusion",
    "NextAction",
    "SourceChannel",
    "TaskStatus",
    "DetailItem",
    "RiskTag",
    "ServiceReceiptRequest",
    "ServiceReceiptResponse",
    "ReceiptRecord",
]
