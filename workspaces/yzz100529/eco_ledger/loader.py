from __future__ import annotations

import csv
from datetime import date

from .models import LedgerEntry, ManifestEntry, WeightUnit


def load_ledger(path: str, encoding: str = "utf-8-sig") -> list[LedgerEntry]:
    entries: list[LedgerEntry] = []

    with open(path, encoding=encoding, newline="") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, 2):
            weight_unit_str = row.get("单位", row.get("weight_unit", "kg")).strip().lower()
            weight_unit = _parse_weight_unit(weight_unit_str)

            production_date = _parse_date(
                row.get("产生日期", row.get("production_date", ""))
            )

            entry = LedgerEntry(
                original_id=row.get("编号", row.get("original_id", f"ROW-{row_idx}")).strip(),
                barrel_no=row.get("桶号", row.get("barrel_no", "")).strip(),
                batch_no=row.get("批次编号", row.get("batch_no", "")).strip(),
                waste_category=row.get("废物类别", row.get("waste_category", "")).strip(),
                waste_code=row.get("废物代码", row.get("waste_code", "")).strip(),
                production_date=production_date,
                weight=float(row.get("重量", row.get("weight", "0")).strip()),
                weight_unit=weight_unit,
                manifest_no=_optional(row, "联单编号", "manifest_no"),
                storage_location=_optional(row, "存放位置", "storage_location"),
                remark=_optional(row, "备注", "remark"),
                original_row=row_idx,
            )
            entries.append(entry)

    return entries


def load_manifests(path: str, encoding: str = "utf-8-sig") -> list[ManifestEntry]:
    entries: list[ManifestEntry] = []

    with open(path, encoding=encoding, newline="") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, 2):
            weight_unit_str = row.get("单位", row.get("weight_unit", "kg")).strip().lower()
            weight_unit = _parse_weight_unit(weight_unit_str)

            transfer_date = _parse_date(
                row.get("转移日期", row.get("transfer_date", ""))
            )

            entry = ManifestEntry(
                manifest_no=row.get("联单编号", row.get("manifest_no", "")).strip(),
                batch_no=row.get("批次编号", row.get("batch_no", "")).strip(),
                waste_category=row.get("废物类别", row.get("waste_category", "")).strip(),
                waste_code=row.get("废物代码", row.get("waste_code", "")).strip(),
                transfer_date=transfer_date,
                total_weight=float(row.get("总重量", row.get("total_weight", "0")).strip()),
                weight_unit=weight_unit,
                barrel_count=int(row.get("桶数", row.get("barrel_count", "0")).strip()),
                status=row.get("状态", row.get("status", "正常")).strip(),
                remark=_optional(row, "备注", "remark"),
                original_row=row_idx,
            )
            entries.append(entry)

    return entries


def _parse_weight_unit(s: str) -> WeightUnit:
    mapping = {
        "kg": WeightUnit.KG,
        "千克": WeightUnit.KG,
        "公斤": WeightUnit.KG,
        "ton": WeightUnit.TON,
        "吨": WeightUnit.TON,
        "t": WeightUnit.TON,
        "lb": WeightUnit.LB,
        "磅": WeightUnit.LB,
    }
    return mapping.get(s, WeightUnit.KG)


def _parse_date(s: str) -> date:
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y.%m.%d"):
        try:
            return date.fromisoformat(s) if fmt == "%Y-%m-%d" else _strptime_date(s, fmt)
        except (ValueError, TypeError):
            continue
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        return date.today()


def _strptime_date(s: str, fmt: str) -> date:
    from datetime import datetime as dt

    return dt.strptime(s, fmt).date()


def _optional(row: dict, key1: str, key2: str) -> str | None:
    val = row.get(key1, row.get(key2, "")).strip()
    return val if val else None
