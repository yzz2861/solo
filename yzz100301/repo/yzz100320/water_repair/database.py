"""SQLite 数据持久化层"""
import sqlite3
import hashlib
import os
from contextlib import contextmanager
from typing import Optional

DB_FILENAME = "water_repair.db"


def get_db_path(db_path: Optional[str] = None) -> str:
    return db_path or os.path.join(os.getcwd(), DB_FILENAME)


@contextmanager
def get_conn(db_path: Optional[str] = None):
    path = get_db_path(db_path)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[str] = None):
    with get_conn(db_path) as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS import_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_hash TEXT UNIQUE NOT NULL,
            source_type TEXT NOT NULL,
            source_file TEXT NOT NULL,
            record_count INTEGER NOT NULL,
            imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS repair_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            source_row INTEGER NOT NULL,
            order_no TEXT NOT NULL,
            order_type TEXT,
            fault_address TEXT,
            report_time TEXT,
            dispatch_time TEXT,
            repair_team TEXT,
            status TEXT,
            remark TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id),
            UNIQUE(batch_id, order_no)
        );
        CREATE INDEX IF NOT EXISTS idx_repair_order_no ON repair_orders(order_no);

        CREATE TABLE IF NOT EXISTS outage_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            source_row INTEGER NOT NULL,
            order_no TEXT NOT NULL,
            community_name TEXT NOT NULL,
            building_no TEXT,
            outage_start_time TEXT,
            outage_end_time TEXT,
            affected_households INTEGER,
            contact_person TEXT,
            contact_phone TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id)
        );
        CREATE INDEX IF NOT EXISTS idx_outage_order_no ON outage_areas(order_no);
        CREATE INDEX IF NOT EXISTS idx_outage_community ON outage_areas(community_name);

        CREATE TABLE IF NOT EXISTS sms_receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            source_row INTEGER NOT NULL,
            order_no TEXT,
            community_name TEXT,
            phone_number TEXT,
            send_time TEXT,
            receive_time TEXT,
            status TEXT,
            fail_reason TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id)
        );
        CREATE INDEX IF NOT EXISTS idx_sms_order_no ON sms_receipts(order_no);
        CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_receipts(phone_number);
        """)


def compute_file_hash(file_content: bytes) -> str:
    return hashlib.md5(file_content).hexdigest()


def is_batch_imported(batch_hash: str, db_path: Optional[str] = None) -> bool:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT id FROM import_batches WHERE batch_hash = ?",
            (batch_hash,)
        ).fetchone()
        return row is not None


def create_batch(batch_hash: str, source_type: str, source_file: str,
                 record_count: int, db_path: Optional[str] = None) -> int:
    with get_conn(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO import_batches
               (batch_hash, source_type, source_file, record_count)
               VALUES (?, ?, ?, ?)""",
            (batch_hash, source_type, source_file, record_count)
        )
        return cur.lastrowid
