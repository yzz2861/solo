"""审计模块 - 检查各类异常情况

包含三类异常:
1. 逾期未还
2. 吊点载荷超限
3. 归还人与借出人不一致
"""

from typing import List, Dict, Optional
from datetime import date

from .database import get_conn
from .utils import parse_date, is_overdue, safe_int, safe_float
from .core import get_equipment_status


def audit_overdue(db_path: Optional[str] = None, reference_date: date = None) -> List[Dict]:
    """检查逾期未还的设备

    返回每条逾期明细，包含原始行号
    """
    ref_date = reference_date or date.today()
    results = []

    with get_conn(db_path) as conn:
        lendings = conn.execute("""
            SELECT lr.*, e.name as equip_name, s.file_path as source_file
            FROM lending_records lr
            LEFT JOIN equipments e ON lr.equipment_no = e.equipment_no
            LEFT JOIN import_sources s ON lr.source_id = s.id
            WHERE lr.due_date IS NOT NULL AND lr.due_date != ''
            ORDER BY lr.due_date ASC
        """).fetchall()

        return_map = {}
        for r in conn.execute("SELECT * FROM return_records").fetchall():
            eq = r["equipment_no"]
            if eq not in return_map:
                return_map[eq] = []
            return_map[eq].append(dict(r))

    for lend in lendings:
        equip_no = lend["equipment_no"]
        due_date_str = lend["due_date"]

        if not due_date_str:
            continue

        returns = return_map.get(equip_no, [])
        latest_return_date = ""
        total_returned = 0

        for ret in returns:
            total_returned += safe_int(ret["quantity"], 0)
            if ret["return_date"] and ret["return_date"] > latest_return_date:
                latest_return_date = ret["return_date"]

        lend_qty = safe_int(lend["quantity"], 0)

        if is_overdue(due_date_str, latest_return_date, ref_date):
            still_out = max(0, lend_qty - total_returned)
            if still_out > 0 or (latest_return_date and is_overdue(due_date_str, latest_return_date, ref_date)):
                results.append({
                    "equipment_no": equip_no,
                    "equipment_name": lend["equip_name"] or "",
                    "quantity_lent": lend_qty,
                    "quantity_returned": total_returned,
                    "quantity_overdue": still_out if still_out > 0 else lend_qty,
                    "borrower": lend["borrower"] or "",
                    "lender": lend["lender"] or "",
                    "lend_date": lend["lend_date"] or "",
                    "due_date": due_date_str,
                    "latest_return_date": latest_return_date,
                    "purpose": lend["purpose"] or "",
                    "location": lend["location"] or "",
                    "source_file": lend["source_file"] or "",
                    "source_line_no": lend["source_line_no"],
                    "type": "overdue",
                })

    return sorted(results, key=lambda x: x["due_date"])


def audit_hoist_overload(db_path: Optional[str] = None) -> List[Dict]:
    """检查吊点载荷超限

    返回每条超限明细，包含原始行号
    """
    results = []

    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT hp.*, s.file_path as source_file
            FROM hoist_points hp
            LEFT JOIN import_sources s ON hp.source_id = s.id
            ORDER BY hp.point_no
        """).fetchall()

    for row in rows:
        max_load = safe_float(row["max_load"], 0.0)
        current_load = safe_float(row["current_load"], 0.0)

        if max_load > 0 and current_load > max_load:
            results.append({
                "point_no": row["point_no"],
                "max_load": max_load,
                "current_load": current_load,
                "overload_amount": round(current_load - max_load, 2),
                "overload_percent": round((current_load - max_load) / max_load * 100 if max_load > 0 else 0, 2),
                "equipment_no": row["equipment_no"] or "",
                "quantity": safe_int(row["quantity"], 0),
                "position": row["position"] or "",
                "remark": row["remark"] or "",
                "source_file": row["source_file"] or "",
                "source_line_no": row["source_line_no"],
                "type": "hoist_overload",
            })

    return sorted(results, key=lambda x: x["overload_amount"], reverse=True)


def audit_person_mismatch(db_path: Optional[str] = None) -> List[Dict]:
    """检查归还人与借出人不一致的情况

    按批次匹配借出和归还，检查借用人和归还人是否一致。
    """
    results = []

    with get_conn(db_path) as conn:
        lendings = conn.execute("""
            SELECT lr.*, e.name as equip_name, s.file_path as source_file
            FROM lending_records lr
            LEFT JOIN equipments e ON lr.equipment_no = e.equipment_no
            LEFT JOIN import_sources s ON lr.source_id = s.id
            ORDER BY lr.equipment_no, lr.lend_date
        """).fetchall()

        returns = conn.execute("""
            SELECT rr.*, s.file_path as source_file
            FROM return_records rr
            LEFT JOIN import_sources s ON rr.source_id = s.id
            ORDER BY rr.equipment_no, rr.return_date
        """).fetchall()

    lend_by_equip = {}
    for l in lendings:
        eq = l["equipment_no"]
        if eq not in lend_by_equip:
            lend_by_equip[eq] = []
        lend_by_equip[eq].append(l)

    return_by_equip = {}
    for r in returns:
        eq = r["equipment_no"]
        if eq not in return_by_equip:
            return_by_equip[eq] = []
        return_by_equip[eq].append(r)

    all_equips = set(list(lend_by_equip.keys()) + list(return_by_equip.keys()))

    for equip_no in sorted(all_equips):
        lends = lend_by_equip.get(equip_no, [])
        rets = return_by_equip.get(equip_no, [])

        for lend in lends:
            borrower = (lend["borrower"] or "").strip()
            if not borrower:
                continue

            for ret in rets:
                returner = (ret["returner"] or "").strip()
                if not returner:
                    continue

                if borrower != returner:
                    results.append({
                        "equipment_no": equip_no,
                        "equipment_name": lend["equip_name"] or "",
                        "borrower": borrower,
                        "lender": lend["lender"] or "",
                        "returner": returner,
                        "verifier": ret["verifier"] or "",
                        "lend_date": lend["lend_date"] or "",
                        "return_date": ret["return_date"] or "",
                        "lend_qty": safe_int(lend["quantity"], 0),
                        "return_qty": safe_int(ret["quantity"], 0),
                        "lend_source_file": lend["source_file"] or "",
                        "lend_source_line": lend["source_line_no"],
                        "return_source_file": ret["source_file"] or "",
                        "return_source_line": ret["source_line_no"],
                        "type": "person_mismatch",
                    })

    return results


def run_full_audit(db_path: Optional[str] = None, reference_date: date = None) -> Dict:
    """运行完整审计，返回所有异常"""
    return {
        "overdue": audit_overdue(db_path, reference_date),
        "hoist_overload": audit_hoist_overload(db_path),
        "person_mismatch": audit_person_mismatch(db_path),
    }


def get_audit_summary(audit_result: Dict) -> Dict:
    """获取审计摘要统计"""
    return {
        "overdue_count": len(audit_result["overdue"]),
        "hoist_overload_count": len(audit_result["hoist_overload"]),
        "person_mismatch_count": len(audit_result["person_mismatch"]),
        "total_issues": (
            len(audit_result["overdue"])
            + len(audit_result["hoist_overload"])
            + len(audit_result["person_mismatch"])
        ),
    }
