from app.domain import CriticalValueReceipt, ReceiptStatus
from app.rules.engine import BaseRule, RuleResult


class MaterialCompletenessRule(BaseRule):
    name = "material_completeness"

    def apply(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        result = RuleResult()
        item = receipt.item

        required = set(item.required_materials)
        provided = set(item.provided_materials)

        missing = required - provided
        for mat in missing:
            result.add_missing_material(mat)

        if missing:
            result.target_status = ReceiptStatus.NEED_SUPPLEMENT
            result.add_failure(f"材料不齐全，缺少: {', '.join(missing)}")
            result.need_review = True

        return result
