from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from .compensation_rule import RiskLevel, Conclusion, NextAction
from .compensation_status import StatusLog


@dataclass
class CompensationResult:
    business_no: str
    conclusion: Conclusion
    risk_label: RiskLevel
    next_action: NextAction
    audit_id: str
    matched_rule_id: Optional[str] = None
    rule_version: Optional[str] = None
    review_required: bool = False
    review_reason: Optional[str] = None
    missing_materials: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    is_duplicate: bool = False
    error_message: Optional[str] = None
    success: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "business_no": self.business_no,
            "conclusion": self.conclusion.value if hasattr(self.conclusion, 'value') else self.conclusion,
            "risk_label": self.risk_label.value if hasattr(self.risk_label, 'value') else self.risk_label,
            "next_action": self.next_action.value if hasattr(self.next_action, 'value') else self.next_action,
            "audit_id": self.audit_id,
            "matched_rule_id": self.matched_rule_id,
            "rule_version": self.rule_version,
            "review_required": self.review_required,
            "review_reason": self.review_reason,
            "missing_materials": self.missing_materials,
            "timestamp": self.timestamp.isoformat(),
            "is_duplicate": self.is_duplicate,
            "error_message": self.error_message,
            "success": self.success
        }


@dataclass
class CompensationRecord:
    business_no: str
    results: List[CompensationResult] = field(default_factory=list)
    status_logs: List[StatusLog] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    current_status: str = "PENDING_PROCESS"

    def add_result(self, result: CompensationResult) -> None:
        self.results.append(result)
        self.updated_at = datetime.now()

    def add_status_log(self, log: StatusLog) -> None:
        self.status_logs.append(log)
        self.current_status = log.to_status
        self.updated_at = datetime.now()

    def latest_result(self) -> Optional[CompensationResult]:
        if not self.results:
            return None
        return self.results[-1]

    def is_duplicate_submission(self, rule_version: str) -> bool:
        for result in self.results:
            if not result.is_duplicate and result.success and result.rule_version == rule_version:
                return True
        return False

    def requires_review(self) -> bool:
        latest = self.latest_result()
        return latest.review_required if latest else False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "business_no": self.business_no,
            "current_status": self.current_status,
            "results": [r.to_dict() for r in self.results],
            "status_logs": [s.to_dict() for s in self.status_logs],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
