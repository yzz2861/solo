from typing import List, Dict
from .models import BikeRecord, DiffRecord, RuleConfig


def compare_with_snapshot(
    current_records: List[BikeRecord],
    snapshot_map: Dict[str, BikeRecord],
    rule_config: RuleConfig,
    batch_id: str,
    source: str,
) -> List[DiffRecord]:
    diffs: List[DiffRecord] = []

    for record in current_records:
        old_record = snapshot_map.get(record.bike_id)

        if old_record is None:
            diffs.append(DiffRecord(
                bike_id=record.bike_id,
                station_id=record.station_id,
                field_name="record",
                old_value="(none)",
                new_value="new_record",
                change_type="new",
                source=source,
                batch_id=batch_id,
            ))
            continue

        for field in rule_config.diff_fields:
            old_val = _get_field_value(old_record, field)
            new_val = _get_field_value(record, field)

            if old_val != new_val:
                diffs.append(DiffRecord(
                    bike_id=record.bike_id,
                    station_id=record.station_id,
                    field_name=field,
                    old_value=old_val,
                    new_value=new_val,
                    change_type="modified",
                    source=source,
                    batch_id=batch_id,
                ))

    current_ids = {r.bike_id for r in current_records}
    for bike_id in snapshot_map:
        if bike_id not in current_ids:
            old_record = snapshot_map[bike_id]
            diffs.append(DiffRecord(
                bike_id=bike_id,
                station_id=old_record.station_id,
                field_name="record",
                old_value="existing",
                new_value="(none)",
                change_type="removed",
                source=source,
                batch_id=batch_id,
            ))

    return diffs


def _get_field_value(record: BikeRecord, field: str) -> str:
    value_map = {
        "station_id": record.station_id,
        "station_name": record.station_name,
        "parking_count": str(record.parking_count),
        "capacity": str(record.capacity),
        "longitude": str(record.longitude),
        "latitude": str(record.latitude),
        "last_update": record.last_update,
    }
    return value_map.get(field, "")


def build_history_trace(
    bike_id: str,
    snapshot_map: Dict[str, BikeRecord],
) -> str:
    old_record = snapshot_map.get(bike_id)
    if old_record is None:
        return "历史快照: 无记录 (新增车辆)"

    parts = [
        f"历史站点: {old_record.station_name} ({old_record.station_id})",
        f"历史停放数: {old_record.parking_count}",
        f"历史容量: {old_record.capacity}",
    ]
    return "; ".join(parts)
