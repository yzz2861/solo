from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from .schema import CertStatus, RiskLevel, RuleCategory, EvidenceMaterial


class HitRule(BaseModel):
    rule_id: str = Field(..., description="规则ID")
    rule_name: str = Field(..., description="规则名称")
    rule_category: RuleCategory = Field(..., description="规则分类")
    risk_level: RiskLevel = Field(..., description="风险等级")
    description: str = Field(..., description="规则描述")
    evidence: Optional[str] = Field(None, description="命中证据")
    actual_value: Optional[Any] = Field(None, description="实际值")
    threshold_value: Optional[Any] = Field(None, description="阈值")


class ReadableReason(BaseModel):
    summary: str = Field(..., description="一句话结论")
    detail: str = Field(..., description="详细原因说明")
    suggestion: Optional[str] = Field(None, description="处理建议")
    evidence_points: List[str] = Field(default_factory=list, description="证据要点列表")


class AuditTrace(BaseModel):
    trace_id: str = Field(..., description="追溯ID")
    process_time: datetime = Field(..., description="处理时间")
    input_snapshot: Dict[str, Any] = Field(..., description="输入数据快照")
    rule_chain: List[str] = Field(default_factory=list, description="执行的规则链")
    decision_path: List[str] = Field(default_factory=list, description="决策路径")
    version: str = Field("1.0", description="规则引擎版本")


class ReplayData(BaseModel):
    replay_id: str = Field(..., description="回放ID")
    original_trace_id: str = Field(..., description="原始追溯ID")
    replay_time: datetime = Field(..., description="回放时间")
    original_result: CertStatus = Field(..., description="原始结果")
    replay_result: CertStatus = Field(..., description="回放结果")
    result_changed: bool = Field(..., description="结果是否变化")
    diff_rules: List[str] = Field(default_factory=list, description="差异规则列表")


class CertificationResponse(BaseModel):
    certification_id: str = Field(..., description="认证流水号")
    person_id: str = Field(..., description="参保人标识")
    application_id: str = Field(..., description="申请单号")
    status: CertStatus = Field(..., description="认证结果状态")
    risk_level: RiskLevel = Field(..., description="整体风险等级")
    score: Optional[float] = Field(None, description="认证得分（如有）")
    hit_rules: List[HitRule] = Field(default_factory=list, description="命中的风险规则")
    reasons: ReadableReason = Field(..., description="可读原因")
    audit_trace: AuditTrace = Field(..., description="追溯依据")
    task_status: str = Field(..., description="任务状态")
    anomaly_explanation: Optional[str] = Field(None, description="异常解释")
    calculation_method: str = Field(..., description="计算口径说明")


class BatchCertificationRequest(BaseModel):
    batch_id: str = Field(..., description="批次号")
    person_master: "PersonMasterData" = Field(..., description="主数据")
    application: "ApplicationRecord" = Field(..., description="申请记录")
    evidences: List["EvidenceMaterial"] = Field(default_factory=list, description="佐证材料列表")
    history_status: List["HistoryStatusRecord"] = Field(default_factory=list, description="历史状态记录")
    threshold_config: Optional["ThresholdConfig"] = Field(None, description="阈值配置（不传则使用默认）")
    operator: Optional[str] = Field(None, description="操作人")


class BatchCertificationResponse(BaseModel):
    batch_id: str = Field(..., description="批次号")
    total_count: int = Field(..., description="总笔数")
    pass_count: int = Field(..., description="通过数")
    block_count: int = Field(..., description="拦截数")
    review_count: int = Field(..., description="待复核数")
    results: List[CertificationResponse] = Field(..., description="明细结果")
    timestamp: datetime = Field(..., description="处理时间")


class ReplayRequest(BaseModel):
    trace_id: str = Field(..., description="要回放的追溯ID")
    override_config: Optional["ThresholdConfig"] = Field(None, description="覆盖的阈值配置")
    override_evidences: Optional[List["EvidenceMaterial"]] = Field(None, description="覆盖的佐证材料")


from .schema import PersonMasterData, ApplicationRecord, EvidenceMaterial, HistoryStatusRecord, ThresholdConfig
