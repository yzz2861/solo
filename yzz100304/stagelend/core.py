"""设备状态追踪核心逻辑

按设备编号串联借出、归还、复核、停用四种状态。
使用 FIFO 算法按时间顺序匹配借出和归还记录。
"""

from typing import List, Dict, Optional, Tuple
from collections import defaultdict, deque

from .database import get_conn
from .utils import safe_int


EQUIP_STATUS_AVAILABLE = "available"
EQUIP_STATUS_LENT = "lent"
EQUIP_STATUS_RETURNED = "returned"
EQUIP_STATUS_VERIFIED = "verified"
EQUIP_STATUS_DECOMMISSIONED = "decommissioned"


DECOMMISSION_REASON_NORMAL = "normal"
DECOMMISSION_REASON_DAMAGED = "damaged"
DECOMMISSION_REASON_LOST = "lost"
DECOMMISSION_REASON_OBSOLETE = "obsolete"


def _fifo_track_equipment(lendings: List, returns: List) -> Dict:
    """FIFO 跟踪单台设备的借还状态

    Returns:
        dict: {
            total_lent, total_returned, total_verified,
            qty_in_transit: 在途未归还数量,
            qty_pending_verify: 已归还待复核数量,
            qty_verified: 已复核数量,
            has_late_return: 是否有逾期归还,
            lend_events, return_events
        }
    """
    lend_sorted = sorted(lendings, key=lambda r: (r["lend_date"] or "", r["id"]))
    ret_sorted = sorted(returns, key=lambda r: (r["return_date"] or "", r["id"]))

    total_lent = sum(safe_int(r["quantity"], 0) for r in lend_sorted)
    total_returned = sum(safe_int(r["quantity"], 0) for r in ret_sorted)
    total_verified = sum(safe_int(r["quantity"], 0) for r in ret_sorted if r["verified"])

    ret_queue = deque()
    for r in ret_sorted:
        qty = safe_int(r["quantity"], 0)
        ret_queue.append({
            "row": dict(r),
            "remaining": qty,
            "verified": bool(r["verified"]),
        })

    qty_in_transit = 0
    qty_pending_verify = 0
    qty_verified = 0
    has_late_return = False

    lend_events = []
    return_events = []

    for lend in lend_sorted:
        lend_qty = safe_int(lend["quantity"], 0)
        due_date = lend["due_date"] or ""
        remaining = lend_qty
        matches = []

        while remaining > 0 and ret_queue:
            head = ret_queue[0]
            take = min(remaining, head["remaining"])
            if take <= 0:
                ret_queue.popleft()
                continue

            ret_row = head["row"]
            ret_date = ret_row["return_date"] or ""
            is_verified = head["verified"]
            from .utils import is_overdue
            is_late = bool(ret_date) and is_overdue(due_date, ret_date, None)
            if is_late:
                has_late_return = True

            matches.append({
                "return_id": ret_row["id"],
                "qty": take,
                "return_date": ret_date,
                "returner": ret_row["returner"] or "",
                "is_verified": is_verified,
                "is_late": is_late,
            })

            if is_verified:
                qty_verified += take
            else:
                qty_pending_verify += take

            remaining -= take
            head["remaining"] -= take
            if head["remaining"] <= 0:
                ret_queue.popleft()

        if remaining > 0:
            qty_in_transit += remaining

        lend_events.append({
            "lend_id": lend["id"],
            "qty": lend_qty,
            "lend_date": lend["lend_date"] or "",
            "due_date": due_date,
            "borrower": lend["borrower"] or "",
            "lender": lend["lender"] or "",
            "qty_matched": lend_qty - remaining,
            "qty_unreturned": remaining,
            "matches": matches,
        })

    for r in ret_sorted:
        return_events.append({
            "return_id": r["id"],
            "qty": safe_int(r["quantity"], 0),
            "return_date": r["return_date"] or "",
            "returner": r["returner"] or "",
            "verified": bool(r["verified"]),
            "condition": r["condition"] if "condition" in r.keys() else "",
        })

    return {
        "total_lent": total_lent,
        "total_returned": total_returned,
        "total_verified": total_verified,
        "qty_in_transit": qty_in_transit,
        "qty_pending_verify": qty_pending_verify,
        "qty_verified": qty_verified,
        "net_lent": total_lent - total_returned,
        "has_late_return": has_late_return,
        "lend_events": lend_events,
        "return_events": return_events,
    }


