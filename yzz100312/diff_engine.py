from datetime import datetime
from db import get_conn, get_latest_batch_id


def _parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y/%m/%d", "%Y/%m/%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


def compute_diff(stock_batch_id=None, stocktake_batch_id=None, transfer_batch_id=None,
                 store_code=None, filters=None):
    """
    按门店+SKU串联账面、实盘、调拨、复核状态，计算差异。
    filters: dict, 支持 negative_stock, late_transfer, review_modified, has_diff
    """
    if stock_batch_id is None:
        stock_batch_id = get_latest_batch_id("stock")
    if stocktake_batch_id is None:
        stocktake_batch_id = get_latest_batch_id("stocktake")
    if transfer_batch_id is None:
        transfer_batch_id = get_latest_batch_id("transfer")

    if not stock_batch_id and not stocktake_batch_id:
        return []

    conn = get_conn()

    sql_parts = []
    params = []

    sql_parts.append("""
        SELECT
            u.store_code,
            u.sku_code,
            COALESCE(s.sku_name, '') AS sku_name,
            COALESCE(s.book_qty, 0) AS book_qty,
            COALESCE(t.actual_qty, 0) AS actual_qty,
            COALESCE(trans.transfer_in_qty, 0) AS transfer_in_qty,
            COALESCE(trans.transfer_out_qty, 0) AS transfer_out_qty,
            COALESCE(trans.transfer_in_qty, 0) - COALESCE(trans.transfer_out_qty, 0) AS net_transfer_qty,
            (COALESCE(t.actual_qty, 0) - COALESCE(s.book_qty, 0) 
             - (COALESCE(trans.transfer_in_qty, 0) - COALESCE(trans.transfer_out_qty, 0))) AS diff_qty,
            r.review_opinion,
            r.reviewer,
            r.review_time,
            r.is_modified,
            r.original_opinion,
            s.ledger_date,
            t.scan_time,
            trans.max_transfer_time,
            trans.min_transfer_time,
            trans.max_arrive_time,
            trans.min_arrive_time
        FROM (
            SELECT store_code, sku_code FROM stock_ledger WHERE batch_id = ?
            UNION
            SELECT store_code, sku_code FROM stocktake_scan WHERE batch_id = ?
        ) u
        LEFT JOIN stock_ledger s 
            ON u.store_code = s.store_code AND u.sku_code = s.sku_code AND s.batch_id = ?
        LEFT JOIN stocktake_scan t 
            ON u.store_code = t.store_code AND u.sku_code = t.sku_code AND t.batch_id = ?
        LEFT JOIN review_record r 
            ON u.store_code = r.store_code AND u.sku_code = r.sku_code
        LEFT JOIN (
            SELECT store_code, sku_code,
                   SUM(transfer_in_qty) AS transfer_in_qty,
                   SUM(transfer_out_qty) AS transfer_out_qty,
                   MAX(max_transfer_time) AS max_transfer_time,
                   MIN(min_transfer_time) AS min_transfer_time,
                   MAX(max_arrive_time) AS max_arrive_time,
                   MIN(min_arrive_time) AS min_arrive_time
            FROM (
                SELECT 
                    to_store AS store_code, 
                    sku_code, 
                    SUM(transfer_qty) AS transfer_in_qty,
                    0 AS transfer_out_qty,
                    MAX(transfer_time) AS max_transfer_time,
                    MIN(transfer_time) AS min_transfer_time,
                    MAX(arrive_time) AS max_arrive_time,
                    MIN(arrive_time) AS min_arrive_time
                FROM transfer
                WHERE batch_id = ?
                GROUP BY to_store, sku_code
                UNION ALL
                SELECT 
                    from_store AS store_code, 
                    sku_code, 
                    0 AS transfer_in_qty,
                    SUM(transfer_qty) AS transfer_out_qty,
                    MAX(transfer_time) AS max_transfer_time,
                    MIN(transfer_time) AS min_transfer_time,
                    NULL AS max_arrive_time,
                    NULL AS min_arrive_time
                FROM transfer
                WHERE batch_id = ? AND from_store IS NOT NULL AND from_store != ''
                GROUP BY from_store, sku_code
            ) t_inner
            GROUP BY store_code, sku_code
        ) trans ON u.store_code = trans.store_code AND u.sku_code = trans.sku_code
    """)
    params.extend([
        stock_batch_id if stock_batch_id else 0,
        stocktake_batch_id if stocktake_batch_id else 0,
        stock_batch_id if stock_batch_id else 0,
        stocktake_batch_id if stocktake_batch_id else 0,
        transfer_batch_id if transfer_batch_id else 0,
        transfer_batch_id if transfer_batch_id else 0,
    ])

    where_clauses = []
    if store_code:
        where_clauses.append("u.store_code = ?")
        params.append(store_code)

    if where_clauses:
        sql_parts.append("WHERE " + " AND ".join(where_clauses))

    sql_parts.append("ORDER BY u.store_code, u.sku_code")

    sql = " ".join(sql_parts)

    rows = conn.execute(sql, params).fetchall()
    conn.close()

    results = []
    for row in rows:
        item = dict(row)

        item["has_diff"] = abs(item.get("diff_qty") or 0) > 0.001
        item["negative_stock"] = (item.get("book_qty") or 0) < 0

        scan_time = _parse_date(item.get("scan_time"))
        max_transfer_time = _parse_date(item.get("max_transfer_time"))
        max_arrive_time = _parse_date(item.get("max_arrive_time"))

        item["late_ship_transfer"] = False
        if scan_time and max_transfer_time:
            item["late_ship_transfer"] = max_transfer_time > scan_time

        item["late_transfer"] = False
        if scan_time and max_arrive_time:
            item["late_transfer"] = max_arrive_time > scan_time
        elif scan_time and max_transfer_time and not max_arrive_time:
            item["late_transfer"] = max_transfer_time > scan_time

        item["review_modified"] = bool(item.get("is_modified", 0))

        if filters:
            if filters.get("negative_stock") and not item["negative_stock"]:
                continue
            if filters.get("late_transfer") and not item["late_transfer"]:
                continue
            if filters.get("late_ship_transfer") and not item["late_ship_transfer"]:
                continue
            if filters.get("review_modified") and not item["review_modified"]:
                continue
            if filters.get("has_diff") and not item["has_diff"]:
                continue
            if filters.get("no_review") and item.get("review_opinion"):
                continue

        results.append(item)

    return results


