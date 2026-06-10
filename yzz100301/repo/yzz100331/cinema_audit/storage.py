import sqlite3
import os
from contextlib import contextmanager
from typing import Optional

DB_PATH = os.path.expanduser("~/.cinema_audit/cinema_audit.db")


def init_db(db_path: str = DB_PATH) -> None:
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        show_id TEXT NOT NULL UNIQUE,
        film_name TEXT NOT NULL,
        show_time TEXT NOT NULL,
        hall TEXT,
        price REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'normal',
        source_hash TEXT NOT NULL,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_schedules_show_id ON schedules(show_id);

    CREATE TABLE IF NOT EXISTS ticket_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL UNIQUE,
        show_id TEXT NOT NULL,
        seat_no TEXT,
        amount REAL NOT NULL DEFAULT 0,
        sale_time TEXT,
        source_hash TEXT NOT NULL,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sales_order_id ON ticket_sales(order_id);
    CREATE INDEX IF NOT EXISTS idx_sales_show_id ON ticket_sales(show_id);

    CREATE TABLE IF NOT EXISTS refunds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        refund_id TEXT NOT NULL UNIQUE,
        order_id TEXT NOT NULL,
        refund_amount REAL NOT NULL DEFAULT 0,
        refund_time TEXT,
        source_hash TEXT NOT NULL,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
    CREATE INDEX IF NOT EXISTS idx_refunds_refund_id ON refunds(refund_id);

    CREATE TABLE IF NOT EXISTS import_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_hash TEXT NOT NULL UNIQUE,
        source_type TEXT NOT NULL,
        source_file TEXT,
        record_count INTEGER NOT NULL DEFAULT 0,
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)
    conn.commit()
    conn.close()


@contextmanager
def get_conn(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def batch_exists(source_hash: str, db_path: str = DB_PATH) -> bool:
    with get_conn(db_path) as conn:
        cur = conn.execute(
            "SELECT 1 FROM import_batches WHERE source_hash = ?",
            (source_hash,),
        )
        return cur.fetchone() is not None


def record_batch(
    source_hash: str,
    source_type: str,
    source_file: Optional[str],
    record_count: int,
    db_path: str = DB_PATH,
) -> None:
    with get_conn(db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO import_batches (source_hash, source_type, source_file, record_count) VALUES (?, ?, ?, ?)",
            (source_hash, source_type, source_file, record_count),
        )
