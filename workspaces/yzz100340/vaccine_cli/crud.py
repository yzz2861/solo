from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path

from .database import (
    execute_query,
    execute_insert,
    rows_to_dict_list,
    row_to_dict,
    get_db_connection,
)
from .config import EXPIRY_WARNING_DAYS, TEMPERATURE_NORMAL_RANGE


# -------------------- Vaccines --------------------

def create_vaccine(
    name: str,
    species: str,
    min_temp: float,
    max_temp: float,
    shelf_life_months: int,
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO vaccines (name, species, min_temp, max_temp, shelf_life_months)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, species, min_temp, max_temp, shelf_life_months),
        db_path
    )


def get_all_vaccines(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM vaccines ORDER BY name", db_path=db_path)
    return rows_to_dict_list(rows)


def get_vaccine_by_id(vaccine_id: int, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM vaccines WHERE id = ?", (vaccine_id,), db_path)
    return row_to_dict(rows[0]) if rows else None


# -------------------- Vaccine Batches --------------------

def create_batch(
    vaccine_id: int,
    batch_number: str,
    manufacture_date: str,
    expiry_date: str,
    quantity: int,
    notes: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO vaccine_batches
        (vaccine_id, batch_number, manufacture_date, expiry_date, initial_quantity, current_quantity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (vaccine_id, batch_number, manufacture_date, expiry_date, quantity, quantity, notes),
        db_path
    )


def get_all_batches(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    rows = execute_query(
        """
        SELECT vb.*, v.name as vaccine_name, v.species as vaccine_species
        FROM vaccine_batches vb
        JOIN vaccines v ON vb.vaccine_id = v.id
        ORDER BY vb.expiry_date
        """,
        db_path=db_path
    )
    return rows_to_dict_list(rows)


def get_batch_by_id(batch_id: int, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    rows = execute_query(
        """
        SELECT vb.*, v.name as vaccine_name
        FROM vaccine_batches vb
        JOIN vaccines v ON vb.vaccine_id = v.id
        WHERE vb.id = ?
        """,
        (batch_id,),
        db_path
    )
    return row_to_dict(rows[0]) if rows else None


def get_batch_by_number(batch_number: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    rows = execute_query(
        """
        SELECT vb.*, v.name as vaccine_name, v.species as vaccine_species
        FROM vaccine_batches vb
        JOIN vaccines v ON vb.vaccine_id = v.id
        WHERE vb.batch_number = ?
        """,
        (batch_number,),
        db_path
    )
    return row_to_dict(rows[0]) if rows else None


def update_batch_quantity(
    batch_id: int,
    quantity_change: int,
    db_path: Optional[Path] = None
) -> None:
    execute_query(
        "UPDATE vaccine_batches SET current_quantity = current_quantity + ? WHERE id = ?",
        (quantity_change, batch_id),
        db_path,
        commit=True
    )


def update_batch_status(
    batch_id: int,
    status: str,
    notes: Optional[str] = None,
    db_path: Optional[Path] = None
) -> None:
    if notes:
        execute_query(
            "UPDATE vaccine_batches SET status = ?, notes = COALESCE(notes || '; ' || ?, ?) WHERE id = ?",
            (status, notes, notes, batch_id),
            db_path,
            commit=True
        )
    else:
        execute_query(
            "UPDATE vaccine_batches SET status = ? WHERE id = ?",
            (status, batch_id),
            db_path,
            commit=True
        )


def get_batches_expiring_soon(
    days: int = EXPIRY_WARNING_DAYS,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    cutoff_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
    rows = execute_query(
        """
        SELECT vb.*, v.name as vaccine_name
        FROM vaccine_batches vb
        JOIN vaccines v ON vb.vaccine_id = v.id
        WHERE vb.expiry_date <= ? AND vb.current_quantity > 0 AND vb.status = 'normal'
        ORDER BY vb.expiry_date
        """,
        (cutoff_date,),
        db_path
    )
    return rows_to_dict_list(rows)


def get_batches_with_negative_inventory(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    rows = execute_query(
        """
        SELECT vb.*, v.name as vaccine_name
        FROM vaccine_batches vb
        JOIN vaccines v ON vb.vaccine_id = v.id
        WHERE vb.current_quantity < 0
        ORDER BY vb.current_quantity
        """,
        db_path=db_path
    )
    return rows_to_dict_list(rows)


# -------------------- Temperature Logs --------------------

def insert_temperature_log(
    record_time: str,
    temperature: Optional[float],
    is_missing: bool = False,
    is_power_outage: bool = False,
    notes: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO temperature_logs (record_time, temperature, is_missing, is_power_outage, notes)
        VALUES (?, ?, ?, ?, ?)
        """,
        (record_time, temperature, 1 if is_missing else 0, 1 if is_power_outage else 0, notes),
        db_path
    )


def get_temperature_logs(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM temperature_logs"
    params: List = []
    conditions: List[str] = []

    if start_time:
        conditions.append("record_time >= ?")
        params.append(start_time)
    if end_time:
        conditions.append("record_time <= ?")
        params.append(end_time)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY record_time"
    rows = execute_query(query, tuple(params), db_path)
    return rows_to_dict_list(rows)


def get_missing_temperature_logs(
    start_time: str,
    end_time: str,
    interval_minutes: int = 60,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    rows = execute_query(
        """
        SELECT * FROM temperature_logs
        WHERE record_time >= ? AND record_time <= ?
        AND (is_missing = 1 OR temperature IS NULL)
        ORDER BY record_time
        """,
        (start_time, end_time),
        db_path
    )
    return rows_to_dict_list(rows)


def get_abnormal_temperatures(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    min_temp, max_temp = TEMPERATURE_NORMAL_RANGE
    query = """
        SELECT * FROM temperature_logs
        WHERE temperature IS NOT NULL
        AND (temperature < ? OR temperature > ?)
    """
    params: List = [min_temp, max_temp]
    conditions: List[str] = []

    if start_time:
        conditions.append("record_time >= ?")
        params.append(start_time)
    if end_time:
        conditions.append("record_time <= ?")
        params.append(end_time)

    if conditions:
        query += " AND " + " AND ".join(conditions)

    query += " ORDER BY record_time"
    rows = execute_query(query, tuple(params), db_path)
    return rows_to_dict_list(rows)


# -------------------- Pets --------------------

def create_or_get_pet(
    name: str,
    species: str,
    owner_name: str,
    owner_phone: str,
    breed: Optional[str] = None,
    age: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    rows = execute_query(
        "SELECT id FROM pets WHERE name = ? AND owner_phone = ?",
        (name, owner_phone),
        db_path
    )
    if rows:
        return rows[0]["id"]

    return execute_insert(
        """
        INSERT INTO pets (name, species, breed, age, owner_name, owner_phone)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name, species, breed, age, owner_name, owner_phone),
        db_path
    )


def get_pet_by_id(pet_id: int, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM pets WHERE id = ?", (pet_id,), db_path)
    return row_to_dict(rows[0]) if rows else None


def search_pets_by_name(name_pattern: str, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    rows = execute_query(
        "SELECT * FROM pets WHERE name LIKE ? ORDER BY name",
        (f"%{name_pattern}%",),
        db_path
    )
    return rows_to_dict_list(rows)


def get_all_pets(db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM pets ORDER BY name", db_path=db_path)
    return rows_to_dict_list(rows)


# -------------------- Vaccination Records --------------------

def create_vaccination_record(
    pet_id: int,
    batch_id: int,
    vaccination_date: str,
    dose_number: int,
    administrator: str,
    notes: Optional[str] = None,
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO vaccination_records
        (pet_id, batch_id, vaccination_date, dose_number, administrator, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (pet_id, batch_id, vaccination_date, dose_number, administrator, notes),
        db_path
    )


def check_duplicate_vaccination(
    pet_id: int,
    batch_id: int,
    dose_number: int,
    db_path: Optional[Path] = None
) -> bool:
    rows = execute_query(
        """
        SELECT id FROM vaccination_records
        WHERE pet_id = ? AND batch_id = ? AND dose_number = ?
        """,
        (pet_id, batch_id, dose_number),
        db_path
    )
    return len(rows) > 0


def get_vaccination_records(
    pet_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    query = """
        SELECT vr.*, p.name as pet_name, p.species as pet_species,
               p.owner_name, p.owner_phone,
               vb.batch_number, vb.expiry_date,
               v.name as vaccine_name
        FROM vaccination_records vr
        JOIN pets p ON vr.pet_id = p.id
        JOIN vaccine_batches vb ON vr.batch_id = vb.id
        JOIN vaccines v ON vb.vaccine_id = v.id
    """
    params: List = []
    conditions: List[str] = []

    if pet_id:
        conditions.append("vr.pet_id = ?")
        params.append(pet_id)
    if batch_id:
        conditions.append("vr.batch_id = ?")
        params.append(batch_id)
    if start_date:
        conditions.append("vr.vaccination_date >= ?")
        params.append(start_date)
    if end_date:
        conditions.append("vr.vaccination_date <= ?")
        params.append(end_date)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY vr.vaccination_date DESC"
    rows = execute_query(query, tuple(params), db_path)
    return rows_to_dict_list(rows)


def get_vaccinations_for_batch(batch_id: int, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    return get_vaccination_records(batch_id=batch_id, db_path=db_path)


def get_vaccinations_for_pet(pet_id: int, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    return get_vaccination_records(pet_id=pet_id, db_path=db_path)


# -------------------- Abnormal Events --------------------

def create_abnormal_event(
    event_type: str,
    event_start: str,
    description: str,
    event_end: Optional[str] = None,
    batch_ids: Optional[str] = None,
    action_taken: Optional[str] = None,
    status: str = "open",
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO abnormal_events
        (event_type, event_start, event_end, batch_ids, description, action_taken, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (event_type, event_start, event_end, batch_ids, description, action_taken, status),
        db_path
    )


def update_abnormal_event(
    event_id: int,
    action_taken: str,
    status: str = "resolved",
    event_end: Optional[str] = None,
    db_path: Optional[Path] = None
) -> None:
    execute_query(
        """
        UPDATE abnormal_events
        SET status = ?, action_taken = COALESCE(action_taken || '; ' || ?, ?),
            event_end = COALESCE(?, event_end)
        WHERE id = ?
        """,
        (status, action_taken, action_taken, event_end, event_id),
        db_path,
        commit=True
    )


def get_all_abnormal_events(
    status: Optional[str] = None,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM abnormal_events"
    params: Tuple = ()
    if status:
        query += " WHERE status = ?"
        params = (status,)
    query += " ORDER BY event_start DESC"
    rows = execute_query(query, params, db_path)
    return rows_to_dict_list(rows)


def get_abnormal_event_by_id(
    event_id: int,
    db_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    rows = execute_query("SELECT * FROM abnormal_events WHERE id = ?", (event_id,), db_path)
    return row_to_dict(rows[0]) if rows else None


# -------------------- Alerts --------------------

def create_alert(
    alert_type: str,
    severity: str,
    message: str,
    related_batch_id: Optional[int] = None,
    related_record_id: Optional[int] = None,
    related_pet_id: Optional[int] = None,
    db_path: Optional[Path] = None
) -> int:
    return execute_insert(
        """
        INSERT INTO alerts (alert_type, severity, message, related_batch_id, related_record_id, related_pet_id)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (alert_type, severity, message, related_batch_id, related_record_id, related_pet_id),
        db_path
    )


def get_alerts(
    include_resolved: bool = False,
    db_path: Optional[Path] = None
) -> List[Dict[str, Any]]:
    query = "SELECT * FROM alerts"
    params: Tuple = ()
    if not include_resolved:
        query += " WHERE is_resolved = 0"
        params = ()
    query += " ORDER BY created_at DESC"
    rows = execute_query(query, params, db_path)
    return rows_to_dict_list(rows)


def resolve_alert(alert_id: int, db_path: Optional[Path] = None) -> None:
    execute_query(
        "UPDATE alerts SET is_resolved = 1 WHERE id = ?",
        (alert_id,),
        db_path,
        commit=True
    )


def resolve_all_alerts(db_path: Optional[Path] = None) -> None:
    execute_query(
        "UPDATE alerts SET is_resolved = 1 WHERE is_resolved = 0",
        db_path=db_path,
        commit=True
    )
