from typing import List, Dict, Optional, Tuple
from datetime import datetime
from app.domain import (
    CriticalValueReceipt,
    ReceiptItem,
    BatchInfo,
    SourceChannel,
    ActionType,
    ReceiptStatus,
    ReceiptResult,
    BatchReceiptResponse,
)
from app.rules import (
    RuleEngine,
    RiskAssessmentRule,
    MaterialCompletenessRule,
    ReviewTriggerRule,
    DuplicateSubmissionRule,
)
from app.states import ReceiptStateMachine
from app.records import ReceiptRepository, AuditLog, BatchSummaryService


class ReceiptService:
    def __init__(self):
        self.audit_log = AuditLog()
        self.repository = ReceiptRepository(self.audit_log)
        self.state_machine = ReceiptStateMachine()
        self.summary_service = BatchSummaryService(self.repository)

        self.rule_engine = RuleEngine()
        self.rule_engine.register_all([
            DuplicateSubmissionRule(),
            RiskAssessmentRule(),
            MaterialCompletenessRule(),
            ReviewTriggerRule(),
        ])

    def submit_batch(
        self,
        batch_no: str,
        source_channel: SourceChannel,
        items: List[ReceiptItem],
        action: ActionType = ActionType.SUBMIT,
    ) -> BatchReceiptResponse:
        self.repository.get_or_create_batch(batch_no, source_channel)

        existing_report_nos = self.repository.get_existing_report_nos(batch_no)
        existing_item_ids = self.repository.get_existing_item_ids(batch_no)

        results: List[ReceiptResult] = []

        for item in items:
            receipt = self.repository.create_receipt(batch_no, item, source_channel)
            from_status = receipt.status

            context = {
                "existing_report_nos": existing_report_nos,
                "existing_item_ids": existing_item_ids,
            }

            rule_result = self.rule_engine.execute(receipt, context)
            receipt = self.state_machine.apply_rule_result(receipt, rule_result)

            remark_parts = []
            if rule_result.risk_tags:
                remark_parts.append(f"风险标签: {', '.join(rule_result.risk_tags)}")
            if rule_result.missing_materials:
                remark_parts.append(f"缺失材料: {', '.join(rule_result.missing_materials)}")
            if rule_result.failure_reasons:
                remark_parts.append(f"失败原因: {'; '.join(rule_result.failure_reasons)}")

            self.repository.update_receipt(
                receipt=receipt,
                action=action,
                operator="system",
                from_status=from_status,
                remark="; ".join(remark_parts),
            )

            existing_report_nos.add(item.report_no)
            existing_item_ids.add(item.item_id)

            results.append(ReceiptResult(
                receipt_id=receipt.receipt_id,
                item_id=item.item_id,
                report_no=item.report_no,
                status=receipt.status,
                risk_tags=list(receipt.risk_tags),
                failure_reasons=list(receipt.failure_reasons),
                missing_materials=list(receipt.missing_materials),
                need_review=receipt.need_review,
                review_opinion=receipt.review_opinion,
            ))

        batch_info = self.summary_service.update_batch_info(batch_no)
        summary = self.summary_service.calculate_summary(batch_no)

        return BatchReceiptResponse(
            batch_no=batch_no,
            total_count=len(items),
            results=results,
            summary=summary,
        )

    def review_receipts(
        self,
        batch_no: str,
        receipt_ids: List[str],
        action: ActionType,
        review_opinion: str,
        review_user: str,
    ) -> Dict:
        if action not in (ActionType.APPROVE, ActionType.REJECT):
            raise ValueError("复核动作只能是 approve 或 reject")

        results: List[dict] = []

        for receipt_id in receipt_ids:
            receipt = self.repository.get_receipt(receipt_id)
            if not receipt:
                results.append({
                    "receipt_id": receipt_id,
                    "success": False,
                    "error": "回执不存在",
                })
                continue

            if receipt.batch_no != batch_no:
                results.append({
                    "receipt_id": receipt_id,
                    "success": False,
                    "error": "批次号不匹配",
                })
                continue

            from_status = receipt.status
            try:
                receipt = self.state_machine.transition(
                    receipt=receipt,
                    action=action,
                    review_opinion=review_opinion,
                    review_user=review_user,
                )

                self.repository.update_receipt(
                    receipt=receipt,
                    action=action,
                    operator=review_user,
                    from_status=from_status,
                    review_opinion=review_opinion,
                    remark=f"人工复核: {'通过' if action == ActionType.APPROVE else '驳回'}",
                )

                results.append({
                    "receipt_id": receipt_id,
                    "success": True,
                    "status": receipt.status.value,
                    "review_opinion": review_opinion,
                    "review_user": review_user,
                })
            except Exception as e:
                results.append({
                    "receipt_id": receipt_id,
                    "success": False,
                    "error": str(e),
                })

        batch_info = self.summary_service.update_batch_info(batch_no)
        summary = self.summary_service.calculate_summary(batch_no)

        return {
            "batch_no": batch_no,
            "results": results,
            "summary": summary,
        }

    def get_batch(self, batch_no: str) -> Optional[Dict]:
        batch = self.repository.get_batch(batch_no)
        if not batch:
            return None

        receipts = self.repository.get_by_batch(batch_no)
        summary = self.summary_service.calculate_summary(batch_no)
        logs = self.audit_log.get_by_batch_no(batch_no)

        return {
            "batch_info": batch.model_dump(),
            "summary": summary,
            "receipts": [r.model_dump() for r in receipts],
            "audit_logs": [log.to_dict() for log in logs],
            "logs_count": len(logs),
        }

    def get_receipt(self, receipt_id: str) -> Optional[Dict]:
        receipt = self.repository.get_receipt(receipt_id)
        if not receipt:
            return None

        logs = self.audit_log.get_by_receipt_id(receipt_id)

        return {
            "receipt": receipt.model_dump(),
            "audit_logs": [log.to_dict() for log in logs],
        }

    def get_audit_logs(self, batch_no: str = None, receipt_id: str = None) -> List[dict]:
        if receipt_id:
            logs = self.audit_log.get_by_receipt_id(receipt_id)
        elif batch_no:
            logs = self.audit_log.get_by_batch_no(batch_no)
        else:
            logs = self.audit_log.get_all()

        return [log.to_dict() for log in logs]
