from app.domain import CriticalValueReceipt, ReceiptStatus, RiskLevel
from app.rules.engine import BaseRule, RuleResult


class ReviewTriggerRule(BaseRule):
    name = "review_trigger"

    def apply(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        result = RuleResult()
        item = receipt.item

        if item.risk_level == RiskLevel.HIGH:
            result.need_review = True
            result.target_status = ReceiptStatus.LOCKED
            return result

        required = set(item.required_materials)
        provided = set(item.provided_materials)
        missing = required - provided

        if missing:
            result.need_review = True
            if not result.target_status:
                result.target_status = ReceiptStatus.NEED_SUPPLEMENT

        return result
