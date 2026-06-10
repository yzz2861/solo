import csv
import json
import hashlib
import os
from typing import List, Dict, Tuple

from .storage import (
    get_conn,
    batch_exists,
    record_batch,
    DB_PATH,
)


def _file_hash(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _content_hash(rows: List[Dict]) -> str:
    h = hashlib.sha256()
    for row in rows:
        h.update(json.dumps(row, sort_keys=True, ensure_ascii=False).encode("utf-8"))
    return h.hexdigest()


def import_schedule_csv(filepath: str, db_path: str = DB_PATH) -> Tuple[int, bool]:
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({k.strip(): v.strip() for k, v in row.items() if k})

    if not rows:
        return 0, False

    source_hash = _content_hash(rows)
    if batch_exists(source_hash, db_path):
        return 0, True

    count = 0
    with get_conn(db_path) as conn:
        for row in rows:
            show_id = row.get("场次编号") or row.get("show_id") or row.get("id")
            if not show_id:
                continue
            film_name = row.get("影片") or row.get("film_name") or ""
            show_time = row.get("时间") or row.get("show_time") or row.get("开始时间") or ""
            hall = row.get("影厅") or row.get("hall") or ""
            price_str = row.get("票价") or row.get("price") or "0"
            try:
                price = float(price_str)
            except ValueError:
                price = 0.0
            status = row.get("状态") or row.get("status") or "normal"

            conn.execute(
                """INSERT OR REPLACE INTO schedules
                   (show_id, film_name, show_time, hall, price, status, source_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (show_id, film_name, show_time, hall, price, status, source_hash),
            )
            count += 1

    record_batch(source_hash, "schedule", os.path.basename(filepath), count, db_path)
    return count, False


def import_sales_json(filepath: str, db_path: str = DB_PATH) -> Tuple[int, bool]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict) and "tickets" in data:
        rows = data["tickets"]
    elif isinstance(data, dict) and "sales" in data:
        rows = data["sales"]
    elif isinstance(data, list):
        rows = data
    else:
        rows = [data] if data else []

    if not rows:
        return 0, False

    source_hash = _content_hash(rows)
    if batch_exists(source_hash, db_path):
        return 0, True

    count = 0
    with get_conn(db_path) as conn:
        for row in rows:
            order_id = row.get("订单号") or row.get("order_id") or row.get("orderId")
            if not order_id:
                continue
            show_id = row.get("场次编号") or row.get("show_id") or ""
            seat_no = row.get("座位") or row.get("seat") or row.get("seat_no") or ""
            amount_str = row.get("金额") or row.get("amount") or row.get("price") or 0
            try:
                amount = float(amount_str)
            except (ValueError, TypeError):
                amount = 0.0
            sale_time = row.get("购票时间") or row.get("sale_time") or row.get("time") or ""

            conn.execute(
                """INSERT OR REPLACE INTO ticket_sales
                   (order_id, show_id, seat_no, amount, sale_time, source_hash)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (order_id, show_id, seat_no, amount, sale_time, source_hash),
            )
            count += 1

    record_batch(source_hash, "sales", os.path.basename(filepath), count, db_path)
    return count, False


def import_refund_csv(filepath: str, db_path: str = DB_PATH) -> Tuple[int, bool]:
    rows = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({k.strip(): v.strip() for k, v in row.items() if k})

    if not rows:
        return 0, False

    source_hash = _content_hash(rows)
    if batch_exists(source_hash, db_path):
        return 0, True

    count = 0
    with get_conn(db_path) as conn:
        for row in rows:
            refund_id = row.get("退票单号") or row.get("refund_id") or row.get("refundId") or row.get("id")
            order_id = row.get("订单号") or row.get("order_id") or row.get("orderId")
            if not refund_id or not order_id:
                continue
            amount_str = row.get("退票金额") or row.get("refund_amount") or row.get("amount") or "0"
            try:
                refund_amount = float(amount_str)
            except ValueError:
                refund_amount = 0.0
            refund_time = row.get("退票时间") or row.get("refund_time") or row.get("time") or ""

            conn.execute(
                """INSERT OR REPLACE INTO refunds
                   (refund_id, order_id, refund_amount, refund_time, source_hash)
                   VALUES (?, ?, ?, ?, ?)""",
                (refund_id, order_id, refund_amount, refund_time, source_hash),
            )
            count += 1

    record_batch(source_hash, "refund", os.path.basename(filepath), count, db_path)
    return count, False
