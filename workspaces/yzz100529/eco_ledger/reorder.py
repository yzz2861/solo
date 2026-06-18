from __future__ import annotations

from collections import defaultdict
from datetime import date

from .models import LedgerEntry, ManifestEntry, ReorderResult


def _generate_new_id(
    waste_category: str,
    production_date: date,
    seq: int,
    prefix: str = "HW",
) -> str:
    cat_code = _category_code(waste_category)
    date_str = production_date.strftime("%Y%m")
    return f"{prefix}-{cat_code}-{date_str}-{seq:04d}"


def _category_code(waste_category: str) -> str:
    mapping = {
        "废矿物油": "F01",
        "废酸": "F02",
        "废碱": "F03",
        "废有机溶剂": "F04",
        "染涂料废物": "F05",
        "废油桶": "F06",
        "废活性炭": "F07",
        "表面处理废物": "F08",
        "医疗废物": "F09",
        "含铬废物": "F10",
    }
    return mapping.get(waste_category, "FXX")


def reorder_ledger(
    entries: list[LedgerEntry],
    manifests: list[ManifestEntry],
) -> ReorderResult:
    result = ReorderResult()

    sorted_entries = sorted(
        entries,
        key=lambda e: (e.waste_category, e.production_date, e.batch_no, e.barrel_no),
    )

    category_counters: dict[str, int] = defaultdict(int)

    for entry in sorted_entries:
        key = f"{entry.waste_category}-{entry.production_date.strftime('%Y%m')}"
        category_counters[key] += 1
        seq = category_counters[key]

        new_id = _generate_new_id(entry.waste_category, entry.production_date, seq)
        entry.new_id = new_id

        result.entries.append(entry)
        result.id_mapping[entry.original_id] = new_id
        result.original_id_mapping[new_id] = entry.original_id

    return result
