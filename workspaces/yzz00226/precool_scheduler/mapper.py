from typing import Dict, Any, List, Optional
from .models import SourceRecord


class FieldMapper:
    def __init__(self, mapping: Dict[str, str] = None):
        self.mapping = mapping or {}
        self.default_mapping = {
            "product_name": "product_name",
            "product_type": "product_type",
            "quantity": "quantity",
            "unit": "unit",
            "inbound_date": "inbound_date",
            "target_temp": "target_temp",
            "current_temp": "current_temp",
        }

    def resolve(self, raw: Dict[str, Any], field: str) -> Optional[Any]:
        key = self.mapping.get(field, self.default_mapping.get(field, field))
        if key in raw:
            return raw[key]
        variants = [
            key,
            key.replace("_", ""),
            key.replace("_", " "),
            key.upper(),
            key.lower(),
        ]
        for v in variants:
            if v in raw:
                return raw[v]
        return None

    def map_record(self, source: SourceRecord) -> Dict[str, Any]:
        raw = source.raw_data
        return {
            "product_name": self.resolve(raw, "product_name"),
            "product_type": self.resolve(raw, "product_type"),
            "quantity": self.resolve(raw, "quantity"),
            "unit": self.resolve(raw, "unit"),
            "inbound_date": self.resolve(raw, "inbound_date"),
            "target_temp": self.resolve(raw, "target_temp"),
            "current_temp": self.resolve(raw, "current_temp"),
        }


def load_mapping_from_file(path: str) -> Dict[str, str]:
    import json
    import csv

    if path.endswith(".json"):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    elif path.endswith(".csv"):
        mapping = {}
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                field = row.get("field") or row.get("标准字段")
                source = row.get("source") or row.get("原始字段")
                if field and source:
                    mapping[field] = source
        return mapping
    else:
        raise ValueError(f"Unsupported mapping file format: {path}")
