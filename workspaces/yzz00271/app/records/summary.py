from typing import Dict, List
from app.domain import (
    CriticalValueReceipt,
    BatchInfo,
    ReceiptStatus,
    RiskLevel,
)
from app.records import ReceiptRepository


class BatchSummaryService:
    def __init__(self, repository: ReceiptRepository):
        self._repo = repository

    def calculate_summary(self, batch_no: str) -> Dict[str, int]:
        receipts = self._repo.get_by_batch(batch_no)
        return self._count_statuses(receipts)

    def _count_statuses(self, receipts: List[CriticalValueReceipt]) -> Dict[str, int]:
        summary = {
            "total": len(receipts),
            "processable": 0,
            "need_supplement": 0,
            "locked": 0,
            "failed": 0,
            "approved": 0,
            "rejected": 0,
            "high_risk": 0,
            "need_review": 0,
        }

        for r in receipts:
            status = r.status
            if isinstance(status, ReceiptStatus):
                status = status.value
            if status in summary:
                summary[status] += 1

            if r.item.risk_level == RiskLevel.HIGH:
                summary["high_risk"] += 1
            if r.need_review:
                summary["need_review"] += 1

        return summary

    def update_batch_info(self, batch_no: str) -> BatchInfo:
        batch = self._repo.get_batch(batch_no)
        if not batch:
            raise ValueError(f"Batch {batch_no} not found")

        receipts = self._repo.get_by_batch(batch_no)
        summary = self._count_statuses(receipts)

        batch.total_count = summary["total"]
        batch.processable_count = summary["processable"]
        batch.need_supplement_count = summary["need_supplement"]
        batch.locked_count = summary["locked"]
        batch.failed_count = summary["failed"]
        batch.approved_count = summary["approved"]
        batch.rejected_count = summary["rejected"]
        batch.high_risk_count = summary["high_risk"]

        return batch
