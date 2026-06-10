import csv
import json
import hashlib
import os
from datetime import datetime
from database import get_connection, batch_exists


def generate_batch_id(file_path, record_count):
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    raw = f"{file_name}_{file_size}_{record_count}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def import_tools_ledger(csv_path):
    batch_id = generate_batch_id(csv_path, 0)

    if batch_exists(batch_id):
        return {"success": False, "message": "该工具台账已导入过，无需重复导入", "count": 0}

    tools = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tool_no = (row.get("tool_no") or row.get("工具编号") or "").strip()
            tool_name = (row.get("tool_name") or row.get("工具名称") or "").strip()
            if not tool_no or not tool_name:
                continue
            tools.append({
                "tool_no": tool_no,
                "tool_name": tool_name,
                "specification": (row.get("specification") or row.get("规格型号") or "").strip(),
                "category": (row.get("category") or row.get("类别") or "").strip(),
                "calibration_expiry": (row.get("calibration_expiry") or row.get("校验有效期") or "").strip(),
                "location": (row.get("location") or row.get("存放位置") or "").strip(),
                "remark": (row.get("remark") or row.get("备注") or "").strip(),
            })

    if not tools:
        return {"success": False, "message": "未找到有效工具记录", "count": 0}

    batch_id = generate_batch_id(csv_path, len(tools))
    if batch_exists(batch_id):
        return {"success": False, "message": "该工具台账已导入过，无需重复导入", "count": 0}

    conn = get_connection()
    cursor = conn.cursor()

    inserted = 0
    updated = 0
    for tool in tools:
        cursor.execute("SELECT id FROM tools WHERE tool_no = ?", (tool["tool_no"],))
        exists = cursor.fetchone()
        if exists:
            cursor.execute("""
                UPDATE tools SET tool_name=?, specification=?, category=?,
                calibration_expiry=?, location=?, remark=?, updated_at=CURRENT_TIMESTAMP
                WHERE tool_no=?
            """, (tool["tool_name"], tool["specification"], tool["category"],
                  tool["calibration_expiry"] or None, tool["location"], tool["remark"],
                  tool["tool_no"]))
            updated += 1
        else:
            cursor.execute("""
                INSERT INTO tools (tool_no, tool_name, specification, category,
                calibration_expiry, location, remark)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (tool["tool_no"], tool["tool_name"], tool["specification"], tool["category"],
                  tool["calibration_expiry"] or None, tool["location"], tool["remark"]))
            inserted += 1

    cursor.execute("""
        INSERT OR IGNORE INTO import_batches (batch_id, batch_type, source_file, record_count, remark)
        VALUES (?, ?, ?, ?, ?)
    """, (batch_id, "tools_ledger", os.path.basename(csv_path), len(tools), ""))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"工具台账导入完成：新增 {inserted} 条，更新 {updated} 条",
            "inserted": inserted, "updated": updated, "count": len(tools)}


def import_borrow_records(csv_path):
    records = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tool_no = (row.get("tool_no") or row.get("工具编号") or "").strip()
            borrower = (row.get("borrower") or row.get("借用人") or "").strip()
            borrow_date = (row.get("borrow_date") or row.get("借出日期") or "").strip()
            if not tool_no or not borrower or not borrow_date:
                continue
            records.append({
                "tool_no": tool_no,
                "borrower": borrower,
                "borrow_date": borrow_date,
                "expected_return_date": (row.get("expected_return_date") or row.get("预计归还日期") or "").strip(),
                "borrow_remark": (row.get("borrow_remark") or row.get("借出备注") or row.get("备注") or "").strip(),
            })

    if not records:
        return {"success": False, "message": "未找到有效借出记录", "count": 0}

    batch_id = generate_batch_id(csv_path, len(records))
    if batch_exists(batch_id):
        return {"success": False, "message": "该批借出记录已导入过，无需重复导入", "count": 0}

    conn = get_connection()
    cursor = conn.cursor()

    for rec in records:
        cursor.execute("""
            INSERT INTO borrow_records (tool_no, borrower, borrow_date, expected_return_date,
            borrow_remark, batch_id, source_file, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'borrowed')
        """, (rec["tool_no"], rec["borrower"], rec["borrow_date"],
              rec["expected_return_date"] or None, rec["borrow_remark"],
              batch_id, os.path.basename(csv_path)))

        cursor.execute("""
            UPDATE tools SET status='borrowed', updated_at=CURRENT_TIMESTAMP
            WHERE tool_no=? AND status='in_stock'
        """, (rec["tool_no"],))

    cursor.execute("""
        INSERT OR IGNORE INTO import_batches (batch_id, batch_type, source_file, record_count, remark)
        VALUES (?, ?, ?, ?, ?)
    """, (batch_id, "borrow", os.path.basename(csv_path), len(records), ""))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"借出记录导入完成：共 {len(records)} 条", "count": len(records)}


def import_return_records(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        records = data.get("returns", data.get("归还记录", [data]))
    elif isinstance(data, list):
        records = data
    else:
        records = []

    valid_records = []
    for row in records:
        tool_no = (row.get("tool_no") or row.get("工具编号") or "").strip()
        returner = (row.get("returner") or row.get("归还人") or "").strip()
        return_date = (row.get("return_date") or row.get("归还日期") or "").strip()
        if not tool_no or not returner or not return_date:
            continue
        valid_records.append({
            "tool_no": tool_no,
            "returner": returner,
            "return_date": return_date,
            "return_photo_path": (row.get("return_photo_path") or row.get("归还照片") or "").strip(),
            "return_remark": (row.get("return_remark") or row.get("归还备注") or row.get("备注") or "").strip(),
        })

    if not valid_records:
        return {"success": False, "message": "未找到有效归还记录", "count": 0}

    batch_id = generate_batch_id(json_path, len(valid_records))
    if batch_exists(batch_id):
        return {"success": False, "message": "该批归还记录已导入过，无需重复导入", "count": 0}

    conn = get_connection()
    cursor = conn.cursor()

    matched_count = 0
    unmatched_count = 0

    for rec in valid_records:
        cursor.execute("""
            SELECT id FROM borrow_records
            WHERE tool_no=? AND status='borrowed'
            ORDER BY borrow_date DESC LIMIT 1
        """, (rec["tool_no"],))
        borrow_row = cursor.fetchone()
        borrow_id = borrow_row["id"] if borrow_row else None

        if borrow_id:
            matched_count += 1
            cursor.execute("UPDATE borrow_records SET status='returned' WHERE id=?", (borrow_id,))
            cursor.execute("""
                UPDATE tools SET status='returned', updated_at=CURRENT_TIMESTAMP
                WHERE tool_no=?
            """, (rec["tool_no"],))
        else:
            unmatched_count += 1

        cursor.execute("""
            INSERT INTO return_records (tool_no, returner, return_date, return_photo_path,
            return_remark, batch_id, source_file, borrow_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'returned')
        """, (rec["tool_no"], rec["returner"], rec["return_date"],
              rec["return_photo_path"] or None, rec["return_remark"],
              batch_id, os.path.basename(json_path), borrow_id))

        if borrow_id:
            cursor.execute("""
                INSERT INTO reviews (tool_no, borrow_id, return_id, review_opinion)
                VALUES (?, ?, (SELECT last_insert_rowid()), ?)
            """, (rec["tool_no"], borrow_id, ""))

    cursor.execute("""
        INSERT OR IGNORE INTO import_batches (batch_id, batch_type, source_file, record_count, remark)
        VALUES (?, ?, ?, ?, ?)
    """, (batch_id, "return", os.path.basename(json_path), len(valid_records),
          f"匹配{matched_count}条，未匹配{unmatched_count}条"))
    conn.commit()
    conn.close()

    return {"success": True,
            "message": f"归还记录导入完成：共 {len(valid_records)} 条，匹配借出 {matched_count} 条，未匹配 {unmatched_count} 条",
            "count": len(valid_records), "matched": matched_count, "unmatched": unmatched_count}
