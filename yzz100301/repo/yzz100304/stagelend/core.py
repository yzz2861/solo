"""设备状态追踪核心逻辑

按设备编号串联借出、归还、复核、停用四种状态。
"""

from typing import List, Dict, Optional
from collections import defaultdict

from .database import get_conn
from .utils import safe_int


EQUIP_STATUS_AVAILABLE = "available"
EQUIP_STATUS_LENT = "lent"
EQUIP_STATUS_RETURNED = "returned"
EQUIP_STATUS_VERIFIED = "verified"
EQUIP_STATUS_DECOMMISSIONED = "decommissioned"


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

    total_lent = sum(safe_int(r["quantity"], 0) for r in lendings)
    total_returned = sum(safe_int(r["quantity"], 0) for r in returns)
    total_verified = sum(safe_int(r["quantity"], 0) for r in returns if r["verified"])
    net_lent = total_lent - total_returned

    if equip and equip["decommissioned"]:
        status = EQUIP_STATUS_DECOMMISSIONED
    elif net_lent <= 0 and total_returned > 0:
        if total_verified >= total_returned:
            status = EQUIP_STATUS_VERIFIED
        else:
            status = EQUIP_STATUS_RETURNED
    else:
        status = EQUIP_STATUS_LENT

    return {
        "equipment_no": equipment_no,
        "name": equip["name"] if equip else "",
        "status": status,
        "total_lent": total_lent,
        "total_returned": total_returned,
        "total_verified": total_verified,
        "net_lent": net_lent,
        "lend_records": [dict(r) for r in lendings],
        "return_records": [dict(r) for r in returns],
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

    all_nos = set()
    for r in rows:
        all_nos.add(r["equipment_no"])
    for r in lend_rows:
        all_nos.add(r["equipment_no"])
    for r in return_rows:
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
    return dict(summary)
