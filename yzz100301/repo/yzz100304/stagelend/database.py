"""数据库层 - 使用 SQLite 存储设备借还数据"""

import sqlite3
import os
from contextlib import contextmanager
from typing import Optional

DEFAULT_DB_PATH = os.path.expanduser("~/.stagelend/stagelend.db")


def get_db_path(db_path: Optional[str] = None) -> str:
    return db_path or os.environ.get("STAGELEND_DB", DEFAULT_DB_PATH)


@contextmanager
def get_conn(db_path: Optional[str] = None):
    path = get_db_path(db_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
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


def init_db(db_path: Optional[str] = None) -> None:
    with get_conn(db_path) as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS import_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_hash TEXT NOT NULL,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source_type, file_hash)
            );

            CREATE TABLE IF NOT EXISTS equipments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                equipment_no TEXT UNIQUE NOT NULL,
                name TEXT,
                category TEXT,
                status TEXT DEFAULT 'available',
                decommissioned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS lending_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER,
                source_line_no INTEGER,
                equipment_no TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                borrower TEXT,
                lender TEXT,
                lend_date TEXT,
                due_date TEXT,
                purpose TEXT,
                location TEXT,
                remark TEXT,
                batch_no TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_id) REFERENCES import_sources(id)
            );
            CREATE INDEX IF NOT EXISTS idx_lending_equip ON lending_records(equipment_no);
            CREATE INDEX IF NOT EXISTS idx_lending_batch ON lending_records(batch_no);

            CREATE TABLE IF NOT EXISTS return_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER,
                source_line_no INTEGER,
                equipment_no TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                returner TEXT,
                return_date TEXT,
                verifier TEXT,
                verified INTEGER DEFAULT 0,
                condition TEXT,
                remark TEXT,
                batch_no TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_id) REFERENCES import_sources(id)
            );
            CREATE INDEX IF NOT EXISTS idx_return_equip ON return_records(equipment_no);
            CREATE INDEX IF NOT EXISTS idx_return_batch ON return_records(batch_no);

            CREATE TABLE IF NOT EXISTS hoist_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id INTEGER,
                source_line_no INTEGER,
                point_no TEXT NOT NULL,
                max_load REAL,
                current_load REAL DEFAULT 0,
                equipment_no TEXT,
                quantity INTEGER DEFAULT 1,
                position TEXT,
                remark TEXT,
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (source_id) REFERENCES import_sources(id)
            );
            CREATE INDEX IF NOT EXISTS idx_hoist_point ON hoist_points(point_no);
            CREATE INDEX IF NOT EXISTS idx_hoist_equip ON hoist_points(equipment_no);
        """)


def check_source_imported(source_type: str, file_hash: str, db_path: Optional[str] = None) -> bool:
    with get_conn(db_path) as conn:
        row = conn.execute(
            "SELECT id FROM import_sources WHERE source_type = ? AND file_hash = ?",
            (source_type, file_hash)
        ).fetchone()
        return row is not None


def record_import_source(source_type: str, file_path: str, file_hash: str, db_path: Optional[str] = None) -> int:
    with get_conn(db_path) as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO import_sources (source_type, file_path, file_hash) VALUES (?, ?, ?)",
            (source_type, file_path, file_hash)
        )
        if cur.lastrowid:
            return cur.lastrowid
        row = conn.execute(
            "SELECT id FROM import_sources WHERE source_type = ? AND file_hash = ?",
            (source_type, file_hash)
        ).fetchone()
        return row["id"]
