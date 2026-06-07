from typing import List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from app.domain import ReceiptStatus, ActionType


@dataclass
class AuditLogEntry:
    log_id: str
    receipt_id: str
    batch_no: str
    item_id: str
    report_no: str
    from_status: ReceiptStatus
    to_status: ReceiptStatus
    action: ActionType
    operator: str = "system"
    review_opinion: Optional[str] = None
    risk_tags: List[str] = field(default_factory=list)
    failure_reasons: List[str] = field(default_factory=list)
    missing_materials: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    remark: str = ""

    def to_dict(self) -> dict:
        return {
            "log_id": self.log_id,
            "receipt_id": self.receipt_id,
            "batch_no": self.batch_no,
            "item_id": self.item_id,
            "report_no": self.report_no,
            "from_status": self.from_status.value if isinstance(self.from_status, ReceiptStatus) else self.from_status,
            "to_status": self.to_status.value if isinstance(self.to_status, ReceiptStatus) else self.to_status,
            "action": self.action.value if isinstance(self.action, ActionType) else self.action,
            "operator": self.operator,
            "review_opinion": self.review_opinion,
            "risk_tags": self.risk_tags,
            "failure_reasons": self.failure_reasons,
            "missing_materials": self.missing_materials,
            "timestamp": self.timestamp.isoformat(),
            "remark": self.remark,
        }


class AuditLog:
    def __init__(self):
        self._entries: List[AuditLogEntry] = []

    def add_entry(self, entry: AuditLogEntry):
        self._entries.append(entry)

    def get_by_receipt_id(self, receipt_id: str) -> List[AuditLogEntry]:
        return [e for e in self._entries if e.receipt_id == receipt_id]

    def get_by_batch_no(self, batch_no: str) -> List[AuditLogEntry]:
        return [e for e in self._entries if e.batch_no == batch_no]

    def get_all(self) -> List[AuditLogEntry]:
        return list(self._entries)

    def count(self) -> int:
        return len(self._entries)
