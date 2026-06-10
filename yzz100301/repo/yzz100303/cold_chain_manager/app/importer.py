import csv
import json
import os
import hashlib
from datetime import datetime
from typing import List, Tuple
from .models import BoxInventory, BorrowRecord, ReturnRecord, TemperaturePoint
from .store import DataStore


def _file_hash(filepath: str) -> str:
    h = hashlib.md5()
    size = os.path.getsize(filepath)
    name = os.path.basename(filepath)
    h.update(f"{name}:{size}".encode())
    return h.hexdigest()


def _gen_record_id(prefix: str, box_id: str, time_str: str) -> str:
    raw = f"{prefix}:{box_id}:{time_str}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def import_inventory_csv(filepath: str, store: DataStore) -> Tuple[int, int]:
    source_key = f"inv:{_file_hash(filepath)}"
    if store.is_source_imported(source_key):
        return 0, 0

    added = 0
    skipped = 0
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            box_id = (row.get("药箱编号") or row.get("box_id") or "").strip()
            if not box_id:
                skipped += 1
                continue
            inv = BoxInventory(
                box_id=box_id,
                box_type=(row.get("类型") or row.get("box_type") or "").strip(),
                location=(row.get("存放位置") or row.get("location") or "").strip(),
                remark=(row.get("备注") or row.get("remark") or "").strip(),
            )
            store.add_inventory(inv, source_key="")
            added += 1

    store.mark_source_imported(source_key)
    return added, skipped


def import_borrow_csv(filepath: str, store: DataStore) -> Tuple[int, int]:
    source_key = f"borrow:{_file_hash(filepath)}"
    if store.is_source_imported(source_key):
        return 0, 0

    added = 0
    skipped = 0
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            box_id = (row.get("药箱编号") or row.get("box_id") or "").strip()
            borrow_time_str = (row.get("借出时间") or row.get("borrow_time") or "").strip()
            borrower = (row.get("借出人") or row.get("borrower") or "").strip()
            if not box_id or not borrow_time_str:
                skipped += 1
                continue
            try:
                borrow_time = datetime.fromisoformat(borrow_time_str)
            except ValueError:
                try:
                    borrow_time = datetime.strptime(borrow_time_str, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    try:
                        borrow_time = datetime.strptime(borrow_time_str, "%Y/%m/%d %H:%M:%S")
                    except ValueError:
                        skipped += 1
                        continue

            record_id = _gen_record_id("B", box_id, borrow_time.isoformat())
            record = BorrowRecord(
                record_id=record_id,
                box_id=box_id,
                borrow_time=borrow_time,
                borrower=borrower,
                drug_batch=(row.get("药品批号") or row.get("drug_batch") or "").strip(),
                drug_name=(row.get("药品名称") or row.get("drug_name") or "").strip(),
                purpose=(row.get("用途") or row.get("purpose") or "").strip(),
                source_file=os.path.basename(filepath),
            )
            if store.add_borrow(record, source_key=""):
                added += 1
            else:
                skipped += 1

    store.mark_source_imported(source_key)
    return added, skipped


def import_return_json(filepath: str, store: DataStore) -> Tuple[int, int]:
    source_key = f"return:{_file_hash(filepath)}"
    if store.is_source_imported(source_key):
        return 0, 0

    added = 0
    skipped = 0
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data if isinstance(data, list) else data.get("records", data.get("returns", []))

    for item in records:
        box_id = (item.get("药箱编号") or item.get("box_id") or "").strip()
        return_time_str = (item.get("回收时间") or item.get("return_time") or "").strip()
        returner = (item.get("回收人") or item.get("returner") or "").strip()
        if not box_id or not return_time_str:
            skipped += 1
            continue

        try:
            return_time = datetime.fromisoformat(return_time_str)
        except ValueError:
            try:
                return_time = datetime.strptime(return_time_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                skipped += 1
                continue

        temp_data = item.get("温度曲线") or item.get("temperature") or item.get("temperatures", [])
        points: List[TemperaturePoint] = []
        for tp in temp_data:
            t_str = tp.get("时间") or tp.get("time") or ""
            t_val = tp.get("温度") or tp.get("temperature")
            if t_str and t_val is not None:
                try:
                    t = datetime.fromisoformat(t_str)
                except ValueError:
                    try:
                        t = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        continue
                try:
                    temp = float(t_val)
                except (ValueError, TypeError):
                    continue
                points.append(TemperaturePoint(time=t, temperature=temp))

        record_id = _gen_record_id("R", box_id, return_time.isoformat())
        record = ReturnRecord(
            record_id=record_id,
            box_id=box_id,
            return_time=return_time,
            returner=returner,
            temperature_points=points,
            source_file=os.path.basename(filepath),
            remark=(item.get("备注") or item.get("remark") or "").strip(),
        )
        if store.add_return(record, source_key=""):
            added += 1
        else:
            skipped += 1

    store.mark_source_imported(source_key)
    return added, skipped
