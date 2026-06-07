import json
import os
from datetime import date
from typing import List, Dict, Optional, Tuple
import pandas as pd
from dateutil import parser as date_parser

from .models import ScheduleRecord, RecordStatus


DEFAULT_FIELD_MAPPING = {
    "member_name": "会员姓名",
    "member_phone": "会员电话",
    "coach_name": "教练姓名",
    "course_name": "课程名称",
    "course_date": "课程日期",
    "course_time": "课程时间",
    "duration_minutes": "课程时长(分钟)",
}


def load_field_mapping(mapping_file: Optional[str]) -> Dict[str, str]:
    if not mapping_file:
        return DEFAULT_FIELD_MAPPING.copy()
    with open(mapping_file, "r", encoding="utf-8") as f:
        mapping = json.load(f)
    result = DEFAULT_FIELD_MAPPING.copy()
    result.update(mapping)
    return result


def load_file(file_path: str) -> pd.DataFrame:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        return pd.read_csv(file_path, dtype=str, keep_default_na=False)
    elif ext in (".xlsx", ".xls"):
        return pd.read_excel(file_path, dtype=str, keep_default_na=False)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def parse_date(value: str) -> Optional[date]:
    if not value or pd.isna(value):
        return None
    try:
        dt = date_parser.parse(str(value).strip())
        return dt.date()
    except (ValueError, TypeError):
        return None


def parse_int(value: str) -> Optional[int]:
    if not value or pd.isna(value):
        return None
    try:
        return int(float(str(value).strip()))
    except (ValueError, TypeError):
        return None


def load_records(
    file_paths: List[str],
    field_mapping: Dict[str, str],
    date_range: Optional[Tuple[date, date]] = None,
    batch_id: str = "",
) -> List[ScheduleRecord]:
    records = []
    reverse_mapping = {v: k for k, v in field_mapping.items()}

    for file_path in file_paths:
        df = load_file(file_path)
        file_name = os.path.basename(file_path)

        for idx, row in df.iterrows():
            row_data = {}
            for col_name in df.columns:
                std_field = reverse_mapping.get(col_name, col_name)
                row_data[std_field] = str(row[col_name]).strip() if pd.notna(row[col_name]) else ""

            course_date = parse_date(row_data.get("course_date", ""))
            if date_range and course_date:
                start_date, end_date = date_range
                if course_date < start_date or course_date > end_date:
                    continue

            duration = parse_int(row_data.get("duration_minutes", "0"))

            record = ScheduleRecord(
                record_id=_generate_record_id(file_name, idx + 2),
                member_name=row_data.get("member_name", ""),
                member_phone=row_data.get("member_phone", ""),
                coach_name=row_data.get("coach_name", ""),
                course_name=row_data.get("course_name", ""),
                course_date=course_date or date.min,
                course_time=row_data.get("course_time", ""),
                duration_minutes=duration or 0,
                status=RecordStatus.PENDING,
                source_file=file_name,
                source_row=idx + 2,
                batch_id=batch_id,
            )
            records.append(record)

    return records


def _generate_record_id(source_file: str, row_num: int) -> str:
    import hashlib
    raw = f"{source_file}:{row_num}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:12]
