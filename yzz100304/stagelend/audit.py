"""审计模块 - 检查各类异常情况

包含三类异常:
1. 逾期（未还/逾期归还）
2. 吊点载荷超限
3. 归还人与借出人不一致
"""

from typing import List, Dict, Optional
from datetime import date
from collections import deque

from .database import get_conn
from .utils import parse_date, is_overdue, safe_int, safe_float
from .core import get_equipment_status


OVERDUE_UNRETURNED = "overdue_unreturned"
OVERDUE_RETURNED_LATE = "overdue_returned_late"


def _fifo_match_lendings_returns(lendings: List, returns: List) -> List[Dict]:
    """FIFO 匹配同一设备的借出和归还记录

    按借出日期顺序分配归还数量，返回每条借出记录的匹配结果。

    Returns:
        list of dicts with keys:
        - lend: 原始借出记录
        - qty_matched: 已匹配归还的数量
        - matched_returns: [{'return': return_row, 'qty': 匹配数量, 'is_late': 是否逾期归还}]
        - qty_unreturned: 未归还数量
        - qty_returned_late: 逾期归还数量（逾期归还但已匹配部分）
        - latest_return_date: 最近一次归还日期
    """
    lend_sorted = sorted(lendings, key=lambda r: (r["lend_date"] or "", r["id"]))
    ret_sorted = sorted(returns, key=lambda r: (r["return_date"] or "", r["id"]))

    ret_queue = deque()
    for r in ret_sorted:
        ret_queue.append({"row": r, "remaining": safe_int(r["quantity"], 0)})

    results = []
    for lend in lend_sorted:
        lend_qty = safe_int(lend["quantity"], 0)
        due_date_str = lend["due_date"] or ""
        remaining_to_match = lend_qty
        matched_returns = []
        qty_late = 0
        latest_ret_date = ""

        while remaining_to_match > 0 and ret_queue:
            head = ret_queue[0]
            take = min(remaining_to_match, head["remaining"])
            if take <= 0:
                ret_queue.popleft()
                continue

            ret_row = head["row"]
            ret_date_str = ret_row["return_date"] or ""
            is_late = bool(ret_date_str) and is_overdue(due_date_str, ret_date_str, None)

            matched_returns.append({
                "return": dict(ret_row),
                "qty": take,
                "is_late": is_late,
                "return_date": ret_date_str,
            })

            if is_late:
                qty_late += take
            if ret_date_str and ret_date_str > latest_ret_date:
                latest_ret_date = ret_date_str

            remaining_to_match -= take
            head["remaining"] -= take
            if head["remaining"] <= 0:
                ret_queue.popleft()

        results.append({
            "lend": dict(lend),
            "qty_matched": lend_qty - remaining_to_match,
            "matched_returns": matched_returns,
            "qty_unreturned": remaining_to_match,
            "qty_returned_late": qty_late,
            "latest_return_date": latest_ret_date,
        })

    return results


def audit_overdue(db_path: Optional[str] = None, reference_date: date = None) -> List[Dict]:
    """检查逾期设备

    按设备编号用 FIFO 算法匹配借出和归还，区分：
    - overdue_unreturned: 真正逾期未还（到参考日期仍未归还的部分）
    - overdue_returned_late: 已归还但超期归还的部分

    Args:
        db_path: 数据库路径
        reference_date: 参考日期

    Returns:
        每条逾期明细，包含 type 字段区分类型
    """
    ref_date = reference_date or date.today()
    results = []

    with get_conn(db_path) as conn:
        lend_rows = conn.execute("""
            SELECT lr.*, e.name as equip_name, s.file_path as source_file
            FROM lending_records lr
            LEFT JOIN equipments e ON lr.equipment_no = e.equipment_no
            LEFT JOIN import_sources s ON lr.source_id = s.id
            WHERE lr.due_date IS NOT NULL AND lr.due_date != ''
            ORDER BY lr.due_date ASC
        """).fetchall()

        return_rows = conn.execute("""
            SELECT rr.*, s.file_path as source_file
            FROM return_records rr
            LEFT JOIN import_sources s ON rr.source_id = s.id
            ORDER BY rr.return_date ASC, rr.id ASC
        """).fetchall()

    lend_by_equip: Dict[str, List] = {}
    for l in lend_rows:
        eq = l["equipment_no"]
        if eq not in lend_by_equip:
            lend_by_equip[eq] = []
        lend_by_equip[eq].append(l)

    return_by_equip: Dict[str, List] = {}
    for r in return_rows:
        eq = r["equipment_no"]
        if eq not in return_by_equip:
            return_by_equip[eq] = []
        return_by_equip[eq].append(r)

    all_equips = set(lend_by_equip.keys())

    for equip_no in sorted(all_equips):
        lends = lend_by_equip.get(equip_no, [])
        rets = return_by_equip.get(equip_no, [])

        matched = _fifo_match_lendings_returns(lends, rets)

        for m in matched:
            lend = m["lend"]
            due_date_str = lend["due_date"] or ""
            lend_qty = safe_int(lend["quantity"], 0)
            equip_name = lend["equip_name"] or ""

            qty_unreturned = m["qty_unreturned"]
            qty_late = m["qty_returned_late"]
            latest_ret = m["latest_return_date"]

            unreturned_is_overdue = qty_unreturned > 0 and is_overdue(due_date_str, None, ref_date)
            has_late_returns = qty_late > 0

            if unreturned_is_overdue:
                results.append({
                    "equipment_no": equip_no,
                    "equipment_name": equip_name,
                    "quantity_lent": lend_qty,
                    "quantity_returned": m["qty_matched"],
                    "quantity_overdue": qty_unreturned,
                    "borrower": lend["borrower"] or "",
                    "lender": lend["lender"] or "",
                    "lend_date": lend["lend_date"] or "",
                    "due_date": due_date_str,
                    "latest_return_date": latest_ret,
                    "purpose": lend["purpose"] or "",
                    "location": lend["location"] or "",
                    "source_file": lend["source_file"] or "",
                    "source_line_no": lend["source_line_no"],
                    "type": OVERDUE_UNRETURNED,
                })

            if has_late_returns:
                results.append({
                    "equipment_no": equip_no,
                    "equipment_name": equip_name,
                    "quantity_lent": lend_qty,
                    "quantity_returned": m["qty_matched"],
                    "quantity_overdue": qty_late,
                    "borrower": lend["borrower"] or "",
                    "lender": lend["lender"] or "",
                    "lend_date": lend["lend_date"] or "",
                    "due_date": due_date_str,
                    "latest_return_date": latest_ret,
                    "purpose": lend["purpose"] or "",
                    "location": lend["location"] or "",
                    "source_file": lend["source_file"] or "",
                    "source_line_no": lend["source_line_no"],
                    "type": OVERDUE_RETURNED_LATE,
                })

    return sorted(results, key=lambda x: (x["due_date"], x["equipment_no"]))


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
    overdue_unreturned = [o for o in audit_result["overdue"] if o["type"] == OVERDUE_UNRETURNED]
    overdue_returned_late = [o for o in audit_result["overdue"] if o["type"] == OVERDUE_RETURNED_LATE]
    return {
        "overdue_count": len(audit_result["overdue"]),
        "overdue_unreturned_count": len(overdue_unreturned),
        "overdue_returned_late_count": len(overdue_returned_late),
        "hoist_overload_count": len(audit_result["hoist_overload"]),
        "person_mismatch_count": len(audit_result["person_mismatch"]),
        "total_issues": (
            len(audit_result["overdue"])
            + len(audit_result["hoist_overload"])
            + len(audit_result["person_mismatch"])
        ),
    }
