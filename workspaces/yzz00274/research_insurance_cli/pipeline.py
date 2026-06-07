"""核心处理管道"""

import os
from datetime import datetime, date
from typing import List, Dict, Optional, Any

from .config import RecordStatus, DEFAULT_FIELD_MAPPING
from .models import ProcessResult, InsuranceRecord
from .validator import ValidationEngine
from .risk_assessor import RiskAssessor
from .exporter import DataExporter
from .batch_manager import BatchManager
from .utils import generate_batch_id, parse_date


def load_input_files(file_paths: List[str]) -> List[tuple[str, List[Dict[str, Any]]]]:
    results = []
    for path in file_paths:
        if not os.path.exists(path):
            raise FileNotFoundError(f"文件不存在：{path}")

        ext = os.path.splitext(path)[1].lower()
        filename = os.path.basename(path)

        if ext == ".csv":
            import csv
            with open(path, "r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                rows = [dict(row) for row in reader]
            results.append((filename, rows))

        elif ext in (".xlsx", ".xls"):
            try:
                import pandas as pd
            except ImportError:
                raise ImportError("读取 Excel 文件需要安装 pandas 和 openpyxl")

            df = pd.read_excel(path, dtype=str)
            df = df.where(pd.notna(df), "")
            rows = df.to_dict("records")
            results.append((filename, rows))

        elif ext == ".json":
            import json
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                results.append((filename, data))
            elif isinstance(data, dict) and "records" in data:
                results.append((filename, data["records"]))
            else:
                results.append((filename, [data]))

        else:
            raise ValueError(f"不支持的文件格式：{ext}")

    return results


def _filter_by_date_range(
    records: List[InsuranceRecord],
    start_date: date,
    end_date: date,
    field_mapping: Dict[str, str],
) -> List[InsuranceRecord]:
    filtered = []
    activity_start_key = field_mapping.get("start_date", "活动开始日期")
    activity_end_key = field_mapping.get("end_date", "活动结束日期")

    for record in records:
        act_start = parse_date(record.mapped_data.get(activity_start_key))
        act_end = parse_date(record.mapped_data.get(activity_end_key))

        if act_start and act_end:
            if act_end < start_date or act_start > end_date:
                continue
        elif act_start:
            if act_start > end_date:
                continue
        elif act_end:
            if act_end < start_date:
                continue

        filtered.append(record)

    return filtered


def process_files(
    file_paths: List[str],
    field_mapping: Optional[Dict[str, str]] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    filter_by_date: bool = False,
    output_dir: str = ".",
    export_format: str = "csv",
    split_files: bool = True,
    batch_prefix: str = "INS",
) -> ProcessResult:
    date_range = None
    if start_date and end_date:
        date_range = (start_date, end_date)

    effective_mapping = field_mapping or DEFAULT_FIELD_MAPPING

    validator = ValidationEngine(field_mapping=field_mapping, date_range=date_range)
    risk_assessor = RiskAssessor()
    exporter = DataExporter(output_dir=output_dir)
    batch_manager = BatchManager(data_dir=output_dir)

    batch_id = generate_batch_id(prefix=batch_prefix)

    source_data = load_input_files(file_paths)

    all_records: List[InsuranceRecord] = []
    source_files = []

    for source_file, rows in source_data:
        source_files.append(source_file)
        records = validator.validate_batch(rows, source_file=source_file, start_row=2)
        all_records.extend(records)

    if filter_by_date and start_date and end_date:
        all_records = _filter_by_date_range(
            all_records, start_date, end_date, effective_mapping
        )

    all_records = risk_assessor.assess_batch(all_records)

    for record in all_records:
        record.batch_id = batch_id

    normal_count = sum(1 for r in all_records if r.status == RecordStatus.NORMAL)
    abnormal_count = sum(1 for r in all_records if r.status == RecordStatus.ABNORMAL)
    pending_count = sum(1 for r in all_records if r.status == RecordStatus.PENDING_REVIEW)

    result = ProcessResult(
        batch_id=batch_id,
        processed_at=datetime.now(),
        total_count=len(all_records),
        normal_count=normal_count,
        abnormal_count=abnormal_count,
        pending_count=pending_count,
        records=all_records,
        source_files=source_files,
    )

    output_files = exporter.export(
        result,
        fmt=export_format,
        split_files=split_files,
    )

    batch_manager.record_batch(result, output_files)

    return result
