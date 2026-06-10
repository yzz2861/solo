import sqlite3
import os
from datetime import datetime, date

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "handover.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_no TEXT UNIQUE NOT NULL,
            tool_name TEXT NOT NULL,
            specification TEXT,
            category TEXT,
            calibration_expiry DATE,
            status TEXT DEFAULT 'in_stock',
            location TEXT,
            remark TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS borrow_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_no TEXT NOT NULL,
            borrower TEXT NOT NULL,
            borrow_date DATE NOT NULL,
            expected_return_date DATE,
            borrow_remark TEXT,
            batch_id TEXT,
            source_file TEXT,
            status TEXT DEFAULT 'borrowed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tool_no) REFERENCES tools(tool_no)
        );

        CREATE TABLE IF NOT EXISTS return_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_no TEXT NOT NULL,
            returner TEXT NOT NULL,
            return_date DATE NOT NULL,
            return_photo_path TEXT,
            return_remark TEXT,
            batch_id TEXT,
            source_file TEXT,
            borrow_id INTEGER,
            status TEXT DEFAULT 'returned',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tool_no) REFERENCES tools(tool_no),
            FOREIGN KEY (borrow_id) REFERENCES borrow_records(id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_no TEXT NOT NULL,
            borrow_id INTEGER,
            return_id INTEGER,
            reviewer TEXT,
            review_opinion TEXT,
            review_date DATE,
            is_sealed INTEGER DEFAULT 0,
            sealed_by TEXT,
            sealed_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tool_no) REFERENCES tools(tool_no)
        );

        CREATE TABLE IF NOT EXISTS import_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id TEXT UNIQUE NOT NULL,
            batch_type TEXT NOT NULL,
            source_file TEXT,
            record_count INTEGER,
            import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            remark TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_borrow_tool_no ON borrow_records(tool_no);
        CREATE INDEX IF NOT EXISTS idx_return_tool_no ON return_records(tool_no);
        CREATE INDEX IF NOT EXISTS idx_review_tool_no ON reviews(tool_no);
    """)

    conn.commit()
    conn.close()


def batch_exists(batch_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM import_batches WHERE batch_id = ?", (batch_id,))
    result = cursor.fetchone()
    conn.close()
    return result["cnt"] > 0


def record_batch(batch_id, batch_type, source_file, record_count, remark=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR IGNORE INTO import_batches (batch_id, batch_type, source_file, record_count, remark)
        VALUES (?, ?, ?, ?, ?)
    """, (batch_id, batch_type, source_file, record_count, remark))
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