def save_review(store_code, sku_code, opinion, reviewer="督导"):
    """保存复核意见，如果已有则标记为已修改"""
    conn = get_conn()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    existing = conn.execute(
        "SELECT * FROM review_record WHERE store_code = ? AND sku_code = ?",
        (store_code, sku_code)
    ).fetchone()

    if existing:
        old_opinion = existing["review_opinion"]
        is_modified = existing["is_modified"]
        original = existing["original_opinion"]

        if old_opinion == opinion:
            conn.close()
            return {"success": True, "modified": False}

        if not is_modified and old_opinion:
            original = old_opinion

        conn.execute(
            """UPDATE review_record 
               SET review_opinion = ?, reviewer = ?, review_time = ?, 
                   is_modified = 1, original_opinion = COALESCE(?, original_opinion)
               WHERE store_code = ? AND sku_code = ?""",
            (opinion, reviewer, now, original, store_code, sku_code)
        )
        result = {"success": True, "modified": True}
    else:
        conn.execute(
            """INSERT INTO review_record 
               (store_code, sku_code, review_opinion, reviewer, review_time, is_modified, original_opinion)
               VALUES (?, ?, ?, ?, ?, 0, NULL)""",
            (store_code, sku_code, opinion, reviewer, now)
        )
        result = {"success": True, "modified": False, "new": True}

    conn.commit()
    conn.close()
    return result


def get_diff_summary(stock_batch_id=None, stocktake_batch_id=None, transfer_batch_id=None):
    """获取各门店差异汇总"""
    diffs = compute_diff(stock_batch_id, stocktake_batch_id, transfer_batch_id)

    store_summary = {}
    for d in diffs:
        store = d["store_code"]
        if store not in store_summary:
            store_summary[store] = {
                "store_code": store,
                "sku_count": 0,
                "diff_sku_count": 0,
                "total_book_qty": 0,
                "total_actual_qty": 0,
                "total_diff_qty": 0,
                "negative_stock_count": 0,
                "late_transfer_count": 0,
                "late_ship_transfer_count": 0,
                "review_modified_count": 0,
                "no_review_count": 0,
            }
        s = store_summary[store]
        s["sku_count"] += 1
        s["total_book_qty"] += d.get("book_qty") or 0
        s["total_actual_qty"] += d.get("actual_qty") or 0
        s["total_diff_qty"] += abs(d.get("diff_qty") or 0)
        if d["has_diff"]:
            s["diff_sku_count"] += 1
        if d["negative_stock"]:
            s["negative_stock_count"] += 1
        if d["late_transfer"]:
            s["late_transfer_count"] += 1
        if d["late_ship_transfer"]:
            s["late_ship_transfer_count"] += 1
        if d["review_modified"]:
            s["review_modified_count"] += 1
        if not d.get("review_opinion") and d["has_diff"]:
            s["no_review_count"] += 1

    return sorted(store_summary.values(), key=lambda x: x["store_code"])


def export_store_report(store_code, output_path, stock_batch_id=None, stocktake_batch_id=None, transfer_batch_id=None):
    """导出门店差异报告为CSV"""
    import csv

    diffs = compute_diff(stock_batch_id, stocktake_batch_id, transfer_batch_id, store_code=store_code)

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "门店编码", "商品编码", "商品名称",
            "账面数量", "实盘数量", "调拨入库", "调拨出库", "净调拨",
            "差异数量", "差异原因",
            "负库存", "调拨晚到(到货)", "调拨晚到(发货)", "复核被改写",
            "复核意见", "复核人", "复核时间", "原始意见",
            "最晚发货时间", "最晚到货时间", "盘点扫码时间"
        ])

        for d in diffs:
            writer.writerow([
                d["store_code"],
                d["sku_code"],
                d.get("sku_name", ""),
                d.get("book_qty", 0),
                d.get("actual_qty", 0),
                d.get("transfer_in_qty", 0),
                d.get("transfer_out_qty", 0),
                d.get("net_transfer_qty", 0),
                d.get("diff_qty", 0),
                _get_diff_reason(d),
                "是" if d["negative_stock"] else "否",
                "是" if d["late_transfer"] else "否",
                "是" if d.get("late_ship_transfer") else "否",
                "是" if d["review_modified"] else "否",
                d.get("review_opinion", "") or "",
                d.get("reviewer", "") or "",
                d.get("review_time", "") or "",
                d.get("original_opinion", "") or "",
                d.get("max_transfer_time", "") or "",
                d.get("max_arrive_time", "") or "",
                d.get("scan_time", "") or "",
            ])

    return len(diffs)


def _get_diff_reason(d):
    reasons = []
    if d["negative_stock"]:
        reasons.append("负库存")
    if d["late_transfer"]:
        reasons.append("调拨晚到")
    if not reasons and d["has_diff"]:
        reasons.append("其他差异")
    return "、".join(reasons) if reasons else "无差异"
