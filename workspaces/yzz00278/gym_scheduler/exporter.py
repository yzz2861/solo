import json
import os
from datetime import datetime
from typing import List, Dict, Any

import pandas as pd

from .models import ScheduleRecord, DiffResult, BatchInfo, ValidationResult


OUTPUT_COLUMNS = [
    "record_id",
    "member_name",
    "member_phone",
    "coach_name",
    "course_name",
    "course_date",
    "course_time",
    "duration_minutes",
    "status",
    "source_file",
    "source_row",
    "batch_id",
    "errors",
    "review_comment",
]


def export_schedules(
    records: List[ScheduleRecord],
    output_dir: str,
    format_type: str = "csv",
    prefix: str = "schedules",
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if format_type == "csv":
        filename = f"{prefix}_{timestamp}.csv"
        filepath = os.path.join(output_dir, filename)
        df = _records_to_dataframe(records)
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
    elif format_type == "json":
        filename = f"{prefix}_{timestamp}.json"
        filepath = os.path.join(output_dir, filename)
        data = [r.to_dict() for r in records]
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    elif format_type == "excel":
        filename = f"{prefix}_{timestamp}.xlsx"
        filepath = os.path.join(output_dir, filename)
        df = _records_to_dataframe(records)
        df.to_excel(filepath, index=False, engine="openpyxl")
    else:
        raise ValueError(f"不支持的导出格式: {format_type}")

    for r in records:
        from .models import RecordStatus
        if r.status == RecordStatus.SCHEDULED:
            r.status = RecordStatus.EXPORTED

    return filepath


def _records_to_dataframe(records: List[ScheduleRecord]) -> pd.DataFrame:
    data = []
    for r in records:
        d = r.to_dict()
        d["errors"] = "; ".join(r.errors) if r.errors else ""
        data.append(d)
    return pd.DataFrame(data, columns=OUTPUT_COLUMNS)


def export_bad_records(
    records: List[ScheduleRecord],
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"bad_records_{timestamp}.csv"
    filepath = os.path.join(output_dir, filename)
    df = _records_to_dataframe(records)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")
    return filepath


def export_diff_table(
    diffs: List[DiffResult],
    output_dir: str,
    format_type: str = "csv",
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    rows = []
    for diff in diffs:
        row = {
            "diff_type": diff.diff_type.value,
            "record_id": diff.record.record_id,
            "changed_fields": ", ".join(diff.changed_fields),
            "member_name": diff.record.member_name,
            "coach_name": diff.record.coach_name,
            "course_name": diff.record.course_name,
            "course_date": diff.record.course_date.isoformat(),
            "course_time": diff.record.course_time,
            "duration_minutes": diff.record.duration_minutes,
            "source_file": diff.record.source_file,
            "source_row": diff.record.source_row,
        }
        if diff.old_record:
            row["old_course_date"] = diff.old_record.course_date.isoformat()
            row["old_course_time"] = diff.old_record.course_time
            row["old_duration"] = diff.old_record.duration_minutes
        rows.append(row)

    df = pd.DataFrame(rows)

    if format_type == "csv":
        filename = f"diff_{timestamp}.csv"
        filepath = os.path.join(output_dir, filename)
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
    elif format_type == "excel":
        filename = f"diff_{timestamp}.xlsx"
        filepath = os.path.join(output_dir, filename)
        df.to_excel(filepath, index=False, engine="openpyxl")
    elif format_type == "json":
        filename = f"diff_{timestamp}.json"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump([d.to_dict() for d in diffs], f, ensure_ascii=False, indent=2)
    else:
        raise ValueError(f"不支持的导出格式: {format_type}")

    return filepath


def export_operation_log(
    batch: BatchInfo,
    validation: ValidationResult,
    diff_summary: Dict[str, int],
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"operation_log_{timestamp}.json"
    filepath = os.path.join(output_dir, filename)

    log = {
        "operation_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "batch": batch.to_dict(),
        "validation": validation.to_dict(),
        "diff_summary": diff_summary,
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)

    return filepath


def export_review_pending(
    records: List[ScheduleRecord],
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"review_pending_{timestamp}.csv"
    filepath = os.path.join(output_dir, filename)
    df = _records_to_dataframe(records)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")
    return filepath
