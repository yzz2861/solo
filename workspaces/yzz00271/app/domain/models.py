from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReceiptStatus(str, Enum):
    PROCESSABLE = "processable"
    NEED_SUPPLEMENT = "need_supplement"
    LOCKED = "locked"
    FAILED = "failed"
    APPROVED = "approved"
    REJECTED = "rejected"


class ActionType(str, Enum):
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    SUPPLEMENT = "supplement"
    LOCK = "lock"
    UNLOCK = "unlock"


class SourceChannel(str, Enum):
    PACS = "pacs"
    HIS = "his"
    MANUAL = "manual"
    EMERGENCY = "emergency"


class ReceiptItem(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    item_id: str = Field(..., description="明细项唯一标识")
    report_no: str = Field(..., description="影像报告编号")
    patient_id: str = Field(..., description="患者ID")
    patient_name: str = Field(..., description="患者姓名")
    exam_type: str = Field(..., description="检查类型")
    exam_body_part: str = Field(..., description="检查部位")
    critical_value_desc: str = Field(..., description="危急值描述")
    risk_level: RiskLevel = Field(..., description="风险等级")
    required_materials: List[str] = Field(default_factory=list, description="所需材料清单")
    provided_materials: List[str] = Field(default_factory=list, description="已提供材料清单")
    department: str = Field(..., description="申请科室")
    reporting_physician: str = Field(..., description="报告医师")
    report_time: datetime = Field(..., description="报告时间")


class CriticalValueReceipt(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    receipt_id: str = Field(..., description="回执单唯一ID")
    batch_no: str = Field(..., description="批次号")
    item: ReceiptItem = Field(..., description="明细项")
    source_channel: SourceChannel = Field(..., description="来源渠道")
    status: ReceiptStatus = Field(default=ReceiptStatus.PROCESSABLE, description="当前状态")
    risk_tags: List[str] = Field(default_factory=list, description="风险标签")
    failure_reasons: List[str] = Field(default_factory=list, description="失败原因")
    missing_materials: List[str] = Field(default_factory=list, description="缺失材料")
    need_review: bool = Field(default=False, description="是否需要人工复核")
    review_opinion: Optional[str] = Field(None, description="复核意见")
    review_user: Optional[str] = Field(None, description="复核人")
    review_time: Optional[datetime] = Field(None, description="复核时间")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class BatchInfo(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    batch_no: str = Field(..., description="批次号")
    source_channel: SourceChannel = Field(..., description="来源渠道")
    total_count: int = Field(default=0, description="总数量")
    processable_count: int = Field(default=0, description="可办理数量")
    need_supplement_count: int = Field(default=0, description="需补充数量")
    locked_count: int = Field(default=0, description="已锁定数量")
    failed_count: int = Field(default=0, description="失败数量")
    approved_count: int = Field(default=0, description="已通过数量")
    rejected_count: int = Field(default=0, description="已驳回数量")
    high_risk_count: int = Field(default=0, description="高风险数量")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")


class ReceiptResult(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    receipt_id: str
    item_id: str
    report_no: str
    status: ReceiptStatus
    risk_tags: List[str]
    failure_reasons: List[str]
    missing_materials: List[str]
    need_review: bool
    review_opinion: Optional[str] = None


class BatchReceiptRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    batch_no: str = Field(..., description="批次号")
    source_channel: SourceChannel = Field(..., description="来源渠道")
    action: ActionType = Field(default=ActionType.SUBMIT, description="处理动作")
    items: List[ReceiptItem] = Field(..., description="明细项列表")


class ReviewRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    batch_no: str = Field(..., description="批次号")
    receipt_ids: List[str] = Field(..., description="回执ID列表")
    action: ActionType = Field(..., description="复核动作：approve/reject")
    review_opinion: str = Field(..., description="复核意见")
    review_user: str = Field(..., description="复核人")


class BatchReceiptResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    batch_no: str
    total_count: int
    results: List[ReceiptResult]
    summary: Dict[str, int]
