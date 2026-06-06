import csv
import os
from typing import List, Tuple, Dict
from .models import BikeRecord, BadRecord, RuleConfig


def read_bike_csv(
    csv_path: str,
    rule_config: RuleConfig,
    batch_id: str,
    source: str,
) -> Tuple[List[BikeRecord], List[BadRecord]]:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV文件不存在: {csv_path}")

    good_records: List[BikeRecord] = []
    bad_records: List[BadRecord] = []

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        if not reader.fieldnames:
            raise ValueError("CSV文件没有表头")

        fieldnames = [fn.strip() for fn in reader.fieldnames]

        for row_idx, raw_row in enumerate(reader, start=2):
            row = {k.strip(): (v.strip() if v else "") for k, v in raw_row.items()}

            errors = _validate_row(row, rule_config, fieldnames)

            if errors:
                bad_records.append(BadRecord(
                    row_number=row_idx,
                    raw_data=row,
                    error_reasons=errors,
                    source=source,
                    batch_id=batch_id,
                ))
            else:
                record = _build_bike_record(row, batch_id, source, row_idx)
                good_records.append(record)

    return good_records, bad_records


def _validate_row(
    row: Dict[str, str],
    rule_config: RuleConfig,
    fieldnames: List[str],
) -> List[str]:
    errors = []

    for field in rule_config.required_fields:
        if field not in fieldnames:
            errors.append(f"缺少必填字段列: {field}")
            continue
        value = row.get(field, "").strip()
        if not value:
            errors.append(f"字段 '{field}' 不能为空")

    if errors:
        return errors

    for field in rule_config.numeric_fields:
        if field not in fieldnames:
            continue
        value = row.get(field, "").strip()
        if not value:
            continue
        try:
            float(value)
        except ValueError:
            errors.append(f"字段 '{field}' 值 '{value}' 不是有效的数字")

    bike_id = row.get("bike_id", "").strip()
    if bike_id and len(bike_id) > 64:
        errors.append(f"bike_id 长度超过64字符")

    station_id = row.get("station_id", "").strip()
    if station_id and len(station_id) > 64:
        errors.append(f"station_id 长度超过64字符")

    return errors


def _build_bike_record(
    row: Dict[str, str],
    batch_id: str,
    source: str,
    row_number: int,
) -> BikeRecord:
    record = BikeRecord(
        bike_id=row.get("bike_id", "").strip(),
        station_id=row.get("station_id", "").strip(),
        station_name=row.get("station_name", "").strip(),
        last_update=row.get("last_update", "").strip(),
        source=source,
        batch_id=batch_id,
        raw_data=row.copy(),
        row_number=row_number,
    )

    try:
        record.parking_count = int(float(row.get("parking_count", "0") or "0"))
    except (ValueError, TypeError):
        record.parking_count = 0

    try:
        record.capacity = int(float(row.get("capacity", "0") or "0"))
    except (ValueError, TypeError):
        record.capacity = 0

    try:
        record.longitude = float(row.get("longitude", "0") or "0")
    except (ValueError, TypeError):
        record.longitude = 0.0

    try:
        record.latitude = float(row.get("latitude", "0") or "0")
    except (ValueError, TypeError):
        record.latitude = 0.0

    return record


def read_snapshot_csv(
    snapshot_path: str,
) -> Dict[str, BikeRecord]:
    if not os.path.exists(snapshot_path):
        return {}

    snapshot: Dict[str, BikeRecord] = {}

    with open(snapshot_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        if not reader.fieldnames:
            return snapshot

        for row_idx, raw_row in enumerate(reader, start=2):
            row = {k.strip(): (v.strip() if v else "") for k, v in raw_row.items()}
            bike_id = row.get("bike_id", "").strip()
            if not bike_id:
                continue

            record = _build_bike_record(row, "", "", row_idx)
            snapshot[bike_id] = record

    return snapshot
