from typing import Dict, List, Optional, Callable
from .models import (
    BoxState, BoxInventory, BorrowRecord, ReturnRecord,
    BoxStatus, ReviewResult
)


class DataStore:
    def __init__(self):
        self._boxes: Dict[str, BoxState] = {}
        self._imported_sources: set = set()
        self._borrow_record_ids: set = set()
        self._return_record_ids: set = set()
        self._listeners: List[Callable] = []

    def subscribe(self, callback: Callable):
        self._listeners.append(callback)

    def _notify(self):
        for cb in self._listeners:
            cb()

    @property
    def all_boxes(self) -> List[BoxState]:
        return sorted(self._boxes.values(), key=lambda b: b.box_id)

    def get_box(self, box_id: str) -> Optional[BoxState]:
        return self._boxes.get(box_id)

    def _get_or_create(self, box_id: str) -> BoxState:
        if box_id not in self._boxes:
            self._boxes[box_id] = BoxState(box_id=box_id)
        return self._boxes[box_id]

    def is_source_imported(self, source_key: str) -> bool:
        return source_key in self._imported_sources

    def mark_source_imported(self, source_key: str):
        self._imported_sources.add(source_key)

    def add_inventory(self, inv: BoxInventory, source_key: str = "") -> bool:
        if source_key and source_key in self._imported_sources:
            return False
        box = self._get_or_create(inv.box_id)
        box.inventory = inv
        if source_key:
            box.import_sources.add(source_key)
        self._notify()
        return True

    def add_borrow(self, record: BorrowRecord, source_key: str = "") -> bool:
        if record.record_id in self._borrow_record_ids:
            return False
        if source_key and source_key in self._imported_sources:
            return False
        box = self._get_or_create(record.box_id)
        box.borrow = record
        box.status = BoxStatus.BORROWED
        if source_key:
            box.import_sources.add(source_key)
        self._borrow_record_ids.add(record.record_id)
        self._notify()
        return True

    def add_return(self, record: ReturnRecord, source_key: str = "") -> bool:
        if record.record_id in self._return_record_ids:
            return False
        if source_key and source_key in self._imported_sources:
            return False
        box = self._get_or_create(record.box_id)
        box.return_record = record
        if box.status in (BoxStatus.BORROWED,):
            box.status = BoxStatus.RETURNED
        elif box.status == BoxStatus.REGISTERED:
            box.status = BoxStatus.RETURNED
        if source_key:
            box.import_sources.add(source_key)
        self._return_record_ids.add(record.record_id)
        self._notify()
        return True

    def set_review(self, box_id: str, result: ReviewResult, comment: str = "", reviewer: str = ""):
        box = self._get_or_create(box_id)
        box.review_result = result
        box.review_comment = comment
        box.reviewer = reviewer
        from datetime import datetime
        box.review_time = datetime.now()
        if result == ReviewResult.ISOLATED:
            box.status = BoxStatus.ISOLATED
        elif result in (ReviewResult.NORMAL, ReviewResult.ABNORMAL):
            if box.status != BoxStatus.ISOLATED:
                box.status = BoxStatus.REVIEWED
        self._notify()

    def filter_boxes(
        self,
        status: Optional[BoxStatus] = None,
        overtemp_only: bool = False,
        returner_mismatch_only: bool = False,
        batch_missing_only: bool = False,
        has_issues_only: bool = False,
        keyword: str = "",
    ) -> List[BoxState]:
        result = self.all_boxes
        if status:
            result = [b for b in result if b.status == status]
        if overtemp_only:
            result = [b for b in result if b.has_overtemp]
        if returner_mismatch_only:
            result = [b for b in result if b.returner_mismatch]
        if batch_missing_only:
            result = [b for b in result if b.batch_missing]
        if has_issues_only:
            result = [b for b in result if b.has_issues]
        if keyword:
            kw = keyword.lower()
            result = [
                b for b in result
                if kw in b.box_id.lower()
                or (b.borrow and kw in b.borrow.borrower.lower())
                or (b.borrow and kw in b.borrow.drug_batch.lower())
                or (b.borrow and kw in b.borrow.drug_name.lower())
                or (b.return_record and kw in b.return_record.returner.lower())
            ]
        return result

    def stats(self) -> dict:
        boxes = self.all_boxes
        return {
            "total": len(boxes),
            "borrowed": sum(1 for b in boxes if b.status == BoxStatus.BORROWED),
            "returned": sum(1 for b in boxes if b.status == BoxStatus.RETURNED),
            "reviewed": sum(1 for b in boxes if b.status == BoxStatus.REVIEWED),
            "isolated": sum(1 for b in boxes if b.status == BoxStatus.ISOLATED),
            "overtemp": sum(1 for b in boxes if b.has_overtemp),
            "returner_mismatch": sum(1 for b in boxes if b.returner_mismatch),
            "batch_missing": sum(1 for b in boxes if b.batch_missing),
            "issues": sum(1 for b in boxes if b.has_issues),
        }
