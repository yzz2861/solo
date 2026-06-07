from typing import Optional, Tuple
from datetime import datetime
import uuid

from ..models import (
    CompensationResult,
    CompensationRecord,
    CompensationObject,
    Conclusion,
    NextAction,
    RiskLevel,
    StatusLog,
    ObjectStatus,
    StatusTransition
)


class ReviewEngine:
    def __init__(self):
        self.status_transition = StatusTransition()

    def needs_review(self, result: CompensationResult) -> bool:
        if not result.success:
            return False
        if result.review_required:
            return True
        if result.risk_label == RiskLevel.HIGH:
            return True
        if result.missing_materials:
            return True
        return False

    def can_auto_approve(self, result: CompensationResult) -> bool:
        if not result.success:
            return False
        if result.review_required:
            return False
        if result.risk_label == RiskLevel.HIGH:
            return False
        if result.missing_materials:
            return False
        if result.conclusion != Conclusion.APPROVE:
            return False
        return True

    def review(self,
               business_no: str,
               audit_id: str,
               reviewer: str,
               approve: bool,
               review_comment: str = "") -> Tuple[bool, str]:
        if not business_no:
            return False, "业务编号不能为空"
        if not audit_id:
            return False, "审计编号不能为空"
        if not reviewer:
            return False, "复核人不能为空"

        return True, "复核操作成功"

    def create_review_result(self,
                             original_result: CompensationResult,
                             reviewer: str,
                             approve: bool,
                             review_comment: str = "") -> CompensationResult:
        if approve:
            conclusion = Conclusion.APPROVE
            next_action = NextAction.AUTO_COMPENSATE
            risk_label = original_result.risk_label
        else:
            conclusion = Conclusion.REJECT
            next_action = NextAction.REJECT_AND_NOTIFY
            risk_label = RiskLevel.LOW

        return CompensationResult(
            business_no=original_result.business_no,
            conclusion=conclusion,
            risk_label=risk_label,
            next_action=next_action,
            audit_id=str(uuid.uuid4()),
            matched_rule_id=original_result.matched_rule_id,
            rule_version=original_result.rule_version,
            review_required=False,
            review_reason=f"复核完成-{'通过' if approve else '拒绝'}：{review_comment}",
            missing_materials=[],
            success=True
        )

    def update_record_status(self,
                             record: CompensationRecord,
                             from_status: str,
                             to_status: str,
                             operator: str,
                             reason: str = "") -> bool:
        if not self.status_transition.can_transition(from_status, to_status):
            return False

        log = StatusLog(
            audit_id=str(uuid.uuid4()),
            from_status=from_status,
            to_status=to_status,
            operator=operator,
            reason=reason
        )
        record.add_status_log(log)
        return True
