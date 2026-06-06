"""业务实体模型定义"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from .enums import (
    RiskLevel,
    ProcessAction,
    BusinessConclusion,
    NextAction,
    SourceChannel,
    TaskStatus,
)


class DetailItem(BaseModel):
    """明细项：送达回证中的每一项内容"""
    item_id: str = Field(..., description="明细项ID")
    item_name: str = Field(..., description="明细项名称")
    item_value: Optional[str] = Field(None, description="明细项值")
    required: bool = Field(default=True, description="是否为必填项")
    category: str = Field(default="default", description="明细项分类")
    remark: Optional[str] = Field(None, description="备注")


class RiskTag(BaseModel):
    """风险标签"""
    tag_id: str = Field(..., description="标签ID")
    tag_name: str = Field(..., description="标签名称")
    risk_level: RiskLevel = Field(..., description="风险等级")
    description: str = Field(..., description="风险描述")
    rule_source: str = Field(..., description="触发规则来源")


class ServiceReceiptRequest(BaseModel):
    """送达回证处理请求"""
    batch_no: str = Field(..., description="批次号")
    items: List[DetailItem] = Field(default_factory=list, description="明细项列表")
    source_channel: SourceChannel = Field(..., description="来源渠道")
    process_action: ProcessAction = Field(..., description="处理动作")
    review_opinion: Optional[str] = Field(None, description="复核意见")
    operator: Optional[str] = Field(None, description="操作人")
    biz_date: Optional[str] = Field(None, description="业务日期")


class ServiceReceiptResponse(BaseModel):
    """送达回证处理响应"""
    batch_no: str = Field(..., description="批次号")
    business_conclusion: BusinessConclusion = Field(..., description="业务结论")
    risk_tags: List[RiskTag] = Field(default_factory=list, description="风险标签列表")
    next_action: NextAction = Field(..., description="下一步动作")
    audit_no: str = Field(..., description="审计编号")
    task_status: TaskStatus = Field(..., description="任务状态")
    missing_items: List[str] = Field(default_factory=list, description="缺失材料清单")
    process_time: datetime = Field(default_factory=datetime.now, description="处理时间")
    message: Optional[str] = Field(None, description="处理说明")


class ReceiptRecord(BaseModel):
    """送达回证记录 - 用于数据回放和审计追踪"""
    record_id: str = Field(..., description="记录ID")
    batch_no: str = Field(..., description="批次号")
    source_channel: SourceChannel = Field(..., description="来源渠道")
    process_action: ProcessAction = Field(..., description="处理动作")
    previous_status: TaskStatus = Field(..., description="处理前状态")
    current_status: TaskStatus = Field(..., description="处理后状态")
    items: List[DetailItem] = Field(default_factory=list, description="明细项快照")
    risk_tags: List[RiskTag] = Field(default_factory=list, description="风险标签快照")
    business_conclusion: BusinessConclusion = Field(..., description="业务结论")
    review_opinion: Optional[str] = Field(None, description="复核意见")
    operator: Optional[str] = Field(None, description="操作人")
    audit_no: str = Field(..., description="审计编号")
    timestamp: datetime = Field(default_factory=datetime.now, description="记录时间戳")
    remark: Optional[str] = Field(None, description="备注")
