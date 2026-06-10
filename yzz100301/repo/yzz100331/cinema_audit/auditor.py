from typing import List, Dict, Any
from .storage import get_conn, DB_PATH


def get_schedule_summary(db_path: str = DB_PATH) -> Dict[str, Any]:
    with get_conn(db_path) as conn:
        total = conn.execute("SELECT COUNT(*) as cnt FROM schedules").fetchone()["cnt"]
        cancelled = conn.execute(
            "SELECT COUNT(*) as cnt FROM schedules WHERE LOWER(status) IN ('cancelled', 'cancel', '取消', '已取消')"
        ).fetchone()["cnt"]
        return {
            "total_schedules": total,
            "cancelled_schedules": cancelled,
            "normal_schedules": total - cancelled,
        }


def get_sales_summary(db_path: str = DB_PATH) -> Dict[str, Any]:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total FROM ticket_sales"
        ).fetchone()
        return {
            "total_orders": row["cnt"],
            "total_sales_amount": round(row["total"], 2),
        }


def get_refund_summary(db_path: str = DB_PATH) -> Dict[str, Any]:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt, COALESCE(SUM(refund_amount), 0) as total FROM refunds"
        ).fetchone()
        return {
            "total_refunds": row["cnt"],
            "total_refund_amount": round(row["total"], 2),
        }


def find_cancelled_sales(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """查询取消场次仍有售票的记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT s.show_id, s.film_name, s.show_time, s.hall, s.status,
                   t.order_id, t.seat_no, t.amount, t.sale_time
            FROM ticket_sales t
            JOIN schedules s ON t.show_id = s.show_id
            WHERE LOWER(s.status) IN ('cancelled', 'cancel', '取消', '已取消')
            ORDER BY s.show_time, t.order_id
        """).fetchall()
        return [dict(r) for r in rows]


def find_duplicate_refunds(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """查询重复退款的订单"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT order_id, COUNT(*) as refund_count,
                   SUM(refund_amount) as total_refund_amount,
                   GROUP_CONCAT(refund_id, '; ') as refund_ids
            FROM refunds
            GROUP BY order_id
            HAVING COUNT(*) > 1
            ORDER BY refund_count DESC, order_id
        """).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            sale = conn.execute(
                "SELECT amount, show_id FROM ticket_sales WHERE order_id = ?",
                (r["order_id"],),
            ).fetchone()
            d["sale_amount"] = sale["amount"] if sale else None
            d["show_id"] = sale["show_id"] if sale else None
            results.append(d)
        return results


def find_amount_mismatch(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """查询退票金额与票价不一致的记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT r.refund_id, r.order_id, r.refund_amount, r.refund_time,
                   t.amount as ticket_amount,
                   s.price as schedule_price,
                   s.show_id, s.film_name, s.show_time, s.hall
            FROM refunds r
            JOIN ticket_sales t ON r.order_id = t.order_id
            LEFT JOIN schedules s ON t.show_id = s.show_id
            WHERE ABS(r.refund_amount - t.amount) > 0.01
            ORDER BY r.order_id
        """).fetchall()
        return [dict(r) for r in rows]


def find_sales_no_schedule(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """查询找不到对应排片的售票记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT t.order_id, t.show_id, t.seat_no, t.amount, t.sale_time
            FROM ticket_sales t
            LEFT JOIN schedules s ON t.show_id = s.show_id
            WHERE s.show_id IS NULL
            ORDER BY t.sale_time, t.order_id
        """).fetchall()
        return [dict(r) for r in rows]


def find_refunds_no_sale(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """查询找不到对应售票的退票记录"""
    with get_conn(db_path) as conn:
        rows = conn.execute("""
            SELECT r.refund_id, r.order_id, r.refund_amount, r.refund_time
            FROM refunds r
            LEFT JOIN ticket_sales t ON r.order_id = t.order_id
            WHERE t.order_id IS NULL
            ORDER BY r.refund_time, r.refund_id
        """).fetchall()
        return [dict(r) for r in rows]


def get_show_detail(show_id: str, db_path: str = DB_PATH) -> Dict[str, Any]:
    """按场次获取完整的排片、售票、退票明细"""
    with get_conn(db_path) as conn:
        schedule = conn.execute(
            "SELECT * FROM schedules WHERE show_id = ?",
            (show_id,),
        ).fetchone()

        sales = conn.execute(
            "SELECT * FROM ticket_sales WHERE show_id = ? ORDER BY sale_time, order_id",
            (show_id,),
        ).fetchall()

        sale_ids = [s["order_id"] for s in sales]
        refunds = []
        if sale_ids:
            placeholders = ",".join(["?"] * len(sale_ids))
            refunds = conn.execute(
                f"SELECT * FROM refunds WHERE order_id IN ({placeholders}) ORDER BY refund_time, refund_id",
                sale_ids,
            ).fetchall()

        sales_with_refunds = []
        refund_map = {}
        for r in refunds:
            oid = r["order_id"]
            if oid not in refund_map:
                refund_map[oid] = []
            refund_map[oid].append(dict(r))

        for s in sales:
            sd = dict(s)
            sd["refunds"] = refund_map.get(s["order_id"], [])
            sd["refund_count"] = len(sd["refunds"])
            sd["total_refunded"] = round(sum(r["refund_amount"] for r in sd["refunds"]), 2)
            sales_with_refunds.append(sd)

        return {
            "schedule": dict(schedule) if schedule else None,
            "sales": sales_with_refunds,
            "refund_count": len(refunds),
            "sale_count": len(sales),
        }


def get_order_detail(order_id: str, db_path: str = DB_PATH) -> Dict[str, Any]:
    """按订单号获取完整明细"""
    with get_conn(db_path) as conn:
        sale = conn.execute(
            "SELECT * FROM ticket_sales WHERE order_id = ?",
            (order_id,),
        ).fetchone()

        schedule = None
        if sale and sale["show_id"]:
            schedule = conn.execute(
                "SELECT * FROM schedules WHERE show_id = ?",
                (sale["show_id"],),
            ).fetchone()

        refunds = conn.execute(
            "SELECT * FROM refunds WHERE order_id = ? ORDER BY refund_time, refund_id",
            (order_id,),
        ).fetchall()

        return {
            "order_id": order_id,
            "sale": dict(sale) if sale else None,
            "schedule": dict(schedule) if schedule else None,
            "refunds": [dict(r) for r in refunds],
            "refund_count": len(refunds),
            "total_refunded": round(sum(r["refund_amount"] for r in refunds), 2),
        }


def get_all_issues(db_path: str = DB_PATH) -> Dict[str, Any]:
    """获取所有异常类型的汇总"""
    cancelled_sales = find_cancelled_sales(db_path)
    dup_refunds = find_duplicate_refunds(db_path)
    amount_mismatch = find_amount_mismatch(db_path)
    sales_no_sched = find_sales_no_schedule(db_path)
    refunds_no_sale = find_refunds_no_sale(db_path)

    return {
        "cancelled_sales": {
            "count": len(cancelled_sales),
            "records": cancelled_sales,
        },
        "duplicate_refunds": {
            "count": len(dup_refunds),
            "records": dup_refunds,
        },
        "amount_mismatch": {
            "count": len(amount_mismatch),
            "records": amount_mismatch,
        },
        "sales_no_schedule": {
            "count": len(sales_no_sched),
            "records": sales_no_sched,
        },
        "refunds_no_sale": {
            "count": len(refunds_no_sale),
            "records": refunds_no_sale,
        },
    }
