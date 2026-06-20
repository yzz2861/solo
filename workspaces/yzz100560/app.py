from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import sqlite3
import json
import os

DB_PATH = os.environ.get("PHARMACY_DB", "pharmacy.db")

app = FastAPI(title="药房处方调配叫号API", version="1.0.0")


class PrescriptionCreate(BaseModel):
    prescription_id: str = Field(..., description="处方编号")
    patient_id: str = Field(..., description="患者ID")
    patient_name: str = Field(..., description="患者姓名")
    doctor_id: str = Field(..., description="开方医生ID")
    doctor_name: str = Field(..., description="开方医生姓名")
    items: List[dict] = Field(default_factory=list, description="药品明细")
    window_no: Optional[str] = Field(None, description="取药窗口号")


class PrescriptionDispense(BaseModel):
    pharmacist_id: str = Field(..., description="调配药师ID")
    pharmacist_name: str = Field(..., description="调配药师姓名")


class PrescriptionReview(BaseModel):
    reviewer_id: str = Field(..., description="复核药师ID")
    reviewer_name: str = Field(..., description="复核药师姓名")


class PrescriptionReturn(BaseModel):
    return_reason: str = Field(..., min_length=1, description="退回原因")


class CallRequest(BaseModel):
    window_no: str = Field(..., description="叫号窗口号")


class PickupConfirm(BaseModel):
    pickup_by: str = Field(..., description="取药人")


