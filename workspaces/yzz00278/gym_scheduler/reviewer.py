import os
from typing import List, Dict, Optional

from .models import ScheduleRecord, RecordStatus
from .generator import ScheduleStore


class ReviewManager:
    def __init__(self, store: ScheduleStore):
        self.store = store

    def get_pending_review(self) -> List[ScheduleRecord]:
        all_records = self.store.load_all()
        return [r for r in all_records.values() if r.status == RecordStatus.REVIEW]

    def get_invalid_records(self) -> List[ScheduleRecord]:
        all_records = self.store.load_all()
        return [r for r in all_records.values() if r.status == RecordStatus.INVALID]

    def approve_review(self, record_id: str, comment: str = "") -> Optional[ScheduleRecord]:
        records = self.store.load_all()
        record = records.get(record_id)
        if not record:
            return None
        if record.status != RecordStatus.REVIEW:
            return None
        record.status = RecordStatus.VALID
        record.review_comment = comment
        records[record_id] = record
        self.store.save_all(records)
        return record

    def reject_review(self, record_id: str, comment: str = "") -> Optional[ScheduleRecord]:
        records = self.store.load_all()
        record = records.get(record_id)
        if not record:
            return None
        if record.status != RecordStatus.REVIEW:
            return None
        record.status = RecordStatus.INVALID
        if comment:
            record.errors.append(f"复核驳回: {comment}")
        record.review_comment = comment
        records[record_id] = record
        self.store.save_all(records)
        return record

    def approve_all(self, comment: str = "") -> int:
        records = self.store.load_all()
        count = 0
        for rid, record in records.items():
            if record.status == RecordStatus.REVIEW:
                record.status = RecordStatus.VALID
                record.review_comment = comment
                count += 1
        self.store.save_all(records)
        return count

    def reject_all(self, comment: str = "") -> int:
        records = self.store.load_all()
        count = 0
        for rid, record in records.items():
            if record.status == RecordStatus.REVIEW:
                record.status = RecordStatus.INVALID
                if comment:
                    record.errors.append(f"复核驳回: {comment}")
                record.review_comment = comment
                count += 1
        self.store.save_all(records)
        return count

    def fix_invalid(self, record_id: str, updates: Dict, comment: str = "") -> Optional[ScheduleRecord]:
        records = self.store.load_all()
        record = records.get(record_id)
        if not record:
            return None

        updatable_fields = [
            "member_name",
            "member_phone",
            "coach_name",
            "course_name",
            "course_date",
            "course_time",
            "duration_minutes",
        ]

        from datetime import date
        for field, value in updates.items():
            if field in updatable_fields:
                if field == "course_date" and isinstance(value, str):
                    try:
                        value = date.fromisoformat(value)
                    except ValueError:
                        continue
                if field == "duration_minutes" and isinstance(value, str):
                    try:
                        value = int(value)
                    except ValueError:
                        continue
                setattr(record, field, value)

        from .validator import validate_record
        is_valid, _ = validate_record(record)
        record.review_comment = comment
        records[record_id] = record
        self.store.save_all(records)
        return record

    def get_record(self, record_id: str) -> Optional[ScheduleRecord]:
        records = self.store.load_all()
        return records.get(record_id)
