import uuid
from typing import Dict, List, Optional, Set
from datetime import datetime
from app.domain import (
    CriticalValueReceipt,
    BatchInfo,
    ReceiptItem,
    SourceChannel,
    ReceiptStatus,
    RiskLevel,
)
from app.records import AuditLog, AuditLogEntry


def _gen_id() -> str:
    return str(uuid.uuid4())


class ReceiptRepository:
    def __init__(self, audit_log: AuditLog):
        self._receipts: Dict[str, CriticalValueReceipt] = {}
        self._batches: Dict[str, BatchInfo] = {}
        self._receipts_by_batch: Dict[str, List[str]] = {}
        self._audit_log = audit_log

    def create_receipt(
        self,
        batch_no: str,
        item: ReceiptItem,
        source_channel: SourceChannel,
    ) -> CriticalValueReceipt:
        receipt_id = _gen_id()
        receipt = CriticalValueReceipt(
            receipt_id=receipt_id,
            batch_no=batch_no,
            item=item,
            source_channel=source_channel,
        )
        self._receipts[receipt_id] = receipt
        if batch_no not in self._receipts_by_batch:
            self._receipts_by_batch[batch_no] = []
        self._receipts_by_batch[batch_no].append(receipt_id)
        return receipt

    def get_receipt(self, receipt_id: str) -> Optional[CriticalValueReceipt]:
        return self._receipts.get(receipt_id)

    def get_by_batch(self, batch_no: str) -> List[CriticalValueReceipt]:
        receipt_ids = self._receipts_by_batch.get(batch_no, [])
        return [self._receipts[rid] for rid in receipt_ids if rid in self._receipts]

    def get_existing_report_nos(self, batch_no: str) -> Set[str]:
        receipts = self.get_by_batch(batch_no)
        return {r.item.report_no for r in receipts}

    def get_existing_item_ids(self, batch_no: str) -> Set[str]:
        receipts = self.get_by_batch(batch_no)
        return {r.item.item_id for r in receipts}

    def update_receipt(self, receipt: CriticalValueReceipt, action, operator: str = "system",
                       from_status: Optional[ReceiptStatus] = None, review_opinion: Optional[str] = None,
                       remark: str = ""):
        if receipt.receipt_id not in self._receipts:
            raise ValueError(f"Receipt {receipt.receipt_id} not found")
        actual_from = from_status if from_status else receipt.status
        self._receipts[receipt.receipt_id] = receipt

        log_entry = AuditLogEntry(
            log_id=_gen_id(),
            receipt_id=receipt.receipt_id,
            batch_no=receipt.batch_no,
            item_id=receipt.item.item_id,
            report_no=receipt.item.report_no,
            from_status=actual_from,
            to_status=receipt.status,
            action=action,
            operator=operator,
            review_opinion=review_opinion,
            risk_tags=list(receipt.risk_tags),
            failure_reasons=list(receipt.failure_reasons),
            missing_materials=list(receipt.missing_materials),
            remark=remark,
        )
        self._audit_log.add_entry(log_entry)

    def get_or_create_batch(self, batch_no: str, source_channel: SourceChannel) -> BatchInfo:
        if batch_no not in self._batches:
            self._batches[batch_no] = BatchInfo(
                batch_no=batch_no,
                source_channel=source_channel,
            )
        return self._batches[batch_no]

    def get_batch(self, batch_no: str) -> Optional[BatchInfo]:
        return self._batches.get(batch_no)

    def list_receipts(self) -> List[CriticalValueReceipt]:
        return list(self._receipts.values())
