import os
import csv
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple
from .models import ValveRecord, FieldMapping, RecordStatus


def read_field_mapping(mapping_file: str) -> FieldMapping:
    if not mapping_file:
        return FieldMapping()
    if not os.path.exists(mapping_file):
        raise FileNotFoundError(f"字段映射文件不存在: {mapping_file}")
    
    ext = os.path.splitext(mapping_file)[1].lower()
    if ext == ".json":
        with open(mapping_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return FieldMapping.from_dict(data)
    elif ext in (".csv",):
        mapping_dict = {}
        with open(mapping_file, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if header and len(header) >= 2:
                for row in reader:
                    if len(row) >= 2:
                        mapping_dict[row[0].strip()] = row[1].strip()
        return FieldMapping.from_dict(mapping_dict)
    else:
        raise ValueError(f"不支持的映射文件格式: {ext}")


def read_single_file(filepath: str, mapping: FieldMapping, batch_id: str) -> Tuple[List[ValveRecord], List[Dict[str, Any]]]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"输入文件不存在: {filepath}")
    
    ext = os.path.splitext(filepath)[1].lower()
    source_name = os.path.basename(filepath)
    
    if ext == ".csv":
        return _read_csv(filepath, mapping, batch_id, source_name)
    elif ext == ".json":
        return _read_json(filepath, mapping, batch_id, source_name)
    elif ext in (".xlsx", ".xls"):
        return _read_excel(filepath, mapping, batch_id, source_name)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def _read_csv(filepath: str, mapping: FieldMapping, batch_id: str, source_name: str) -> Tuple[List[ValveRecord], List[Dict[str, Any]]]:
    records = []
    bad_rows = []
    reverse_map = mapping.reverse_map()
    
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            raw_row = dict(row)
            try:
                record = _build_record(raw_row, reverse_map, source_name, batch_id, i)
                records.append(record)
            except Exception as e:
                bad_rows.append({
                    "source_file": source_name,
                    "batch_id": batch_id,
                    "row_number": i,
                    "error": str(e),
                    "raw_data": raw_row,
                })
    return records, bad_rows


def _read_json(filepath: str, mapping: FieldMapping, batch_id: str, source_name: str) -> Tuple[List[ValveRecord], List[Dict[str, Any]]]:
    records = []
    bad_rows = []
    reverse_map = mapping.reverse_map()
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if not isinstance(data, list):
        data = [data]
    
    for i, raw_row in enumerate(data, start=1):
        try:
            record = _build_record(raw_row, reverse_map, source_name, batch_id, i)
            records.append(record)
        except Exception as e:
            bad_rows.append({
                "source_file": source_name,
                "batch_id": batch_id,
                "row_number": i,
                "error": str(e),
                "raw_data": raw_row,
            })
    return records, bad_rows


def _read_excel(filepath: str, mapping: FieldMapping, batch_id: str, source_name: str) -> Tuple[List[ValveRecord], List[Dict[str, Any]]]:
    try:
        import openpyxl
    except ImportError:
        raise ImportError("读取Excel文件需要安装 openpyxl: pip install openpyxl")
    
    records = []
    bad_rows = []
    reverse_map = mapping.reverse_map()
    
    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    
    rows = ws.iter_rows(values_only=True)
    header_row = next(rows, None)
    if not header_row:
        return records, bad_rows
    
    headers = [str(h).strip() if h is not None else "" for h in header_row]
    
    for i, row in enumerate(rows, start=2):
        raw_row = {headers[j]: row[j] if j < len(row) else "" for j in range(len(headers))}
        try:
            record = _build_record(raw_row, reverse_map, source_name, batch_id, i)
            records.append(record)
        except Exception as e:
            bad_rows.append({
                "source_file": source_name,
                "batch_id": batch_id,
                "row_number": i,
                "error": str(e),
                "raw_data": raw_row,
            })
    
    wb.close()
    return records, bad_rows


def _build_record(raw_row: Dict[str, Any], reverse_map: Dict[str, str], source_name: str, batch_id: str, row_num: int) -> ValveRecord:
    def get_val(field_name: str, default: Any = "") -> Any:
        col_name = None
        for k, v in reverse_map.items():
            if v == field_name:
                col_name = k
                break
        if col_name is None:
            return default
        val = raw_row.get(col_name, default)
        if val is None:
            return default
        return val

    valve_id = str(get_val("valve_id", "")).strip()
    if not valve_id:
        raise ValueError("阀门编号不能为空")

    record = ValveRecord(
        valve_id=valve_id,
        valve_name=str(get_val("valve_name", "")).strip(),
        operation_type=str(get_val("operation_type", "")).strip(),
        operator=str(get_val("operator", "")).strip(),
        material=str(get_val("material", "")).strip(),
        location=str(get_val("location", "")).strip(),
        remark=str(get_val("remark", "")).strip(),
        raw_data=raw_row,
        source_file=source_name,
        batch_id=batch_id,
        row_number=row_num,
    )

    date_str = str(get_val("operation_date", "")).strip()
    if date_str:
        record.operation_date = _parse_date(date_str)

    try:
        pb = get_val("pressure_before", "0")
        record.pressure_before = float(pb) if pb not in ("", None) else 0.0
    except (ValueError, TypeError):
        pass

    try:
        pa = get_val("pressure_after", "0")
        record.pressure_after = float(pa) if pa not in ("", None) else 0.0
    except (ValueError, TypeError):
        pass

    return record


def _parse_date(date_str: str) -> datetime:
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%d-%m-%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    raise ValueError(f"无法解析日期: {date_str}")


def read_all_files(filepaths: List[str], mapping: FieldMapping, batch_id: str) -> Tuple[List[ValveRecord], List[Dict[str, Any]]]:
    all_records = []
    all_bad_rows = []
    
    for fp in filepaths:
        records, bad_rows = read_single_file(fp, mapping, batch_id)
        all_records.extend(records)
        all_bad_rows.extend(bad_rows)
    
    return all_records, all_bad_rows
