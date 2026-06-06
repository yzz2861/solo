from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DecisionType(str, Enum):
    PASS = "PASS"
    BLOCK = "BLOCK"
    PENDING_REVIEW = "PENDING_REVIEW"


class HitSource(str, Enum):
    RULE = "RULE"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    DUPLICATE_SUBMISSION = "DUPLICATE_SUBMISSION"


class MaterialStatus(str, Enum):
    COMPLETE = "COMPLETE"
    MISSING = "MISSING"
    INVALID = "INVALID"


class ObjectStatus(str, Enum):
    NORMAL = "NORMAL"
    ABNORMAL = "ABNORMAL"
    DAMAGED = "DAMAGED"
    LOST = "LOST"


class TimeWindow(BaseModel):
    start_time: datetime
    end_time: datetime


class InventoryCheckRequest(BaseModel):
    business_no: str = Field(..., description="业务编号，唯一标识一次盘点业务")
    object_status: ObjectStatus = Field(..., description="盘点对象状态")
    time_window: TimeWindow = Field(..., description="盘点时间窗口")
    rule_version: str = Field(..., description="规则版本号")
    operator: str = Field(..., description="操作人")
    material_status: MaterialStatus = Field(default=MaterialStatus.COMPLETE, description="材料状态")
    profit_loss_amount: float = Field(default=0.0, description="盈亏金额，正数为盈，负数为亏")
    profit_loss_rate: float = Field(default=0.0, description="盈亏比例，如 0.05 表示 5%")
    remark: Optional[str] = Field(default=None, description="备注")


class RuleHitDetail(BaseModel):
    rule_id: str
    rule_name: str
    rule_version: str
    hit_source: HitSource
    decision: DecisionType
    reason_code: str
    reason_message: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class InventoryCheckResponse(BaseModel):
    trace_id: str
    business_no: str
    decision: DecisionType
    decision_label: str
    reason_summary: str
    hit_details: List[RuleHitDetail]
    is_duplicate: bool
    original_trace_id: Optional[str] = None
    rule_version: str
    operator: str
    check_time: datetime
    review_required: bool
    review_deadline: Optional[datetime] = None


class ReviewRecord(BaseModel):
    trace_id: str
    business_no: str
    reviewer: str
    review_time: datetime
    original_decision: DecisionType
    final_decision: DecisionType
    review_comment: str
    rule_version: str


class TraceRecord(BaseModel):
    trace_id: str
    business_no: str
    operator: str
    check_time: datetime
    decision: DecisionType
    rule_version: str
    hit_details: List[RuleHitDetail]
    review_record: Optional[ReviewRecord] = None
