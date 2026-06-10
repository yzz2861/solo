"""复核模块 - 设备归还复核功能

查看待复核、已复核的设备，支持按批次、人员筛选。
"""

from typing import List, Dict, Optional

from .database import get_conn
from .utils import safe_int


def get_unverified_returns(db_path: Optional[str] = None) -> List[Dict]:
    """获取待复核的归还记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT rr.*, e.name as equip_name, s.file_path as source_file
            FROM return_records rr
            LEFT JOIN equipments e ON rr.equipment_no = e.equipment_no
            LEFT JOIN import_sources s ON rr.source_id = s.id
            WHERE rr.verified = 0
            ORDER BY rr.return_date ASC, rr.equipment_no ASC
        """).fetchall()

    return [dict(r) for r in rows]


def get_verified_returns(db_path: Optional[str] = None) -> List[Dict]:
    """获取已复核的归还记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT rr.*, e.name as equip_name, s.file_path as source_file
            FROM return_records rr
            LEFT JOIN equipments e ON rr.equipment_no = e.equipment_no
            LEFT JOIN import_sources s ON rr.source_id = s.id
            WHERE rr.verified = 1
            ORDER BY rr.return_date DESC, rr.equipment_no ASC
        """).fetchall()

    return [dict(r) for r in rows]


def mark_verified(record_id: int, db_path: Optional[str] = None) -> bool:
    """标记单条归还记录为已复核"""
    with get_conn(db_path) as conn:
        cur = conn.execute(
            "UPDATE return_records SET verified = 1 WHERE id = ? AND verified = 0",
            (record_id,)
        )
        return cur.rowcount > 0


def mark_all_verified_by_equipment(equipment_no: str, db_path: Optional[str] = None) -> int:
    """按设备编号标记所有未复核记录为已复核"""
    with get_conn(db_path) as conn:
        cur = conn.execute(
            "UPDATE return_records SET verified = 1 WHERE equipment_no = ? AND verified = 0",
            (equipment_no,)
        )
        return cur.rowcount


def get_review_summary(db_path: Optional[str] = None) -> Dict:
    """获取复核摘要统计"""
    with get_conn(db_path) as conn:
        total_returns = conn.execute(
            "SELECT COUNT(*) as cnt FROM return_records"
        ).fetchone()["cnt"]

        unverified = conn.execute(
            "SELECT COUNT(*) as cnt FROM return_records WHERE verified = 0"
        ).fetchone()["cnt"]

        verified = conn.execute(
            "SELECT COUNT(*) as cnt FROM return_records WHERE verified = 1"
        ).fetchone()["cnt"]

        unverified_qty = conn.execute(
            "SELECT COALESCE(SUM(quantity), 0) as qty FROM return_records WHERE verified = 0"
        ).fetchone()["qty"]

        verified_qty = conn.execute(
            "SELECT COALESCE(SUM(quantity), 0) as qty FROM return_records WHERE verified = 1"
        ).fetchone()["qty"]

    return {
        "total_return_records": total_returns,
        "unverified_records": unverified,
        "verified_records": verified,
        "unverified_quantity": unverified_qty,
        "verified_quantity": verified_qty,
    }


def get_returns_by_person(person_name: str, db_path: Optional[str] = None) -> Dict:
    """按人员查询归还记录（归还人或复核人）"""
    with get_conn(db_path) as conn:
        as_returner = conn.execute("""
            SELECT rr.*, e.name as equip_name
            FROM return_records rr
            LEFT JOIN equipments e ON rr.equipment_no = e.equipment_no
            WHERE rr.returner LIKE ?
            ORDER BY rr.return_date DESC
        """, (f"%{person_name}%",)).fetchall()

        as_verifier = conn.execute("""
            SELECT rr.*, e.name as equip_name
            FROM return_records rr
            LEFT JOIN equipments e ON rr.equipment_no = e.equipment_no
            WHERE rr.verifier LIKE ?
            ORDER BY rr.return_date DESC
        """, (f"%{person_name}%",)).fetchall()

    return {
        "as_returner": [dict(r) for r in as_returner],
        "as_verifier": [dict(r) for r in as_verifier],
    }
