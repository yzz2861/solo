from typing import Optional, Tuple
import uuid

from ..models import (
    CompensationObject,
    CompensationRule,
    RuleSet,
    CompensationResult,
    RiskLevel,
    Conclusion,
    NextAction
)


class RuleEngine:
    def __init__(self, rule_set: RuleSet):
        self.rule_set = rule_set

    def match_rule(self, obj: CompensationObject) -> Optional[CompensationRule]:
        return self.rule_set.find_matching_rule(obj)

    def execute(self, obj: CompensationObject) -> CompensationResult:
        audit_id = str(uuid.uuid4())
        is_valid, errors = obj.validate()

        if not is_valid:
            return CompensationResult(
                business_no=obj.business_no,
                conclusion=Conclusion.REJECT,
                risk_label=RiskLevel.HIGH,
                next_action=NextAction.REJECT_AND_NOTIFY,
                audit_id=audit_id,
                rule_version=obj.rule_version,
                review_required=False,
                error_message="; ".join(errors),
                success=False
            )

        rule = self.match_rule(obj)

        if rule is None:
            return CompensationResult(
                business_no=obj.business_no,
                conclusion=Conclusion.REVIEW,
                risk_label=RiskLevel.MEDIUM,
                next_action=NextAction.MANUAL_REVIEW,
                audit_id=audit_id,
                rule_version=obj.rule_version,
                review_required=True,
                review_reason="未匹配到适用规则，需人工复核",
                success=True
            )

        missing_materials = []
        if rule.requires_materials:
            for mat in rule.requires_materials:
                if not obj.materials.get(mat, False):
                    missing_materials.append(mat)

        review_required = False
        review_reason = None
        conclusion = rule.conclusion
        next_action = rule.next_action

        if rule.risk_level == RiskLevel.HIGH:
            review_required = True
            review_reason = "高风险补偿，需人工复核"
            conclusion = Conclusion.REVIEW
            next_action = NextAction.MANUAL_REVIEW

        if missing_materials:
            review_required = True
            if review_reason:
                review_reason += f"；缺少材料：{', '.join(missing_materials)}"
            else:
                review_reason = f"缺少材料：{', '.join(missing_materials)}"
            conclusion = Conclusion.REVIEW
            next_action = NextAction.SUPPLEMENT_MATERIALS

        return CompensationResult(
            business_no=obj.business_no,
            conclusion=conclusion,
            risk_label=rule.risk_level,
            next_action=next_action,
            audit_id=audit_id,
            matched_rule_id=rule.rule_id,
            rule_version=rule.version,
            review_required=review_required,
            review_reason=review_reason,
            missing_materials=missing_materials,
            success=True
        )
