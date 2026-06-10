import csv
import json
import os
from db import (
    compute_file_hash, check_batch_exists, create_batch,
    get_conn, upsert_store, get_latest_batch_id
)


def _read_csv(file_path):
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return rows


def _normalize_keys(rows):
    normalized = []
    for row in rows:
        new_row = {}
        for k, v in row.items():
            new_key = k.strip().lower().replace(" ", "_")
            new_row[new_key] = v.strip() if isinstance(v, str) else v
        normalized.append(new_row)
    return normalized


def _to_float(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def import_stock_csv(file_path):
    with open(file_path, "rb") as f:
        content = f.read()
    file_hash = compute_file_hash(content)

    if check_batch_exists("stock", file_hash):
        return {"success": False, "message": "该库存台账文件已导入过，不会重复计算。", "batch_id": None, "count": 0}

    rows = _read_csv(file_path)
    rows = _normalize_keys(rows)

    file_name = os.path.basename(file_path)
    batch_id = create_batch("stock", file_hash, file_name, len(rows))

    conn = get_conn()
    count = 0
    for row in rows:
        store_code = row.get("store_code") or row.get("门店编码") or row.get("门店") or ""
        sku_code = row.get("sku_code") or row.get("商品编码") or row.get("sku") or ""
        sku_name = row.get("sku_name") or row.get("商品名称") or ""
        book_qty = _to_float(row.get("book_qty") or row.get("账面数量") or row.get("库存数量") or row.get("数量"))
        ledger_date = row.get("ledger_date") or row.get("日期") or row.get("盘点日期") or ""

        if not store_code or not sku_code:
            continue

        conn.execute(
            "INSERT OR REPLACE INTO stock_ledger (batch_id, store_code, sku_code, sku_name, book_qty, ledger_date) VALUES (?, ?, ?, ?, ?, ?)",
            (batch_id, store_code, sku_code, sku_name, book_qty, ledger_date)
        )
        upsert_store(store_code, conn=conn)
        count += 1

    conn.execute("UPDATE import_batches SET record_count = ? WHERE id = ?", (count, batch_id))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"成功导入 {count} 条库存台账记录。", "batch_id": batch_id, "count": count}


def import_stocktake_csv(file_path):
    with open(file_path, "rb") as f:
        content = f.read()
    file_hash = compute_file_hash(content)

    if check_batch_exists("stocktake", file_hash):
        return {"success": False, "message": "该盘点扫码文件已导入过，不会重复计算。", "batch_id": None, "count": 0}

    rows = _read_csv(file_path)
    rows = _normalize_keys(rows)

    file_name = os.path.basename(file_path)
    batch_id = create_batch("stocktake", file_hash, file_name, len(rows))

    conn = get_conn()
    count = 0
    for row in rows:
        store_code = row.get("store_code") or row.get("门店编码") or row.get("门店") or ""
        sku_code = row.get("sku_code") or row.get("商品编码") or row.get("sku") or ""
        actual_qty = _to_float(row.get("actual_qty") or row.get("实盘数量") or row.get("盘点数量") or row.get("数量"))
        scan_time = row.get("scan_time") or row.get("扫码时间") or row.get("盘点时间") or ""
        scanner = row.get("scanner") or row.get("盘点人") or ""

        if not store_code or not sku_code:
            continue

        conn.execute(
            "INSERT OR REPLACE INTO stocktake_scan (batch_id, store_code, sku_code, actual_qty, scan_time, scanner) VALUES (?, ?, ?, ?, ?, ?)",
            (batch_id, store_code, sku_code, actual_qty, scan_time, scanner)
        )
        upsert_store(store_code, conn=conn)
        count += 1

    conn.execute("UPDATE import_batches SET record_count = ? WHERE id = ?", (count, batch_id))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"成功导入 {count} 条盘点扫码记录。", "batch_id": batch_id, "count": count}


def import_transfer_json(file_path):
    with open(file_path, "rb") as f:
        content = f.read()
    file_hash = compute_file_hash(content)

    if check_batch_exists("transfer", file_hash):
        return {"success": False, "message": "该调拨文件已导入过，不会重复计算。", "batch_id": None, "count": 0}

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        rows = data.get("transfers") or data.get("data") or data.get("list") or [data]
    else:
        rows = data

    file_name = os.path.basename(file_path)
    batch_id = create_batch("transfer", file_hash, file_name, len(rows))

    conn = get_conn()
    count = 0
    for row in rows:
        row = _normalize_keys([row])[0]
        transfer_no = row.get("transfer_no") or row.get("调拨单号") or row.get("单据号") or ""
        from_store = row.get("from_store") or row.get("调出门店") or row.get("发货门店") or ""
        to_store = row.get("to_store") or row.get("调入门店") or row.get("收货门店") or ""
        sku_code = row.get("sku_code") or row.get("商品编码") or row.get("sku") or ""
        transfer_qty = _to_float(row.get("transfer_qty") or row.get("调拨数量") or row.get("数量"))
        transfer_time = row.get("transfer_time") or row.get("调拨时间") or row.get("发货时间") or ""
        arrive_time = row.get("arrive_time") or row.get("到达时间") or row.get("到货时间") or ""
        status = row.get("status") or row.get("状态") or ""

        if not to_store or not sku_code:
            continue

        conn.execute(
            """INSERT OR REPLACE INTO transfer 
               (batch_id, transfer_no, from_store, to_store, sku_code, transfer_qty, transfer_time, arrive_time, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (batch_id, transfer_no, from_store, to_store, sku_code, transfer_qty, transfer_time, arrive_time, status)
        )
        upsert_store(to_store, conn=conn)
        if from_store:
            upsert_store(from_store, conn=conn)
        count += 1

    conn.execute("UPDATE import_batches SET record_count = ? WHERE id = ?", (count, batch_id))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"成功导入 {count} 条调拨记录。", "batch_id": batch_id, "count": count}
