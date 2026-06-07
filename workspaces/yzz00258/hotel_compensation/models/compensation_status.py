from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


class ObjectStatus(str, Enum):
    PENDING_PROCESS = "PENDING_PROCESS"
    PROCESSING = "PROCESSING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REVIEWING = "REVIEWING"
    COMPENSATED = "COMPENSATED"
    CLOSED = "CLOSED"


class StatusTransition:
    def __init__(self):
        self.transitions: Dict[str, List[str]] = {
            ObjectStatus.PENDING_PROCESS: [
                ObjectStatus.PROCESSING,
                ObjectStatus.REVIEWING,
                ObjectStatus.APPROVED,
                ObjectStatus.REJECTED
            ],
            ObjectStatus.PROCESSING: [
                ObjectStatus.APPROVED,
                ObjectStatus.REJECTED,
                ObjectStatus.REVIEWING
            ],
            ObjectStatus.REVIEWING: [
                ObjectStatus.APPROVED,
                ObjectStatus.REJECTED,
                ObjectStatus.PROCESSING
            ],
            ObjectStatus.APPROVED: [
                ObjectStatus.COMPENSATED,
                ObjectStatus.CLOSED
            ],
            ObjectStatus.REJECTED: [
                ObjectStatus.CLOSED,
                ObjectStatus.PENDING_PROCESS
            ],
            ObjectStatus.COMPENSATED: [
                ObjectStatus.CLOSED
            ],
            ObjectStatus.CLOSED: []
        }

    def can_transition(self, from_status: str, to_status: str) -> bool:
        if from_status not in self.transitions:
            return False
        return to_status in self.transitions[from_status]

    def get_next_statuses(self, current_status: str) -> List[str]:
        return self.transitions.get(current_status, [])

    def is_terminal(self, status: str) -> bool:
        return status in [ObjectStatus.CLOSED, ObjectStatus.COMPENSATED]


@dataclass
class StatusLog:
    audit_id: str
    from_status: str
    to_status: str
    operator: str
    reason: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "audit_id": self.audit_id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "operator": self.operator,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat()
        }
