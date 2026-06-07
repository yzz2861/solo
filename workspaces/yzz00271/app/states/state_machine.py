from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
from app.domain import ReceiptStatus, ActionType, CriticalValueReceipt, RiskLevel
from app.rules import RuleResult


STATUS_PRIORITY = {
    ReceiptStatus.FAILED: 100,
    ReceiptStatus.LOCKED: 90,
    ReceiptStatus.NEED_SUPPLEMENT: 80,
    ReceiptStatus.REJECTED: 70,
    ReceiptStatus.APPROVED: 60,
    ReceiptStatus.PROCESSABLE: 10,
}


def _status_priority(status: Optional[ReceiptStatus]) -> int:
    if status is None:
        return 0
    return STATUS_PRIORITY.get(status, 0)


def _set_status_if_higher(receipt: CriticalValueReceipt, new_status: ReceiptStatus):
    if _status_priority(new_status) > _status_priority(receipt.status):
        receipt.status = new_status


class InvalidStateTransitionError(Exception):
    def __init__(self, from_status: ReceiptStatus, action: ActionType, message: str = ""):
        self.from_status = from_status
        self.action = action
        super().__init__(f"Invalid transition: {from_status} -> {action}. {message}".strip())


@dataclass
class StateTransition:
    from_status: ReceiptStatus
    action: ActionType
    to_status: ReceiptStatus
    description: str


ALLOWED_TRANSITIONS: List[StateTransition] = [
    StateTransition(ReceiptStatus.PROCESSABLE, ActionType.SUBMIT, ReceiptStatus.PROCESSABLE, "提交后保持可办理"),
    StateTransition(ReceiptStatus.PROCESSABLE, ActionType.LOCK, ReceiptStatus.LOCKED, "高风险锁定"),
    StateTransition(ReceiptStatus.PROCESSABLE, ActionType.SUPPLEMENT, ReceiptStatus.NEED_SUPPLEMENT, "需补充材料"),
    StateTransition(ReceiptStatus.PROCESSABLE, ActionType.APPROVE, ReceiptStatus.APPROVED, "审核通过"),
    StateTransition(ReceiptStatus.PROCESSABLE, ActionType.REJECT, ReceiptStatus.REJECTED, "审核驳回"),

    StateTransition(ReceiptStatus.NEED_SUPPLEMENT, ActionType.SUPPLEMENT, ReceiptStatus.NEED_SUPPLEMENT, "补充材料后仍缺"),
    StateTransition(ReceiptStatus.NEED_SUPPLEMENT, ActionType.APPROVE, ReceiptStatus.APPROVED, "补充后复核通过"),
    StateTransition(ReceiptStatus.NEED_SUPPLEMENT, ActionType.REJECT, ReceiptStatus.REJECTED, "补充后复核驳回"),
    StateTransition(ReceiptStatus.NEED_SUPPLEMENT, ActionType.LOCK, ReceiptStatus.LOCKED, "补充后发现高风险锁定"),

    StateTransition(ReceiptStatus.LOCKED, ActionType.UNLOCK, ReceiptStatus.PROCESSABLE, "解锁回可办理"),
    StateTransition(ReceiptStatus.LOCKED, ActionType.APPROVE, ReceiptStatus.APPROVED, "复核通过"),
    StateTransition(ReceiptStatus.LOCKED, ActionType.REJECT, ReceiptStatus.REJECTED, "复核驳回"),

    StateTransition(ReceiptStatus.FAILED, ActionType.SUBMIT, ReceiptStatus.FAILED, "失败后不可恢复"),
]


class ReceiptStateMachine:
    def __init__(self):
        self._transitions: Dict[tuple, StateTransition] = {}
        for t in ALLOWED_TRANSITIONS:
            self._transitions[(t.from_status, t.action)] = t

    def can_transition(self, from_status: ReceiptStatus, action: ActionType) -> bool:
        return (from_status, action) in self._transitions

    def get_transition(self, from_status: ReceiptStatus, action: ActionType) -> Optional[StateTransition]:
        return self._transitions.get((from_status, action))

    def apply_rule_result(self, receipt: CriticalValueReceipt, rule_result: RuleResult) -> CriticalValueReceipt:
        receipt.risk_tags = list(set(receipt.risk_tags + rule_result.risk_tags))
        receipt.missing_materials = list(set(receipt.missing_materials + rule_result.missing_materials))
        receipt.failure_reasons = list(set(receipt.failure_reasons + rule_result.failure_reasons))
        receipt.need_review = receipt.need_review or rule_result.need_review

        if rule_result.target_status:
            _set_status_if_higher(receipt, rule_result.target_status)

        if not rule_result.passed:
            if rule_result.missing_materials:
                _set_status_if_higher(receipt, ReceiptStatus.NEED_SUPPLEMENT)
            if rule_result.failure_reasons and not rule_result.missing_materials:
                _set_status_if_higher(receipt, ReceiptStatus.FAILED)

        if receipt.need_review:
            if receipt.item.risk_level == RiskLevel.HIGH:
                _set_status_if_higher(receipt, ReceiptStatus.LOCKED)
            elif rule_result.missing_materials:
                _set_status_if_higher(receipt, ReceiptStatus.NEED_SUPPLEMENT)

        receipt.updated_at = datetime.now()
        return receipt

    def transition(
        self,
        receipt: CriticalValueReceipt,
        action: ActionType,
        review_opinion: Optional[str] = None,
        review_user: Optional[str] = None,
    ) -> CriticalValueReceipt:
        if action == ActionType.APPROVE and receipt.need_review and receipt.status == ReceiptStatus.LOCKED:
            pass
        elif action == ActionType.APPROVE and receipt.need_review and receipt.status == ReceiptStatus.PROCESSABLE:
            raise InvalidStateTransitionError(
                receipt.status, action, "高风险或缺材料需人工复核，不允许直接通过"
            )

        transition = self.get_transition(receipt.status, action)
        if not transition:
            raise InvalidStateTransitionError(
                receipt.status, action, "不允许的状态迁移"
            )

        receipt.status = transition.to_status

        if action in (ActionType.APPROVE, ActionType.REJECT):
            receipt.review_opinion = review_opinion
            receipt.review_user = review_user
            receipt.review_time = datetime.now()
            if action == ActionType.APPROVE:
                receipt.need_review = False

        receipt.updated_at = datetime.now()
        return receipt
