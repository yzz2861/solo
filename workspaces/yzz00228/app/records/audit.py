from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
from ..models.enums import AuthStatus, ActionType, RiskLevel


@dataclass
class AuditRecord:
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
    reasons: List[str] = field(default_factory=list)
    triggered_rules: List[str] = field(default_factory=list)
    review_opinion: Optional[str] = None
    review_by: Optional[str] = None
    extra_data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if isinstance(self.action, str):
            self.action = ActionType(self.action)
        if isinstance(self.from_status, str):
            self.from_status = AuthStatus(self.from_status)
        if isinstance(self.to_status, str):
            self.to_status = AuthStatus(self.to_status)
        if isinstance(self.risk_level_before, str):
            self.risk_level_before = RiskLevel(self.risk_level_before)
        if isinstance(self.risk_level_after, str):
            self.risk_level_after = RiskLevel(self.risk_level_after)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "batch_no": self.batch_no,
            "item_no": self.item_no,
            "action": self.action.value if self.action else None,
            "from_status": self.from_status.value if self.from_status else None,
            "to_status": self.to_status.value if self.to_status else None,
            "operator": self.operator,
            "risk_level_before": self.risk_level_before.value if self.risk_level_before else None,
            "risk_level_after": self.risk_level_after.value if self.risk_level_after else None,
            "risk_score_before": self.risk_score_before,
            "risk_score_after": self.risk_score_after,
            "reasons": self.reasons,
            "triggered_rules": self.triggered_rules,
            "review_opinion": self.review_opinion,
            "review_by": self.review_by,
            "extra_data": self.extra_data,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class AuditLogger:
    def __init__(self):
        self._records: List[AuditRecord] = []

    def log(self, record: AuditRecord) -> None:
        self._records.append(record)

    def get_all_records(self) -> List[AuditRecord]:
        return list(self._records)

    def get_records_by_batch(self, batch_no: str) -> List[AuditRecord]:
        return [r for r in self._records if r.batch_no == batch_no]

    def get_records_by_item(self, batch_no: str, item_no: str) -> List[AuditRecord]:
        return [
            r for r in self._records
            if r.batch_no == batch_no and r.item_no == item_no
        ]

    def get_record_by_trace_id(self, trace_id: str) -> Optional[AuditRecord]:
        for record in self._records:
            if record.trace_id == trace_id:
                return record
        return None

    def clear(self) -> None:
        self._records.clear()

    def count(self) -> int:
        return len(self._records)
