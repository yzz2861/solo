"""数据导入模块：抢修单 CSV、停水范围 JSON、短信回执 CSV"""
import csv
import json
import os
from typing import List, Dict, Optional, Tuple

from .database import (
    get_conn, init_db, compute_file_hash, is_batch_imported, create_batch
)

SOURCE_REPAIR = "repair"
SOURCE_OUTAGE = "outage"
SOURCE_SMS = "sms"


def _read_file_bytes(file_path: str) -> bytes:
    with open(file_path, "rb") as f:
        return f.read()


def import_repair_csv(file_path: str, db_path: Optional[str] = None) -> Tuple[int, bool]:
    """导入抢修单 CSV。返回 (记录数, 是否为新导入)"""
    init_db(db_path)
    content = _read_file_bytes(file_path)
    batch_hash = compute_file_hash(content)

    if is_batch_imported(batch_hash, db_path):
        return 0, False

    records: List[Dict] = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            records.append({
                "source_row": i,
                "order_no": (row.get("抢修单号") or row.get("order_no") or "").strip(),
                "order_type": row.get("抢修类型") or row.get("order_type") or "",
                "fault_address": row.get("故障地址") or row.get("fault_address") or "",
                "report_time": row.get("报修时间") or row.get("report_time") or "",
                "dispatch_time": row.get("派单时间") or row.get("dispatch_time") or "",
                "repair_team": row.get("抢修班组") or row.get("repair_team") or "",
                "status": row.get("状态") or row.get("status") or "",
                "remark": row.get("备注") or row.get("remark") or "",
            })

    if not records:
        return 0, False

    batch_id = create_batch(batch_hash, SOURCE_REPAIR,
                            os.path.basename(file_path), len(records), db_path)

    with get_conn(db_path) as conn:
        conn.executemany(
            """INSERT INTO repair_orders
               (batch_id, source_row, order_no, order_type, fault_address,
                report_time, dispatch_time, repair_team, status, remark)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [(batch_id, r["source_row"], r["order_no"], r["order_type"],
              r["fault_address"], r["report_time"], r["dispatch_time"],
              r["repair_team"], r["status"], r["remark"])
             for r in records]
        )

    return len(records), True


def import_outage_json(file_path: str, db_path: Optional[str] = None) -> Tuple[int, bool]:
    """导入停水范围 JSON。返回 (记录数, 是否为新导入)"""
    init_db(db_path)
    content = _read_file_bytes(file_path)
    batch_hash = compute_file_hash(content)

    if is_batch_imported(batch_hash, db_path):
        return 0, False

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get("outages", data.get("items", []))

    records: List[Dict] = []
    for i, item in enumerate(items, start=2):
        records.append({
            "source_row": i,
            "order_no": (item.get("抢修单号") or item.get("order_no") or "").strip(),
            "community_name": item.get("小区名称") or item.get("community_name") or "",
            "building_no": item.get("楼栋号") or item.get("building_no") or "",
            "outage_start_time": item.get("停水开始时间") or item.get("outage_start_time") or "",
            "outage_end_time": item.get("停水结束时间") or item.get("outage_end_time") or "",
            "affected_households": item.get("影响户数") or item.get("affected_households") or 0,
            "contact_person": item.get("联系人") or item.get("contact_person") or "",
            "contact_phone": item.get("联系电话") or item.get("contact_phone") or "",
        })

    if not records:
        return 0, False

    batch_id = create_batch(batch_hash, SOURCE_OUTAGE,
                            os.path.basename(file_path), len(records), db_path)

    with get_conn(db_path) as conn:
        conn.executemany(
            """INSERT INTO outage_areas
               (batch_id, source_row, order_no, community_name, building_no,
                outage_start_time, outage_end_time, affected_households,
                contact_person, contact_phone)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [(batch_id, r["source_row"], r["order_no"], r["community_name"],
              r["building_no"], r["outage_start_time"], r["outage_end_time"],
              r["affected_households"], r["contact_person"], r["contact_phone"])
             for r in records]
        )

    return len(records), True


def import_sms_csv(file_path: str, db_path: Optional[str] = None) -> Tuple[int, bool]:
    """导入短信回执 CSV。返回 (记录数, 是否为新导入)"""
    init_db(db_path)
    content = _read_file_bytes(file_path)
    batch_hash = compute_file_hash(content)

    if is_batch_imported(batch_hash, db_path):
        return 0, False

    records: List[Dict] = []
    with open(file_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            records.append({
                "source_row": i,
                "order_no": (row.get("抢修单号") or row.get("order_no") or "").strip(),
                "community_name": row.get("小区名称") or row.get("community_name") or "",
                "phone_number": row.get("手机号") or row.get("phone_number") or "",
                "send_time": row.get("发送时间") or row.get("send_time") or "",
                "receive_time": row.get("接收时间") or row.get("receive_time") or "",
                "status": row.get("状态") or row.get("status") or "",
                "fail_reason": row.get("失败原因") or row.get("fail_reason") or "",
            })

    if not records:
        return 0, False

    batch_id = create_batch(batch_hash, SOURCE_SMS,
                            os.path.basename(file_path), len(records), db_path)

    with get_conn(db_path) as conn:
        conn.executemany(
            """INSERT INTO sms_receipts
               (batch_id, source_row, order_no, community_name, phone_number,
                send_time, receive_time, status, fail_reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [(batch_id, r["source_row"], r["order_no"], r["community_name"],
              r["phone_number"], r["send_time"], r["receive_time"],
              r["status"], r["fail_reason"])
             for r in records]
        )

    return len(records), True


def import_all(repair_csv: Optional[str] = None,
               outage_json: Optional[str] = None,
               sms_csv: Optional[str] = None,
               db_path: Optional[str] = None) -> Dict[str, Dict]:
    """批量导入，返回每类数据的导入结果"""
    results = {}

    if repair_csv:
        n, is_new = import_repair_csv(repair_csv, db_path)
        results["repair"] = {"count": n, "is_new": is_new, "file": repair_csv}

    if outage_json:
        n, is_new = import_outage_json(outage_json, db_path)
        results["outage"] = {"count": n, "is_new": is_new, "file": outage_json}

    if sms_csv:
        n, is_new = import_sms_csv(sms_csv, db_path)
        results["sms"] = {"count": n, "is_new": is_new, "file": sms_csv}

    return results
