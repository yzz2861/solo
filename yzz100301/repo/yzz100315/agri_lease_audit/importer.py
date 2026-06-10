import csv
import json
import hashlib
import os
from datetime import datetime
from .storage import get_db


def _compute_file_hash(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def _check_batch_exists(batch_hash):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM import_batches WHERE batch_hash = ?", (batch_hash,))
        row = c.fetchone()
        return row['id'] if row else None


def _create_batch(batch_type, source_file, record_count, batch_hash):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO import_batches (batch_type, source_file, import_time, record_count, batch_hash)
            VALUES (?, ?, ?, ?, ?)
        """, (batch_type, source_file, datetime.now(), record_count, batch_hash))
        return c.lastrowid


def import_lease_out_csv(filepath):
    batch_hash = _compute_file_hash(filepath)
    existing_id = _check_batch_exists(batch_hash)
    if existing_id:
        return {
            "skipped": True,
            "batch_id": existing_id,
            "reason": "该批次文件已导入过，跳过重复累计"
        }

    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            records.append({
                "source_line": i,
                "equipment_id": (row.get('设备编号') or row.get('equipment_id') or '').strip(),
                "lease_date": (row.get('租出日期') or row.get('lease_date') or '').strip(),
                "start_hours": float(row.get('起始小时数') or row.get('start_hours') or 0),
                "operator": (row.get('操作人员') or row.get('operator') or '').strip(),
                "remarks": (row.get('备注') or row.get('remarks') or '').strip(),
            })

    batch_id = _create_batch("lease_out", os.path.basename(filepath), len(records), batch_hash)

    inserted = 0
    skipped = 0
    with get_db() as conn:
        c = conn.cursor()
        for rec in records:
            try:
                c.execute("""
                    INSERT INTO lease_out (batch_id, source_line, equipment_id, lease_date,
                                           start_hours, operator, remarks, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (batch_id, rec["source_line"], rec["equipment_id"], rec["lease_date"],
                      rec["start_hours"], rec["operator"], rec["remarks"], datetime.now()))
                inserted += 1
            except Exception as e:
                if "UNIQUE" in str(e):
                    skipped += 1
                else:
                    raise

    return {
        "skipped": False,
        "batch_id": batch_id,
        "total": len(records),
        "inserted": inserted,
        "duplicate_skipped": skipped,
        "source_file": os.path.basename(filepath)
    }


def import_fuel_json(filepath):
    batch_hash = _compute_file_hash(filepath)
    existing_id = _check_batch_exists(batch_hash)
    if existing_id:
        return {
            "skipped": True,
            "batch_id": existing_id,
            "reason": "该批次文件已导入过，跳过重复累计"
        }

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    records = []
    if isinstance(data, dict) and 'records' in data:
        data_list = data['records']
    elif isinstance(data, list):
        data_list = data
    else:
        data_list = [data]

    for i, row in enumerate(data_list, start=1):
        records.append({
            "source_line": i,
            "equipment_id": str(row.get('设备编号') or row.get('equipment_id') or '').strip(),
            "fuel_date": str(row.get('加油日期') or row.get('fuel_date') or '').strip(),
            "fuel_amount": float(row.get('加油量') or row.get('fuel_amount') or 0),
            "fuel_station": str(row.get('加油站') or row.get('fuel_station') or '').strip(),
            "operator": str(row.get('加油员') or row.get('operator') or '').strip(),
            "remarks": str(row.get('备注') or row.get('remarks') or '').strip(),
        })

    batch_id = _create_batch("fuel", os.path.basename(filepath), len(records), batch_hash)

    inserted = 0
    skipped = 0
    with get_db() as conn:
        c = conn.cursor()
        for rec in records:
            try:
                c.execute("""
                    INSERT INTO fuel_records (batch_id, source_line, equipment_id, fuel_date,
                                              fuel_amount, fuel_station, operator, remarks, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (batch_id, rec["source_line"], rec["equipment_id"], rec["fuel_date"],
                      rec["fuel_amount"], rec["fuel_station"], rec["operator"], rec["remarks"],
                      datetime.now()))
                inserted += 1
            except Exception as e:
                if "UNIQUE" in str(e):
                    skipped += 1
                else:
                    raise

    return {
        "skipped": False,
        "batch_id": batch_id,
        "total": len(records),
        "inserted": inserted,
        "duplicate_skipped": skipped,
        "source_file": os.path.basename(filepath)
    }


def import_return_check_csv(filepath):
    batch_hash = _compute_file_hash(filepath)
    existing_id = _check_batch_exists(batch_hash)
    if existing_id:
        return {
            "skipped": True,
            "batch_id": existing_id,
            "reason": "该批次文件已导入过，跳过重复累计"
        }

    records = []
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            records.append({
                "source_line": i,
                "equipment_id": (row.get('设备编号') or row.get('equipment_id') or '').strip(),
                "return_date": (row.get('归还日期') or row.get('return_date') or '').strip(),
                "end_hours": float(row.get('结束小时数') or row.get('end_hours') or 0),
                "inspector": (row.get('验收人') or row.get('inspector') or '').strip(),
                "inspection_result": (row.get('验收结果') or row.get('inspection_result') or '').strip(),
                "remarks": (row.get('备注') or row.get('remarks') or '').strip(),
            })

    batch_id = _create_batch("return_check", os.path.basename(filepath), len(records), batch_hash)

    inserted = 0
    skipped = 0
    with get_db() as conn:
        c = conn.cursor()
        for rec in records:
            try:
                c.execute("""
                    INSERT INTO return_check (batch_id, source_line, equipment_id, return_date,
                                              end_hours, inspector, inspection_result, remarks, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (batch_id, rec["source_line"], rec["equipment_id"], rec["return_date"],
                      rec["end_hours"], rec["inspector"], rec["inspection_result"], rec["remarks"],
                      datetime.now()))
                inserted += 1
            except Exception as e:
                if "UNIQUE" in str(e):
                    skipped += 1
                else:
                    raise

    return {
        "skipped": False,
        "batch_id": batch_id,
        "total": len(records),
        "inserted": inserted,
        "duplicate_skipped": skipped,
        "source_file": os.path.basename(filepath)
    }
