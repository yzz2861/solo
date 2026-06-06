from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from .models.enums import AuthStatus, RiskLevel, ChannelType, MaterialType, LuxuryCategory, ActionType


class MaterialDocSchema(BaseModel):
    material_type: MaterialType
    name: str
    file_url: Optional[str] = None
    verified: bool = False
    verified_at: Optional[datetime] = None
    remark: Optional[str] = None


class LuxuryItemSchema(BaseModel):
    item_id: str
    name: str
    brand: str
    category: LuxuryCategory
    model: Optional[str] = None
    serial_number: Optional[str] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[datetime] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    materials: List[MaterialDocSchema] = Field(default_factory=list)


class SourceChannelSchema(BaseModel):
    channel_type: ChannelType
    channel_name: str
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    trust_score: Optional[float] = None
    remark: Optional[str] = None


class AuthItemSchema(BaseModel):
    item_no: str
    luxury: LuxuryItemSchema
    source_channel: SourceChannelSchema
    status: AuthStatus = AuthStatus.PENDING
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[float] = None


class AuthBatchRequest(BaseModel):
    batch_no: str
    items: List[AuthItemSchema]
    action: ActionType = ActionType.SUBMIT
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class AuthItemResultSchema(BaseModel):
    item_no: str
    status: AuthStatus
    risk_level: RiskLevel
    risk_score: float
    passed: bool
    reasons: List[str] = Field(default_factory=list)
    missing_materials: List[str] = Field(default_factory=list)
    triggered_rules: List[str] = Field(default_factory=list)
    reviewed: bool = False
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    review_at: Optional[datetime] = None
    trace_id: Optional[str] = None


class AuthBatchResultSchema(BaseModel):
    batch_no: str
    status: AuthStatus
    total_count: int
    passed_count: int
    rejected_count: int
    pending_review_count: int
    item_results: List[AuthItemResultSchema]
    batch_trace_id: str
    processed_at: datetime = Field(default_factory=datetime.now)
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    error_message: Optional[str] = None


class ReviewRequest(BaseModel):
    action: ActionType
    review_opinion: str
    review_by: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditRecordSchema(BaseModel):
    trace_id: str
    batch_no: str
    item_no: Optional[str]
    action: ActionType
    from_status: AuthStatus
    to_status: AuthStatus
    operator: Optional[str] = None
    risk_level_before: Optional[RiskLevel] = None
    risk_level_after: Optional[RiskLevel] = None
    risk_score_before: Optional[float] = None
    risk_score_after: Optional[float] = None
    reasons: List[str] = Field(default_factory=list)
    triggered_rules: List[str] = Field(default_factory=list)
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    timestamp: datetime


class PlaybackSnapshotSchema(BaseModel):
    batch_no: str
    item_no: Optional[str]
    status: AuthStatus
    risk_level: Optional[RiskLevel]
    risk_score: Optional[float]
    reasons: List[str]
    step_index: int
    trace_id: str
    timestamp: datetime
