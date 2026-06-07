import csv
import os
from typing import List, Tuple, Dict
from .models import PlatingRecord, RecordStatus
from .utils import detect_delimiter, read_csv_sample


def read_plating_csv(filepath: str) -> Tuple[List[PlatingRecord], List[str], List[Dict]]:
    """读取电镀废液CSV，返回(记录列表、字段列表、坏行列表)

    Returns:
        tuple: (records, fieldnames, bad_rows)
    """
    records = []
    bad_rows = []
    fieldnames = []

    sample = read_csv_sample(filepath, 5)
    delimiter = detect_delimiter(sample)

    source_file = os.path.basename(filepath)
    expected_field_count = 0

    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        header_row = next(reader, None)
        if header_row:
            fieldnames = [fn.strip() for fn in header_row]
            expected_field_count = len(fieldnames)

        for i, row in enumerate(reader, start=2):
            try:
                raw_line = delimiter.join(row)

                if not row or all(c.strip() == "" for c in row):
                    bad_rows.append({
                        "line_no": i,
                        "reason": "空行",
                        "raw": raw_line,
                    })
                    continue

                if len(row) < expected_field_count * 0.5 or len(row) == 1 and expected_field_count > 3:
                    bad_rows.append({
                        "line_no": i,
                        "reason": f"字段数不匹配（期望约{expected_field_count}列，实际{len(row)}列）",
                        "raw": raw_line,
                    })
                    continue

                cleaned = {}
                for idx, fn in enumerate(fieldnames):
                    val = row[idx].strip() if idx < len(row) else ""
                    cleaned[fn] = val

                record = PlatingRecord(
                    raw=cleaned,
                    line_no=i,
                    source_file=source_file,
                )
                records.append(record)
            except Exception as e:
                bad_rows.append({
                    "line_no": i,
                    "reason": f"解析错误: {str(e)}",
                    "raw": delimiter.join(row) if row else "",
                })

    return records, fieldnames, bad_rows


def read_history_snapshot(filepath: str) -> Dict[str, PlatingRecord]:
    """读取历史快照，返回以记录唯一键索引的字典"""
    records = {}
    if not filepath or not os.path.exists(filepath):
        return records

    sample = read_csv_sample(filepath, 5)
    delimiter = detect_delimiter(sample)
    source_file = os.path.basename(filepath)

    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f, delimiter=delimiter)
        header_row = next(reader, None)
        fieldnames = []
        if header_row:
            fieldnames = [fn.strip() for fn in header_row]

        for i, row in enumerate(reader, start=2):
            try:
                if not row or all(c.strip() == "" for c in row):
                    continue
                cleaned = {}
                for idx, fn in enumerate(fieldnames):
                    val = row[idx].strip() if idx < len(row) else ""
                    cleaned[fn] = val

                record = PlatingRecord(
                    raw=cleaned,
                    line_no=i,
                    source_file=source_file,
                )
                key = _make_unique_key(record)
                if key:
                    records[key] = record
            except Exception:
                continue

    return records


def _make_unique_key(record: PlatingRecord) -> str:
    """生成记录唯一键，用于去重（批次号+槽号为业务唯一键）"""
    parts = []
    for field in ["批次号", "槽号"]:
        val = record.get(field)
        if val:
            parts.append(val)
    if len(parts) < 2:
        return ""
    return "|".join(parts)


def write_pass_csv(filepath: str, records: List[PlatingRecord], fieldnames: List[str], batch_id: str):
    """写出通过清单"""
    extra_fields = ["_source_file", "_batch_id", "_status", "_line_no"]
    all_fields = fieldnames + extra_fields

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        for rec in records:
            row = {k: rec.get(k) for k in fieldnames}
            row["_source_file"] = rec.source_file
            row["_batch_id"] = batch_id
            row["_status"] = rec.status.value
            row["_line_no"] = rec.line_no
            writer.writerow(row)


def write_exception_csv(filepath: str, records: List[PlatingRecord], fieldnames: List[str], batch_id: str):
    """写出异常清单"""
    extra_fields = [
        "_source_file", "_batch_id", "_status", "_line_no",
        "_exception_types", "_exception_messages", "_rule_matches"
    ]
    all_fields = fieldnames + extra_fields

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        for rec in records:
            row = {k: rec.get(k) for k in fieldnames}
            row["_source_file"] = rec.source_file
            row["_batch_id"] = batch_id
            row["_status"] = rec.status.value
            row["_line_no"] = rec.line_no
            row["_exception_types"] = ";".join(t.value for t in rec.exception_types)
            row["_exception_messages"] = ";".join(rec.exception_messages)
            row["_rule_matches"] = ";".join(rec.rule_matches)
            writer.writerow(row)


def write_bad_row_csv(filepath: str, bad_rows: List[Dict], batch_id: str, source_file: str):
    """写出坏行隔离文件"""
    fields = ["_batch_id", "_source_file", "line_no", "reason", "raw"]
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for br in bad_rows:
            row = dict(br)
            row["_batch_id"] = batch_id
            row["_source_file"] = source_file
            writer.writerow(row)


def write_summary_json(filepath: str, summary_dict: dict):
    """写出汇总摘要JSON"""
    import json
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(summary_dict, f, ensure_ascii=False, indent=2)


def write_summary_csv(filepath: str, summary_dict: dict):
    """写出汇总摘要CSV"""
    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["项目", "值"])
        for k, v in summary_dict.items():
            writer.writerow([k, str(v)])
