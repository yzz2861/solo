from typing import Dict, List, Set
from dataclasses import dataclass, field

from app.models import InspectionStatus, HistoricalStatus


class StateTransitionError(Exception):
    pass


STATE_TRANSITIONS: Dict[InspectionStatus, Set[InspectionStatus]] = {
    InspectionStatus.DRAFT: {
        InspectionStatus.SUBMITTED,
    },
    InspectionStatus.SUBMITTED: {
        InspectionStatus.AUTO_INSPECTION,
    },
    InspectionStatus.AUTO_INSPECTION: {
        InspectionStatus.PENDING_REVIEW,
        InspectionStatus.COMPLETED,
    },
    InspectionStatus.PENDING_REVIEW: {
        InspectionStatus.REVIEW_PASSED,
        InspectionStatus.REVIEW_REJECTED,
    },
    InspectionStatus.REVIEW_PASSED: {
        InspectionStatus.COMPLETED,
    },
    InspectionStatus.REVIEW_REJECTED: {
        InspectionStatus.SUBMITTED,
        InspectionStatus.COMPLETED,
    },
    InspectionStatus.COMPLETED: set(),
}


def get_allowed_transitions(current_status: InspectionStatus) -> List[InspectionStatus]:
    return list(STATE_TRANSITIONS.get(current_status, set()))


def can_transition(from_status: InspectionStatus, to_status: InspectionStatus) -> bool:
    allowed = STATE_TRANSITIONS.get(from_status, set())
    return to_status in allowed


@dataclass
class InspectionStateMachine:
    current_status: InspectionStatus = InspectionStatus.DRAFT
    history: List[HistoricalStatus] = field(default_factory=list)

    def transition_to(
        self,
        target_status: InspectionStatus,
        operator: str,
        remark: str = "",
        blade_id: str = "",
    ) -> HistoricalStatus:
        if not can_transition(self.current_status, target_status):
            raise StateTransitionError(
                f"不允许从 {self.current_status.value} 状态转换到 {target_status.value} 状态"
            )

        import uuid
        from datetime import datetime

        record = HistoricalStatus(
            record_id=f"HIS-{uuid.uuid4().hex[:10].upper()}",
            blade_id=blade_id,
            status=target_status,
            status_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            operator=operator,
            remark=remark,
        )

        self.current_status = target_status
        self.history.append(record)
        return record

    def is_in_review(self) -> bool:
        return self.current_status == InspectionStatus.PENDING_REVIEW

    def is_completed(self) -> bool:
        return self.current_status == InspectionStatus.COMPLETED

    def can_enter_review(self) -> bool:
        return self.current_status == InspectionStatus.AUTO_INSPECTION

    def can_pass_directly(self) -> bool:
        return self.current_status in (
            InspectionStatus.AUTO_INSPECTION,
            InspectionStatus.REVIEW_PASSED,
        )

    def get_review_entry_point(self) -> Dict:
        return {
            "entry_status": InspectionStatus.PENDING_REVIEW.value,
            "allowed_from": [InspectionStatus.AUTO_INSPECTION.value],
            "review_actions": [
                "review_pass",
                "review_reject",
                "supplement_material",
            ],
            "description": "自动巡检判定需人工复核时进入此状态",
        }
