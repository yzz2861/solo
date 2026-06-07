import json
import os
from datetime import date
from typing import List, Dict, Optional, Tuple

from .models import (
    ScheduleRecord,
    RecordStatus,
    DiffResult,
    DiffType,
    BatchInfo,
)


COMPARE_FIELDS = [
    "member_name",
    "member_phone",
    "coach_name",
    "course_name",
    "course_date",
    "course_time",
    "duration_minutes",
]


class ScheduleStore:
    def __init__(self, store_dir: str):
        self.store_dir = store_dir
        self.data_file = os.path.join(store_dir, "schedules.json")
        self.batch_log_file = os.path.join(store_dir, "batch_log.json")
        os.makedirs(store_dir, exist_ok=True)

    def load_all(self) -> Dict[str, ScheduleRecord]:
        if not os.path.exists(self.data_file):
            return {}
        with open(self.data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = {}
        for item in data:
            record = self._dict_to_record(item)
            records[record.record_id] = record
        return records

    def save_all(self, records: Dict[str, ScheduleRecord]):
        data = [r.to_dict() for r in records.values()]
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def append_batch_log(self, batch: BatchInfo, summary: Dict):
        log = []
        if os.path.exists(self.batch_log_file):
            with open(self.batch_log_file, "r", encoding="utf-8") as f:
                log = json.load(f)
        entry = {
            "batch": batch.to_dict(),
            "summary": summary,
        }
        log.append(entry)
        with open(self.batch_log_file, "w", encoding="utf-8") as f:
            json.dump(log, f, ensure_ascii=False, indent=2)

    def list_batches(self) -> List[Dict]:
        if not os.path.exists(self.batch_log_file):
            return []
        with open(self.batch_log_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _dict_to_record(d: Dict) -> ScheduleRecord:
        from datetime import date as date_type
        course_date_str = d.get("course_date", "")
        try:
            course_date = date.fromisoformat(course_date_str) if course_date_str else date.min
        except ValueError:
            course_date = date.min

        return ScheduleRecord(
            record_id=d.get("record_id", ""),
            member_name=d.get("member_name", ""),
            member_phone=d.get("member_phone", ""),
            coach_name=d.get("coach_name", ""),
            course_name=d.get("course_name", ""),
            course_date=course_date,
            course_time=d.get("course_time", ""),
            duration_minutes=int(d.get("duration_minutes", 0)),
            status=RecordStatus(d.get("status", "pending")),
            source_file=d.get("source_file", ""),
            source_row=int(d.get("source_row", 0)),
            batch_id=d.get("batch_id", ""),
            errors=d.get("errors", []),
            review_comment=d.get("review_comment", ""),
        )


def compare_records(
    new_records: List[ScheduleRecord],
    existing_records: Dict[str, ScheduleRecord],
) -> List[DiffResult]:
    diffs = []
    existing_ids = set(existing_records.keys())
    new_ids = set()

    for record in new_records:
        new_ids.add(record.record_id)
        old_record = existing_records.get(record.record_id)

        if old_record is None:
            diffs.append(DiffResult(
                diff_type=DiffType.NEW,
                record=record,
            ))
        else:
            changed = _get_changed_fields(record, old_record)
            if changed:
                diffs.append(DiffResult(
                    diff_type=DiffType.UPDATED,
                    record=record,
                    old_record=old_record,
                    changed_fields=changed,
                ))
            else:
                diffs.append(DiffResult(
                    diff_type=DiffType.UNCHANGED,
                    record=record,
                    old_record=old_record,
                ))

    deleted_ids = existing_ids - new_ids
    for rid in deleted_ids:
        diffs.append(DiffResult(
            diff_type=DiffType.DELETED,
            record=existing_records[rid],
        ))

    return diffs


def _get_changed_fields(new: ScheduleRecord, old: ScheduleRecord) -> List[str]:
    changed = []
    for field in COMPARE_FIELDS:
        new_val = getattr(new, field)
        old_val = getattr(old, field)
        if hasattr(new_val, "isoformat"):
            if new_val.isoformat() != old_val.isoformat():
                changed.append(field)
        else:
            if new_val != old_val:
                changed.append(field)
    return changed


def generate_schedules(
    valid_records: List[ScheduleRecord],
    store: ScheduleStore,
    batch_id: str = "",
) -> Tuple[List[DiffResult], Dict[str, int]]:
    existing = store.load_all()
    scheduled_existing = {
        rid: r for rid, r in existing.items()
        if r.status in (RecordStatus.VALID, RecordStatus.SCHEDULED, RecordStatus.EXPORTED)
    }
    diffs = compare_records(valid_records, scheduled_existing)
    diffs = [d for d in diffs if d.diff_type != DiffType.DELETED]

    for diff in diffs:
        if diff.diff_type in (DiffType.NEW, DiffType.UPDATED):
            record = diff.record
            record.status = RecordStatus.SCHEDULED
            if batch_id:
                record.batch_id = batch_id
            existing[record.record_id] = record

    store.save_all(existing)

    summary = {
        DiffType.NEW.value: 0,
        DiffType.UPDATED.value: 0,
        DiffType.UNCHANGED.value: 0,
        DiffType.DELETED.value: 0,
    }
    for diff in diffs:
        summary[diff.diff_type.value] += 1

    return diffs, summary


def idempotent_generate(
    valid_records: List[ScheduleRecord],
    store: ScheduleStore,
    batch_id: str = "",
) -> Tuple[List[DiffResult], Dict[str, int]]:
    return generate_schedules(valid_records, store, batch_id)


def import_all_records(
    records: List[ScheduleRecord],
    store: ScheduleStore,
    batch_id: str = "",
) -> int:
    existing = store.load_all()
    count = 0
    for record in records:
        if batch_id:
            record.batch_id = batch_id
        old_record = existing.get(record.record_id)
        if old_record is None:
            existing[record.record_id] = record
            count += 1
        else:
            if old_record.status in (RecordStatus.VALID, RecordStatus.SCHEDULED, RecordStatus.EXPORTED):
                pass
            else:
                existing[record.record_id] = record
                count += 1
    store.save_all(existing)
    return count
