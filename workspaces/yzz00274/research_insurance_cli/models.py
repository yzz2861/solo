"""数据模型"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any

from .config import RecordStatus, RiskLevel, STATUS_CN, RISK_CN


@dataclass
class ValidationIssue:
    code: str
    message: str
    severity: str = "error"


@dataclass
class InsuranceRecord:
    source_file: str
    source_row: int
    raw_data: Dict[str, Any]
    mapped_data: Dict[str, Any]
    status: RecordStatus = RecordStatus.NORMAL
    issues: List[ValidationIssue] = field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.UNDETERMINED
    risk_reasons: List[str] = field(default_factory=list)
    batch_id: str = ""
    reviewed: bool = False
    review_notes: str = ""

    @property
    def status_cn(self) -> str:
        return STATUS_CN.get(self.status, self.status.value)

    @property
    def risk_level_cn(self) -> str:
        return RISK_CN.get(self.risk_level, self.risk_level.value)

    @property
    def issue_summary(self) -> str:
        return "; ".join(issue.message for issue in self.issues)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "批次号": self.batch_id,
            "来源文件": self.source_file,
            "来源行号": self.source_row,
            "处理状态": self.status_cn,
            "风险等级": self.risk_level_cn,
            "风险原因": "; ".join(self.risk_reasons),
            "异常原因": self.issue_summary,
            "是否已复核": "是" if self.reviewed else "否",
            "复核备注": self.review_notes,
            **self.mapped_data,
            **{f"原始_{k}": v for k, v in self.raw_data.items()},
        }

    def to_compact_dict(self) -> Dict[str, Any]:
        return {
            "批次号": self.batch_id,
            "来源文件": self.source_file,
            "来源行号": self.source_row,
            "处理状态": self.status_cn,
            "风险等级": self.risk_level_cn,
            "风险原因": "; ".join(self.risk_reasons),
            "异常原因": self.issue_summary,
            **self.mapped_data,
        }


@dataclass
class ProcessResult:
    batch_id: str
    processed_at: datetime
    total_count: int = 0
    normal_count: int = 0
    abnormal_count: int = 0
    pending_count: int = 0
    records: List[InsuranceRecord] = field(default_factory=list)
    source_files: List[str] = field(default_factory=list)

    @property
    def normal_records(self) -> List[InsuranceRecord]:
        return [r for r in self.records if r.status == RecordStatus.NORMAL]

    @property
    def abnormal_records(self) -> List[InsuranceRecord]:
        return [r for r in self.records if r.status == RecordStatus.ABNORMAL]

    @property
    def pending_records(self) -> List[InsuranceRecord]:
        return [r for r in self.records if r.status == RecordStatus.PENDING_REVIEW]

    def summary(self) -> Dict[str, Any]:
        return {
            "批次号": self.batch_id,
            "处理时间": self.processed_at.strftime("%Y-%m-%d %H:%M:%S"),
            "来源文件": self.source_files,
            "总记录数": self.total_count,
            "正常记录数": self.normal_count,
            "异常记录数": self.abnormal_count,
            "待复核记录数": self.pending_count,
        }
