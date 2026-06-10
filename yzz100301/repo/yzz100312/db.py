import sqlite3
import hashlib
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventory_check.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS import_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_type TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            file_name TEXT,
            import_time TEXT NOT NULL,
            record_count INTEGER DEFAULT 0,
            UNIQUE(batch_type, file_hash)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS stock_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            store_code TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            sku_name TEXT,
            book_qty REAL NOT NULL,
            ledger_date TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id),
            UNIQUE(batch_id, store_code, sku_code)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS stocktake_scan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            store_code TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            actual_qty REAL NOT NULL,
            scan_time TEXT,
            scanner TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id),
            UNIQUE(batch_id, store_code, sku_code)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS transfer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            transfer_no TEXT,
            from_store TEXT,
            to_store TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            transfer_qty REAL NOT NULL,
            transfer_time TEXT,
            arrive_time TEXT,
            status TEXT,
            FOREIGN KEY (batch_id) REFERENCES import_batches(id),
            UNIQUE(batch_id, transfer_no, to_store, sku_code)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS review_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_code TEXT NOT NULL,
            sku_code TEXT NOT NULL,
            review_opinion TEXT,
            reviewer TEXT,
            review_time TEXT,
            is_modified INTEGER DEFAULT 0,
            original_opinion TEXT,
            UNIQUE(store_code, sku_code)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS store_info (
            store_code TEXT PRIMARY KEY,
            store_name TEXT
        )
    """)

    conn.commit()
    conn.close()


def compute_file_hash(content_bytes):
    return hashlib.md5(content_bytes).hexdigest()


def check_batch_exists(batch_type, file_hash):
    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM import_batches WHERE batch_type = ? AND file_hash = ?",
        (batch_type, file_hash)
    ).fetchone()
    conn.close()
    return row is not None


def create_batch(batch_type, file_hash, file_name, record_count=0):
    conn = get_conn()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor = conn.execute(
        "INSERT OR IGNORE INTO import_batches (batch_type, file_hash, file_name, import_time, record_count) VALUES (?, ?, ?, ?, ?)",
        (batch_type, file_hash, file_name, now, record_count)
    )
    if cursor.rowcount == 0:
        row = conn.execute(
            "SELECT id FROM import_batches WHERE batch_type = ? AND file_hash = ?",
            (batch_type, file_hash)
        ).fetchone()
        batch_id = row["id"]
    else:
        batch_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return batch_id


def get_all_batches():
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM import_batches ORDER BY import_time DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_latest_batch_id(batch_type):
    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM import_batches WHERE batch_type = ? ORDER BY import_time DESC LIMIT 1",
        (batch_type,)
    ).fetchone()
    conn.close()
    return row["id"] if row else None


def upsert_store(store_code, store_name=None, conn=None):
    close_after = conn is None
    if close_after:
        conn = get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO store_info (store_code, store_name) VALUES (?, ?)",
        (store_code, store_name or store_code)
    )
    if store_name:
        conn.execute(
            "UPDATE store_info SET store_name = ? WHERE store_code = ?",
            (store_name, store_code)
        )
    if close_after:
        conn.commit()
        conn.close()


def get_all_stores():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM store_info ORDER BY store_code").fetchall()
    conn.close()
    return [dict(r) for r in rows]