def get_equipment_status(equipment_no: str, db_path: Optional[str] = None) -> Dict:
    """获取单台设备的完整状态"""
    with get_conn(db_path) as conn:
        lendings = conn.execute(
            "SELECT * FROM lending_records WHERE equipment_no = ? ORDER BY lend_date DESC, id DESC",
            (equipment_no,)
        ).fetchall()

        returns = conn.execute(
            "SELECT * FROM return_records WHERE equipment_no = ? ORDER BY return_date DESC, id DESC",
            (equipment_no,)
        ).fetchall()

        equip = conn.execute(
            "SELECT * FROM equipments WHERE equipment_no = ?",
            (equipment_no,)
        ).fetchone()

        decommission_records = conn.execute("""
            SELECT * FROM decommission_records
            WHERE equipment_no = ? AND revoked = 0
            ORDER BY decommission_date DESC, id DESC
        """, (equipment_no,)).fetchall()

    tracking = _fifo_track_equipment(lendings, returns)

    decommissioned = False
    decommission_info = None
    if equip and equip["decommissioned"]:
        decommissioned = True
    if decommission_records:
        decommissioned = True
        d = decommission_records[0]
        decommission_info = {
            "id": d["id"],
            "date": d["decommission_date"],
            "reason": d["reason"],
            "reason_detail": d["reason_detail"] or "",
            "operator": d["operator"] or "",
            "remark": d["remark"] or "",
        }

    if decommissioned:
        status = EQUIP_STATUS_DECOMMISSIONED
    elif tracking["qty_in_transit"] > 0:
        status = EQUIP_STATUS_LENT
    elif tracking["qty_pending_verify"] > 0:
        status = EQUIP_STATUS_RETURNED
    elif tracking["total_lent"] > 0 or tracking["total_returned"] > 0:
        status = EQUIP_STATUS_VERIFIED
    else:
        status = EQUIP_STATUS_AVAILABLE

    return {
        "equipment_no": equipment_no,
        "name": equip["name"] if equip else "",
        "category": equip["category"] if equip else "",
        "status": status,
        "total_lent": tracking["total_lent"],
        "total_returned": tracking["total_returned"],
        "total_verified": tracking["total_verified"],
        "qty_in_transit": tracking["qty_in_transit"],
        "qty_pending_verify": tracking["qty_pending_verify"],
        "net_lent": tracking["net_lent"],
        "has_late_return": tracking["has_late_return"],
        "decommissioned": decommissioned,
        "decommission_info": decommission_info,
        "lend_records": [dict(r) for r in lendings],
        "return_records": [dict(r) for r in returns],
        "lend_events": tracking["lend_events"],
        "return_events": tracking["return_events"],
    }


def list_all_equipments(db_path: Optional[str] = None, status_filter: str = None) -> List[Dict]:
    """列出所有设备及其状态"""
    with get_conn(db_path) as conn:
        rows = conn.execute("SELECT equipment_no FROM equipments ORDER BY equipment_no").fetchall()
        lend_rows = conn.execute(
            "SELECT DISTINCT equipment_no FROM lending_records "
            "WHERE equipment_no NOT IN (SELECT equipment_no FROM equipments)"
        ).fetchall()
        return_rows = conn.execute(
            "SELECT DISTINCT equipment_no FROM return_records "
            "WHERE equipment_no NOT IN (SELECT equipment_no FROM equipments)"
        ).fetchall()
        decom_rows = conn.execute(
            "SELECT DISTINCT equipment_no FROM decommission_records "
            "WHERE equipment_no NOT IN (SELECT equipment_no FROM equipments)"
        ).fetchall()

    all_nos = set()
    for r in rows:
        all_nos.add(r["equipment_no"])
    for r in lend_rows:
        all_nos.add(r["equipment_no"])
    for r in return_rows:
        all_nos.add(r["equipment_no"])
    for r in decom_rows:
        all_nos.add(r["equipment_no"])

    results = []
    for no in sorted(all_nos):
        status_info = get_equipment_status(no, db_path)
        if status_filter and status_info["status"] != status_filter:
            continue
        results.append(status_info)

    return results


