from datetime import datetime, date
from database import get_connection


def get_all_tools(status_filter=None, keyword=""):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT t.*,
               (SELECT borrower FROM borrow_records b
                WHERE b.tool_no = t.tool_no AND b.status = 'borrowed'
                ORDER BY b.borrow_date DESC LIMIT 1) as current_borrower,
               (SELECT borrow_date FROM borrow_records b
                WHERE b.tool_no = t.tool_no AND b.status = 'borrowed'
                ORDER BY b.borrow_date DESC LIMIT 1) as current_borrow_date,
               (SELECT expected_return_date FROM borrow_records b
                WHERE b.tool_no = t.tool_no AND b.status = 'borrowed'
                ORDER BY b.borrow_date DESC LIMIT 1) as expected_return_date
        FROM tools t
        WHERE 1=1
    """
    params = []

    if status_filter and status_filter != "all":
        query += " AND t.status = ?"
        params.append(status_filter)

    if keyword:
        query += " AND (t.tool_no LIKE ? OR t.tool_name LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%"])

    query += " ORDER BY t.tool_no"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_tool_detail(tool_no):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tools WHERE tool_no = ?", (tool_no,))
    tool = cursor.fetchone()

    cursor.execute("""
        SELECT * FROM borrow_records
        WHERE tool_no = ?
        ORDER BY borrow_date DESC, id DESC
    """, (tool_no,))
    borrow_records = cursor.fetchall()

    cursor.execute("""
        SELECT * FROM return_records
        WHERE tool_no = ?
        ORDER BY return_date DESC, id DESC
    """, (tool_no,))
    return_records = cursor.fetchall()

    cursor.execute("""
        SELECT * FROM reviews
        WHERE tool_no = ?
        ORDER BY updated_at DESC
    """, (tool_no,))
    reviews = cursor.fetchall()

    conn.close()

    return {
        "tool": dict(tool) if tool else None,
        "borrow_records": [dict(r) for r in borrow_records],
        "return_records": [dict(r) for r in return_records],
        "reviews": [dict(r) for r in reviews],
    }


def get_overdue_tools():
    conn = get_connection()
    cursor = conn.cursor()

    today = date.today().isoformat()
    cursor.execute("""
        SELECT b.*, t.tool_name, t.calibration_expiry
        FROM borrow_records b
        JOIN tools t ON b.tool_no = t.tool_no
        WHERE b.status = 'borrowed'
          AND b.expected_return_date IS NOT NULL
          AND b.expected_return_date < ?
        ORDER BY b.expected_return_date ASC
    """, (today,))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_calibration_expiring_tools(days_threshold=30):
    conn = get_connection()
    cursor = conn.cursor()

    from datetime import timedelta
    threshold_date = (date.today() + timedelta(days=days_threshold)).isoformat()
    today = date.today().isoformat()

    cursor.execute("""
        SELECT * FROM tools
        WHERE calibration_expiry IS NOT NULL
          AND calibration_expiry != ''
          AND calibration_expiry <= ?
        ORDER BY calibration_expiry ASC
    """, (threshold_date,))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        d = dict(row)
        expiry = d.get("calibration_expiry", "")
        is_expired = expiry and expiry < today
        d["is_expired"] = is_expired
        result.append(d)

    return result


def get_returner_mismatch_tools():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.id as return_id, r.tool_no, r.returner, r.return_date,
               b.id as borrow_id, b.borrower, b.borrow_date,
               t.tool_name
        FROM return_records r
        JOIN borrow_records b ON r.borrow_id = b.id
        JOIN tools t ON r.tool_no = t.tool_no
        WHERE r.returner != b.borrower
          AND r.borrow_id IS NOT NULL
        ORDER BY r.return_date DESC
    """)

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_handover_summary():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as cnt FROM tools")
    total_tools = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM tools WHERE status='borrowed'")
    borrowed_count = cursor.fetchone()["cnt"]

    cursor.execute("SELECT COUNT(*) as cnt FROM tools WHERE status='returned'")
    returned_count = cursor.fetchone()["cnt"]

    today = date.today().isoformat()
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM borrow_records
        WHERE status = 'borrowed'
          AND expected_return_date IS NOT NULL
          AND expected_return_date < ?
    """, (today,))
    overdue_count = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) as cnt FROM tools
        WHERE calibration_expiry IS NOT NULL
          AND calibration_expiry != ''
          AND calibration_expiry < ?
    """, (today,))
    cal_expired_count = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) as cnt FROM return_records r
        JOIN borrow_records b ON r.borrow_id = b.id
        WHERE r.returner != b.borrower
          AND r.borrow_id IS NOT NULL
    """)
    mismatch_count = cursor.fetchone()["cnt"]

    cursor.execute("""
        SELECT COUNT(*) as cnt FROM reviews
        WHERE review_opinion IS NULL OR review_opinion = ''
    """)
    pending_review_count = cursor.fetchone()["cnt"]

    conn.close()

    return {
        "total_tools": total_tools,
        "borrowed_count": borrowed_count,
        "returned_count": returned_count,
        "in_stock_count": total_tools - borrowed_count - returned_count,
        "overdue_count": overdue_count,
        "cal_expired_count": cal_expired_count,
        "mismatch_count": mismatch_count,
        "pending_review_count": pending_review_count,
    }


def save_review(tool_no, borrow_id, return_id, review_opinion, reviewer="", is_sealed=False, sealed_by=""):
    conn = get_connection()
    cursor = conn.cursor()

    today = date.today().isoformat()

    cursor.execute("""
        SELECT id FROM reviews
        WHERE tool_no = ? AND borrow_id = ? AND return_id = ?
        ORDER BY id DESC LIMIT 1
    """, (tool_no, borrow_id, return_id))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE reviews SET review_opinion=?, reviewer=?, review_date=?,
            is_sealed=?, sealed_by=?, sealed_date=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        """, (review_opinion, reviewer, today, 1 if is_sealed else 0,
              sealed_by if is_sealed else None, today if is_sealed else None,
              existing["id"]))
    else:
        cursor.execute("""
            INSERT INTO reviews (tool_no, borrow_id, return_id, review_opinion,
            reviewer, review_date, is_sealed, sealed_by, sealed_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tool_no, borrow_id, return_id, review_opinion, reviewer, today,
              1 if is_sealed else 0, sealed_by if is_sealed else None,
              today if is_sealed else None))

    if is_sealed:
        cursor.execute("""
            UPDATE tools SET status='sealed', updated_at=CURRENT_TIMESTAMP
            WHERE tool_no=?
        """, (tool_no,))

    conn.commit()
    conn.close()
    return True


def get_pending_reviews():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT rv.*, t.tool_name, b.borrower, b.borrow_date,
               r.returner, r.return_date, r.return_photo_path
        FROM reviews rv
        JOIN tools t ON rv.tool_no = t.tool_no
        LEFT JOIN borrow_records b ON rv.borrow_id = b.id
        LEFT JOIN return_records r ON rv.return_id = r.id
        WHERE rv.review_opinion IS NULL OR rv.review_opinion = ''
        ORDER BY rv.created_at DESC
    """)

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
