from app.domain import CriticalValueReceipt, ReceiptStatus
from app.rules.engine import BaseRule, RuleResult


class DuplicateSubmissionRule(BaseRule):
    name = "duplicate_submission"

    def apply(self, receipt: CriticalValueReceipt, context: dict = None) -> RuleResult:
        result = RuleResult()

        if context is None:
            return result

        existing_report_nos = context.get("existing_report_nos", set())
        existing_item_ids = context.get("existing_item_ids", set())

        if receipt.item.item_id in existing_item_ids:
            result.add_failure(f"明细项重复提交: {receipt.item.item_id}")
            result.target_status = ReceiptStatus.FAILED
            return result

        if receipt.item.report_no in existing_report_nos:
            result.add_failure(f"报告重复提交: {receipt.item.report_no}")
            result.target_status = ReceiptStatus.FAILED
            return result

        return result
