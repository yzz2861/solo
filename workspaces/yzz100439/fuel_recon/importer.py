from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

from fuel_recon.models import DriverShift, FuelTransaction, MileageRecord

_FUEL_COLUMN_MAP = {
    "流水号": "txn_id",
    "交易流水号": "txn_id",
    "卡号": "card_number",
    "油卡号": "card_number",
    "车牌号": "plate_number",
    "车牌": "plate_number",
    "司机": "driver_name",
    "驾驶员": "driver_name",
    "加油时间": "fuel_time",
    "交易时间": "fuel_time",
    "油站名称": "station_name",
    "加油站": "station_name",
    "油站城市": "station_city",
    "城市": "station_city",
    "油品": "fuel_type",
    "油品类型": "fuel_type",
    "加油量": "volume_liters",
    "升数": "volume_liters",
    "金额": "amount_with_tax",
    "含税金额": "amount_with_tax",
    "税率": "tax_rate",
    "票据号": "receipt_number",
    "发票号": "receipt_number",
}

_SHIFT_COLUMN_MAP = {
    "司机": "driver_name",
    "驾驶员": "driver_name",
    "车牌号": "plate_number",
    "车牌": "plate_number",
    "开始时间": "shift_start",
    "排班开始": "shift_start",
    "结束时间": "shift_end",
    "排班结束": "shift_end",
}

_MILEAGE_COLUMN_MAP = {
    "车牌号": "plate_number",
    "车牌": "plate_number",
    "日期": "record_date",
    "起始里程": "start_mileage",
    "开始里程": "start_mileage",
    "结束里程": "end_mileage",
    "终止里程": "end_mileage",
}


def _rename_columns(df: pd.DataFrame, column_map: dict[str, str]) -> pd.DataFrame:
    mapping = {}
    for col in df.columns:
        stripped = col.strip()
        if stripped in column_map:
            mapping[col] = column_map[stripped]
    return df.rename(columns=mapping)


def _read_file(path: str) -> pd.DataFrame:
    ext = Path(path).suffix.lower()
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(path)
    return pd.read_csv(path, encoding="utf-8-sig")


def _parse_datetime(val) -> Optional[datetime]:
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M"):
        try:
            return datetime.strptime(str(val).strip(), fmt)
        except ValueError:
            continue
    try:
        return pd.to_datetime(val).to_pydatetime()
    except Exception:
        return None


