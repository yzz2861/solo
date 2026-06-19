import sqlite3
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'equipment.db')

os.makedirs(DATA_DIR, exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            model TEXT,
            serial_number TEXT UNIQUE,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'available',
            location TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS accessories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS borrowals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER NOT NULL,
            department TEXT NOT NULL,
            responsible_person TEXT NOT NULL,
            borrow_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            expected_return_time TEXT NOT NULL,
            actual_return_time TEXT,
            status TEXT NOT NULL DEFAULT 'borrowed',
            cleaning_check TEXT,
            damage_note TEXT,
            review_note TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (device_id) REFERENCES devices(id)
        );

        CREATE TABLE IF NOT EXISTS borrowal_accessories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            borrowal_id INTEGER NOT NULL,
            accessory_id INTEGER NOT NULL,
            borrow_quantity INTEGER NOT NULL DEFAULT 1,
            return_quantity INTEGER,
            status TEXT,
            note TEXT,
            FOREIGN KEY (borrowal_id) REFERENCES borrowals(id) ON DELETE CASCADE,
            FOREIGN KEY (accessory_id) REFERENCES accessories(id)
        );

        CREATE INDEX IF NOT EXISTS idx_borrowals_device ON borrowals(device_id);
        CREATE INDEX IF NOT EXISTS idx_borrowals_department ON borrowals(department);
        CREATE INDEX IF NOT EXISTS idx_borrowals_status ON borrowals(status);
        CREATE INDEX IF NOT EXISTS idx_accessories_device ON accessories(device_id);
    """)

    conn.commit()
    conn.close()


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_dict_list(rows):
    return [dict(row) for row in rows]


init_db()
