import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

from .config import DEFAULT_DB_PATH
from .models import DATABASE_SCHEMA


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    db_path = db_path or DEFAULT_DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    conn = get_db_connection(db_path)
    try:
        conn.executescript(DATABASE_SCHEMA)
        conn.commit()
    finally:
        conn.close()


def execute_query(
    query: str,
    params: Tuple = (),
    db_path: Optional[Path] = None,
    commit: bool = False
) -> List[sqlite3.Row]:
    conn = get_db_connection(db_path)
    try:
        cursor = conn.execute(query, params)
        if commit:
            conn.commit()
        return cursor.fetchall()
    finally:
        conn.close()


def execute_insert(
    query: str,
    params: Tuple = (),
    db_path: Optional[Path] = None
) -> int:
    conn = get_db_connection(db_path)
    try:
        cursor = conn.execute(query, params)
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def rows_to_dict_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(row) for row in rows]
