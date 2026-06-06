from __future__ import annotations
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.models.inventory import (
    InventoryCheckResponse,
    TraceRecord,
    ReviewRecord,
    DecisionType,
)


class InventoryStorage:
    def __init__(self):
        self._records: Dict[str, TraceRecord] = {}
        self._business_index: Dict[str, List[str]] = {}
        self._reviews: Dict[str, ReviewRecord] = {}

    def save_check_result(self, response: InventoryCheckResponse) -> None:
        record = TraceRecord(
            trace_id=response.trace_id,
            business_no=response.business_no,
            operator=response.operator,
            check_time=response.check_time,
            decision=response.decision,
            rule_version=response.rule_version,
            hit_details=response.hit_details,
        )
        self._records[response.trace_id] = record
        if response.business_no not in self._business_index:
            self._business_index[response.business_no] = []
        self._business_index[response.business_no].append(response.trace_id)

    def get_latest_by_business_no(self, business_no: str) -> Optional[TraceRecord]:
        trace_ids = self._business_index.get(business_no, [])
        if not trace_ids:
            return None
        latest_trace_id = trace_ids[-1]
        return self._records.get(latest_trace_id)

    def get_by_trace_id(self, trace_id: str) -> Optional[TraceRecord]:
        record = self._records.get(trace_id)
        if record and record.trace_id in self._reviews:
            record.review_record = self._reviews[record.trace_id]
        return record

    def list_by_business_no(self, business_no: str) -> List[TraceRecord]:
        trace_ids = self._business_index.get(business_no, [])
        results = []
        for tid in trace_ids:
            rec = self._records.get(tid)
            if rec:
                if rec.trace_id in self._reviews:
                    rec.review_record = self._reviews[rec.trace_id]
                results.append(rec)
        return results

    def save_review(self, review: ReviewRecord) -> None:
        self._reviews[review.trace_id] = review
        if review.trace_id in self._records:
            self._records[review.trace_id].review_record = review

    def is_duplicate_submission(self, business_no: str, rule_version: str) -> bool:
        latest = self.get_latest_by_business_no(business_no)
        if not latest:
            return False
        if latest.rule_version != rule_version:
            return False
        if latest.review_record:
            return False
        return True

    def get_original_trace_id(self, business_no: str) -> Optional[str]:
        latest = self.get_latest_by_business_no(business_no)
        return latest.trace_id if latest else None


storage = InventoryStorage()