class DataStore:
    def __init__(self, store_dir: str = ".fuel_recon_store"):
        self.store_dir = Path(store_dir)
        self.store_dir.mkdir(exist_ok=True)
        self.transactions: list[FuelTransaction] = []
        self.shifts: list[DriverShift] = []
        self.mileages: list[MileageRecord] = []
        self._dedup_keys: set[str] = set()
        self._load()

    def _db_path(self) -> Path:
        return self.store_dir / "store.json"

    def _load(self):
        p = self._db_path()
        if not p.exists():
            return
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        for t in data.get("transactions", []):
            txn = FuelTransaction(
                txn_id=t["txn_id"],
                card_number=t["card_number"],
                plate_number=t["plate_number"],
                driver_name=t["driver_name"],
                fuel_time=datetime.fromisoformat(t["fuel_time"]),
                station_name=t["station_name"],
                station_city=t["station_city"],
                fuel_type=t.get("fuel_type", ""),
                volume_liters=t["volume_liters"],
                amount_with_tax=t["amount_with_tax"],
                tax_rate=t.get("tax_rate", 0.13),
                receipt_number=t.get("receipt_number", ""),
                source_file=t.get("source_file", ""),
            )
            self.transactions.append(txn)
            self._dedup_keys.add(txn.dedup_key())
        for s in data.get("shifts", []):
            self.shifts.append(DriverShift(
                driver_name=s["driver_name"],
                plate_number=s["plate_number"],
                shift_start=datetime.fromisoformat(s["shift_start"]),
                shift_end=datetime.fromisoformat(s["shift_end"]),
                source_file=s.get("source_file", ""),
            ))
        for m in data.get("mileages", []):
            self.mileages.append(MileageRecord(
                plate_number=m["plate_number"],
                record_date=m["record_date"],
                start_mileage=m["start_mileage"],
                end_mileage=m["end_mileage"],
                source_file=m.get("source_file", ""),
            ))

    def save(self):
        data = {
            "transactions": [
                {
                    "txn_id": t.txn_id,
                    "card_number": t.card_number,
                    "plate_number": t.plate_number,
                    "driver_name": t.driver_name,
                    "fuel_time": t.fuel_time.isoformat(),
                    "station_name": t.station_name,
                    "station_city": t.station_city,
                    "fuel_type": t.fuel_type,
                    "volume_liters": t.volume_liters,
                    "amount_with_tax": t.amount_with_tax,
                    "tax_rate": t.tax_rate,
                    "receipt_number": t.receipt_number,
                    "source_file": t.source_file,
                }
                for t in self.transactions
            ],
            "shifts": [
                {
                    "driver_name": s.driver_name,
                    "plate_number": s.plate_number,
                    "shift_start": s.shift_start.isoformat(),
                    "shift_end": s.shift_end.isoformat(),
                    "source_file": s.source_file,
                }
                for s in self.shifts
            ],
            "mileages": [
                {
                    "plate_number": m.plate_number,
                    "record_date": m.record_date,
                    "start_mileage": m.start_mileage,
                    "end_mileage": m.end_mileage,
                    "source_file": m.source_file,
                }
                for m in self.mileages
            ],
        }
        with open(self._db_path(), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def import_transactions(self, file_path: str) -> tuple[int, int]:
        df = _read_file(file_path)
        df = _rename_columns(df, _FUEL_COLUMN_MAP)
        new_count = 0
        dup_count = 0
        source = os.path.basename(file_path)
        for _, row in df.iterrows():
            fuel_time = _parse_datetime(row.get("fuel_time"))
            if fuel_time is None:
                continue
            txn = FuelTransaction(
                txn_id=str(row.get("txn_id", "")),
                card_number=str(row.get("card_number", "")).strip(),
                plate_number=normalize_plate(str(row.get("plate_number", "")).strip()),
                driver_name=str(row.get("driver_name", "")).strip(),
                fuel_time=fuel_time,
                station_name=str(row.get("station_name", "")).strip(),
                station_city=str(row.get("station_city", "")).strip(),
                fuel_type=str(row.get("fuel_type", "")).strip(),
                volume_liters=float(row.get("volume_liters", 0) or 0),
                amount_with_tax=float(row.get("amount_with_tax", 0) or 0),
                tax_rate=float(row.get("tax_rate", 0.13) or 0.13),
                receipt_number=str(row.get("receipt_number", "")).strip(),
                source_file=source,
            )
            key = txn.dedup_key()
            if key in self._dedup_keys:
                dup_count += 1
                continue
            self._dedup_keys.add(key)
            self.transactions.append(txn)
            new_count += 1
        self.save()
        return new_count, dup_count

    def import_shifts(self, file_path: str) -> int:
        df = _read_file(file_path)
        df = _rename_columns(df, _SHIFT_COLUMN_MAP)
        count = 0
        source = os.path.basename(file_path)
        for _, row in df.iterrows():
            start = _parse_datetime(row.get("shift_start"))
            end = _parse_datetime(row.get("shift_end"))
            if start is None or end is None:
                continue
            self.shifts.append(DriverShift(
                driver_name=str(row.get("driver_name", "")).strip(),
                plate_number=normalize_plate(str(row.get("plate_number", "")).strip()),
                shift_start=start,
                shift_end=end,
                source_file=source,
            ))
            count += 1
        self.save()
        return count

    def import_mileages(self, file_path: str) -> int:
        df = _read_file(file_path)
        df = _rename_columns(df, _MILEAGE_COLUMN_MAP)
        count = 0
        source = os.path.basename(file_path)
        for _, row in df.iterrows():
            self.mileages.append(MileageRecord(
                plate_number=normalize_plate(str(row.get("plate_number", "")).strip()),
                record_date=str(row.get("record_date", "")).strip(),
                start_mileage=float(row.get("start_mileage", 0) or 0),
                end_mileage=float(row.get("end_mileage", 0) or 0),
                source_file=source,
            ))
            count += 1
        self.save()
        return count


def normalize_plate(plate: str) -> str:
    plate = plate.upper().replace(" ", "").replace("·", "").replace(".", "")
    return plate


def plate_edit_distance_one(a: str, b: str) -> bool:
    if len(a) != len(b):
        return False
    diff = sum(1 for ca, cb in zip(a, b) if ca != cb)
    return diff == 1


def find_fuzzy_plate_match(
    plate: str, known_plates: set[str]
) -> Optional[str]:
    normalized = normalize_plate(plate)
    if normalized in known_plates:
        return normalized
    for candidate in known_plates:
        if plate_edit_distance_one(normalized, candidate):
            return candidate
    return None