class MissedCallRecord(BaseModel):
    pass


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS prescription (
        prescription_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        items TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT '调配中',
        window_no TEXT,
        dispensing_pharmacist_id TEXT,
        dispensing_pharmacist_name TEXT,
        reviewer_id TEXT,
        reviewer_name TEXT,
        return_reason TEXT,
        call_count INTEGER NOT NULL DEFAULT 0,
        pickup_by TEXT,
        created_at TEXT NOT NULL,
        dispensing_at TEXT,
        reviewed_at TEXT,
        called_at TEXT,
        pickup_at TEXT,
        returned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS call_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id TEXT NOT NULL,
        window_no TEXT NOT NULL,
        call_result TEXT NOT NULL DEFAULT '已叫号',
        called_at TEXT NOT NULL,
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id)
    );

    CREATE TABLE IF NOT EXISTS missed_call (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id TEXT NOT NULL,
        window_no TEXT NOT NULL,
        missed_at TEXT NOT NULL,
        recalled INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (prescription_id) REFERENCES prescription(prescription_id)
    );
    """)
    conn.commit()
    conn.close()


VALID_STATUSES = {"调配中", "已复核", "待取药", "已取药", "退回修改"}

TRANSITIONS = {
    "调配中": {"已复核"},
    "已复核": {"待取药", "退回修改"},
    "待取药": {"已取药", "退回修改"},
    "已取药": set(),
    "退回修改": set(),
}


@app.on_event("startup")
def startup():
    init_db()


@app.post("/prescriptions", summary="接收处方，进入调配状态")
def create_prescription(req: PrescriptionCreate):
    conn = get_db()
    try:
        now = datetime.now().isoformat()
        conn.execute(
            """INSERT INTO prescription
            (prescription_id, patient_id, patient_name, doctor_id, doctor_name,
             items, status, window_no, created_at)
            VALUES (?, ?, ?, ?, ?, ?, '调配中', ?, ?)""",
            (req.prescription_id, req.patient_id, req.patient_name,
             req.doctor_id, req.doctor_name, json.dumps(req.items, ensure_ascii=False),
             req.window_no, now)
        )
        conn.commit()
        return {"prescription_id": req.prescription_id, "status": "调配中", "created_at": now}
    except sqlite3.IntegrityError:
        raise HTTPException(409, f"处方 {req.prescription_id} 已存在")
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/dispense", summary="药师开始调配")
def dispense_prescription(prescription_id: str, req: PrescriptionDispense):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] != "调配中":
            raise HTTPException(400, f"当前状态为 {row['status']}，无法调配")
        now = datetime.now().isoformat()
        conn.execute(
            """UPDATE prescription
            SET dispensing_pharmacist_id=?, dispensing_pharmacist_name=?,
                dispensing_at=?
            WHERE prescription_id=?""",
            (req.pharmacist_id, req.pharmacist_name, now, prescription_id)
        )
        conn.commit()
        return {"prescription_id": prescription_id, "dispensing_pharmacist": req.pharmacist_name, "dispensing_at": now}
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/review", summary="药师复核处方")
def review_prescription(prescription_id: str, req: PrescriptionReview):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] != "调配中":
            raise HTTPException(400, f"当前状态为 {row['status']}，只有「调配中」的处方可以复核")
        now = datetime.now().isoformat()
        conn.execute(
            """UPDATE prescription
            SET status='已复核', reviewer_id=?, reviewer_name=?, reviewed_at=?
            WHERE prescription_id=?""",
            (req.reviewer_id, req.reviewer_name, now, prescription_id)
        )
        conn.commit()
        return {"prescription_id": prescription_id, "status": "已复核", "reviewer": req.reviewer_name, "reviewed_at": now}
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/call", summary="叫号取药")
def call_prescription(prescription_id: str, req: CallRequest):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status, call_count FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] not in ("已复核", "待取药"):
            raise HTTPException(400, f"当前状态为 {row['status']}，未复核处方不能叫号")
        now = datetime.now().isoformat()
        new_call_count = row["call_count"] + 1
        is_repeat = row["call_count"] > 0

        new_status = "待取药" if row["status"] == "已复核" else row["status"]

        conn.execute(
            """UPDATE prescription
            SET status=?, call_count=?, window_no=?, called_at=?
            WHERE prescription_id=?""",
            (new_status, new_call_count, req.window_no, now, prescription_id)
        )
        conn.execute(
            """INSERT INTO call_log (prescription_id, window_no, call_result, called_at)
            VALUES (?, ?, ?, ?)""",
            (prescription_id, req.window_no, "重复叫号提醒" if is_repeat else "已叫号", now)
        )
        conn.commit()
        return {
            "prescription_id": prescription_id,
            "status": new_status,
            "call_count": new_call_count,
            "is_repeat_call": is_repeat,
            "window_no": req.window_no,
            "called_at": now,
        }
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/pickup", summary="确认取药")
def pickup_prescription(prescription_id: str, req: PickupConfirm):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] != "待取药":
            raise HTTPException(400, f"当前状态为 {row['status']}，只有「待取药」可以确认取药")
        now = datetime.now().isoformat()
        conn.execute(
            """UPDATE prescription SET status='已取药', pickup_by=?, pickup_at=?
            WHERE prescription_id=?""",
            (req.pickup_by, now, prescription_id)
        )
        conn.commit()
        return {"prescription_id": prescription_id, "status": "已取药", "pickup_at": now}
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/return", summary="退回医生修改")
def return_prescription(prescription_id: str, req: PrescriptionReturn):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] not in TRANSITIONS or not TRANSITIONS[row["status"]]:
            allowed = {k for k, v in TRANSITIONS.items() if "退回修改" in v}
            raise HTTPException(400, f"当前状态为 {row['status']}，只有 {allowed} 状态可以退回修改")
        if "退回修改" not in TRANSITIONS.get(row["status"], set()):
            raise HTTPException(400, f"当前状态为 {row['status']}，不允许退回修改")
        now = datetime.now().isoformat()
        conn.execute(
            """UPDATE prescription SET status='退回修改', return_reason=?, returned_at=?
            WHERE prescription_id=?""",
            (req.return_reason, now, prescription_id)
        )
        conn.commit()
        return {"prescription_id": prescription_id, "status": "退回修改", "return_reason": req.return_reason, "returned_at": now}
    finally:
        conn.close()


@app.put("/prescriptions/{prescription_id}/missed", summary="标记错过叫号")
def mark_missed_call(prescription_id: str):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT status, window_no FROM prescription WHERE prescription_id=?",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        if row["status"] != "待取药":
            raise HTTPException(400, f"当前状态为 {row['status']}，只有「待取药」可以标记错过叫号")
        now = datetime.now().isoformat()
        conn.execute(
            """INSERT INTO missed_call (prescription_id, window_no, missed_at)
            VALUES (?, ?, ?)""",
            (prescription_id, row["window_no"], now)
        )
        conn.commit()
        return {"prescription_id": prescription_id, "missed_at": now}
    finally:
        conn.close()


@app.get("/queue/window/{window_no}", summary="窗口查看待取药队列")
def window_queue(window_no: str):
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT prescription_id, patient_name, call_count, called_at, status
            FROM prescription
            WHERE window_no=? AND status IN ('已复核', '待取药')
            ORDER BY called_at ASC NULLS LAST, created_at ASC""",
            (window_no,)
        ).fetchall()
        return {"window_no": window_no, "queue": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/prescriptions/{prescription_id}/progress", summary="患者查询处方进度")
def patient_progress(prescription_id: str):
    conn = get_db()
    try:
        row = conn.execute(
            """SELECT prescription_id, patient_name, status, window_no,
                      call_count, return_reason,
                      created_at, dispensing_at, reviewed_at, called_at, pickup_at, returned_at
            FROM prescription WHERE prescription_id=?""",
            (prescription_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "处方不存在")
        result = dict(row)
        missed = conn.execute(
            "SELECT missed_at FROM missed_call WHERE prescription_id=? ORDER BY missed_at",
            (prescription_id,)
        ).fetchall()
        result["missed_calls"] = [r["missed_at"] for r in missed]
        return result
    finally:
        conn.close()


@app.get("/stats/wait-time", summary="导出等待时长统计")
def stats_wait_time(
    start_date: Optional[str] = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="结束日期 YYYY-MM-DD"),
):
    conn = get_db()
    try:
        sql = """
        SELECT prescription_id, patient_name, status,
               created_at, dispensing_at, reviewed_at, called_at, pickup_at,
               CASE WHEN pickup_at IS NOT NULL AND created_at IS NOT NULL
                    THEN (julianday(pickup_at) - julianday(created_at)) * 24 * 60
                    ELSE NULL END AS wait_minutes
        FROM prescription
        WHERE 1=1
        """
        params = []
        if start_date:
            sql += " AND created_at >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND created_at <= ?"
            params.append(end_date + "T23:59:59")
        sql += " ORDER BY created_at DESC"
        rows = conn.execute(sql, params).fetchall()
        records = [dict(r) for r in rows]
        completed = [r for r in records if r["wait_minutes"] is not None]
        avg_wait = sum(r["wait_minutes"] for r in completed) / len(completed) if completed else 0
        max_wait = max((r["wait_minutes"] for r in completed), default=0)
        return {
            "total": len(records),
            "completed": len(completed),
            "avg_wait_minutes": round(avg_wait, 1),
            "max_wait_minutes": round(max_wait, 1),
            "records": records,
        }
    finally:
        conn.close()


@app.get("/stats/returned", summary="导出退回处方记录")
def stats_returned(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    conn = get_db()
    try:
        sql = """
        SELECT prescription_id, patient_name, doctor_name, return_reason,
               created_at, returned_at,
               CASE WHEN returned_at IS NOT NULL AND created_at IS NOT NULL
                    THEN (julianday(returned_at) - julianday(created_at)) * 24 * 60
                    ELSE NULL END AS minutes_before_return
        FROM prescription WHERE status='退回修改'
        """
        params = []
        if start_date:
            sql += " AND returned_at >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND returned_at <= ?"
            params.append(end_date + "T23:59:59")
        sql += " ORDER BY returned_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return {"total": len(rows), "records": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/stats/missed-calls", summary="导出错过叫号记录")
def stats_missed_calls(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    conn = get_db()
    try:
        sql = """
        SELECT mc.id, mc.prescription_id, mc.window_no, mc.missed_at,
               p.patient_name, p.status AS prescription_status, p.call_count
        FROM missed_call mc
        JOIN prescription p ON mc.prescription_id = p.prescription_id
        WHERE 1=1
        """
        params = []
        if start_date:
            sql += " AND mc.missed_at >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND mc.missed_at <= ?"
            params.append(end_date + "T23:59:59")
        sql += " ORDER BY mc.missed_at DESC"
        rows = conn.execute(sql, params).fetchall()
        return {"total": len(rows), "records": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/handover/returned", summary="交班查看退回修改处方")
def handover_returned():
    conn = get_db()
    try:
        rows = conn.execute(
            """SELECT prescription_id, patient_name, doctor_name, doctor_id,
                      return_reason, returned_at, window_no,
                      dispensing_pharmacist_name, reviewer_name
            FROM prescription
            WHERE status='退回修改'
            ORDER BY returned_at DESC"""
        ).fetchall()
        return {
            "message": "以下处方已退回医生修改，请向患者说明原因",
            "total": len(rows),
            "prescriptions": [dict(r) for r in rows],
        }
    finally:
        conn.close()
