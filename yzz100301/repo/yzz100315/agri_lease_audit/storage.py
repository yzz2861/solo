import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime


DB_FILENAME = "agri_lease.db"
FUEL_CONSUMPTION_THRESHOLD = 3.0  # 升/小时，超过此阈值视为异常


def get_db_path():
    return os.path.join(os.getcwd(), DB_FILENAME)


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        c = conn.cursor()

        c.execute("""
            CREATE TABLE IF NOT EXISTS import_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_type TEXT NOT NULL,
                source_file TEXT NOT NULL,
                import_time TIMESTAMP NOT NULL,
                record_count INTEGER NOT NULL,
                batch_hash TEXT NOT NULL UNIQUE
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS lease_out (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                source_line INTEGER,
                equipment_id TEXT NOT NULL,
                lease_date DATE NOT NULL,
                start_hours REAL NOT NULL,
                operator TEXT,
                remarks TEXT,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES import_batches(id),
                UNIQUE(equipment_id, lease_date, start_hours)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS fuel_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                source_line INTEGER,
                equipment_id TEXT NOT NULL,
                fuel_date DATE NOT NULL,
                fuel_amount REAL NOT NULL,
                fuel_station TEXT,
                operator TEXT,
                remarks TEXT,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES import_batches(id),
                UNIQUE(equipment_id, fuel_date, fuel_amount, fuel_station)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS return_check (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER,
                source_line INTEGER,
                equipment_id TEXT NOT NULL,
                return_date DATE NOT NULL,
                end_hours REAL NOT NULL,
                inspector TEXT,
                inspection_result TEXT,
                remarks TEXT,
                created_at TIMESTAMP NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES import_batches(id),
                UNIQUE(equipment_id, return_date, end_hours)
            )
        """)

        c.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                equipment_id TEXT NOT NULL,
                reviewer TEXT NOT NULL,
                review_status TEXT NOT NULL,
                review_comment TEXT,
                review_time TIMESTAMP NOT NULL,
                anomalies_addressed TEXT
            )
        """)

        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_lease_out_equipment ON lease_out(equipment_id)
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_fuel_equipment ON fuel_records(equipment_id)
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_return_equipment ON return_check(equipment_id)
        """)
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_reviews_equipment ON reviews(equipment_id)
        """)