def get_equipment_summary(db_path: Optional[str] = None) -> Dict:
    """获取设备总体统计"""
    equips = list_all_equipments(db_path)
    summary = defaultdict(int)
    for e in equips:
        summary[e["status"]] += 1
        summary["total"] += 1
        if e["decommissioned"]:
            summary["decommissioned_total"] += 1
        if e["has_late_return"]:
            summary["with_late_return"] += 1
    return dict(summary)


def decommission_equipment(
    equipment_no: str,
    decommission_date: str,
    reason: str = DECOMMISSION_REASON_NORMAL,
    reason_detail: str = "",
    operator: str = "",
    remark: str = "",
    db_path: Optional[str] = None,
) -> Tuple[bool, str]:
    """停用/报废单台设备

    Args:
        equipment_no: 设备编号
        decommission_date: 停用日期
        reason: 停用原因编码 (normal/damaged/lost/obsolete)
        reason_detail: 原因详细描述
        operator: 操作人
        remark: 备注
        db_path: 数据库路径

    Returns:
        (成功与否, 消息)
    """
    valid_reasons = {
        DECOMMISSION_REASON_NORMAL,
        DECOMMISSION_REASON_DAMAGED,
        DECOMMISSION_REASON_LOST,
        DECOMMISSION_REASON_OBSOLETE,
    }
    if reason not in valid_reasons:
        return False, f"无效的停用原因: {reason}，必须是 {valid_reasons} 之一"

    with get_conn(db_path) as conn:
        equip = conn.execute(
            "SELECT * FROM equipments WHERE equipment_no = ?",
            (equipment_no,)
        ).fetchone()

        if not equip:
            conn.execute(
                "INSERT INTO equipments (equipment_no, name, status, decommissioned) VALUES (?, ?, 'decommissioned', 1)",
                (equipment_no, equipment_no)
            )
        else:
            conn.execute(
                "UPDATE equipments SET status = 'decommissioned', decommissioned = 1 WHERE equipment_no = ?",
                (equipment_no,)
            )

        conn.execute(
            "UPDATE decommission_records SET revoked = 1 WHERE equipment_no = ? AND revoked = 0",
            (equipment_no,)
        )

        conn.execute("""
            INSERT INTO decommission_records
            (equipment_no, decommission_date, reason, reason_detail, operator, remark, revoked)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (equipment_no, decommission_date, reason, reason_detail, operator, remark))

    return True, f"设备 {equipment_no} 已标记为停用/报废"


def recommission_equipment(
    equipment_no: str,
    operator: str = "",
    remark: str = "",
    db_path: Optional[str] = None,
) -> Tuple[bool, str]:
    """恢复停用设备

    Returns:
        (成功与否, 消息)
    """
    with get_conn(db_path) as conn:
        equip = conn.execute(
            "SELECT * FROM equipments WHERE equipment_no = ?",
            (equipment_no,)
        ).fetchone()

        if not equip:
            return False, f"未找到设备: {equipment_no}"

        if not equip["decommissioned"]:
            return False, f"设备 {equipment_no} 当前未停用"

        conn.execute(
            "UPDATE equipments SET status = 'available', decommissioned = 0 WHERE equipment_no = ?",
            (equipment_no,)
        )

        conn.execute(
            "UPDATE decommission_records SET revoked = 1 WHERE equipment_no = ? AND revoked = 0",
            (equipment_no,)
        )

    return True, f"设备 {equipment_no} 已恢复为可用"


def list_decommissioned_equipments(db_path: Optional[str] = None) -> List[Dict]:
    """列出所有停用/报废的设备及其详细信息"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT dr.*, e.name as equip_name
            FROM decommission_records dr
            LEFT JOIN equipments e ON dr.equipment_no = e.equipment_no
            WHERE dr.revoked = 0
            ORDER BY dr.decommission_date DESC, dr.id DESC
        """).fetchall()

    return [dict(r) for r in rows]
