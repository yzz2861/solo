from datetime import datetime
from .storage import get_db


def add_review(equipment_id, reviewer, status, comment="", anomalies_addressed=""):
    valid_statuses = ['待复核', '通过', '驳回']
    if status not in valid_statuses:
        raise ValueError(f"复核状态必须是以下之一: {', '.join(valid_statuses)}")

    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO reviews (equipment_id, reviewer, review_status, review_comment, review_time, anomalies_addressed)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (equipment_id, reviewer, status, comment, datetime.now(), anomalies_addressed))
        return c.lastrowid


def get_reviews(equipment_id=None, status=None, limit=None):
    with get_db() as conn:
        c = conn.cursor()
        query = "SELECT * FROM reviews"
        conditions = []
        params = []

        if equipment_id:
            conditions.append("equipment_id = ?")
            params.append(equipment_id)
        if status:
            conditions.append("review_status = ?")
            params.append(status)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY review_time DESC"

        if limit:
            query += f" LIMIT {int(limit)}"

        c.execute(query, params)
        return [dict(row) for row in c.fetchall()]


def get_review_summary():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT
                review_status, COUNT(*) as count
            FROM reviews r1
            WHERE id = (
                SELECT MAX(id) FROM reviews r2 WHERE r2.equipment_id = r1.equipment_id
            )
            GROUP BY review_status
        """)
        return [dict(row) for row in c.fetchall()]


def get_pending_reviews():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT r.* FROM reviews r
            INNER JOIN (
                SELECT equipment_id, MAX(id) as latest_id
                FROM reviews
                GROUP BY equipment_id
            ) latest ON r.id = latest.latest_id
            WHERE r.review_status = '待复核'
            ORDER BY r.review_time DESC
        """)
        return [dict(row) for row in c.fetchall()]
