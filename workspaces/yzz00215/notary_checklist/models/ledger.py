from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import pandas as pd
import hashlib
import json


@dataclass
class LedgerRecord:
    record_id: str
    customer_name: str = ""
    id_card: str = ""
    business_type: str = ""
    notary_type: str = ""
    amount: float = 0.0
    status: str = ""
    apply_date: str = ""
    source_system: str = ""
    extra_fields: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = {
            'record_id': self.record_id,
            'customer_name': self.customer_name,
            'id_card': self.id_card,
            'business_type': self.business_type,
            'notary_type': self.notary_type,
            'amount': self.amount,
            'status': self.status,
            'apply_date': self.apply_date,
            'source_system': self.source_system,
        }
        d.update(self.extra_fields)
        return d

    def compute_signature(self) -> str:
        data = self.to_dict()
        data_sorted = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(data_sorted.encode('utf-8')).hexdigest()[:16]

    def get_required_fields(self) -> List[str]:
        return [
            'record_id', 'customer_name', 'id_card',
            'business_type', 'apply_date'
        ]

    def validate_required(self) -> List[str]:
        missing = []
        for f in self.get_required_fields():
            val = getattr(self, f, None)
            if val is None or (isinstance(val, str) and val.strip() == ''):
                missing.append(f)
        return missing


@dataclass
class BusinessLedger:
    records: List[LedgerRecord] = field(default_factory=list)
    source_file: str = ""

    def __len__(self) -> int:
        return len(self.records)

    def __iter__(self):
        return iter(self.records)

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame([r.to_dict() for r in self.records])

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame, source_file: str = "") -> 'BusinessLedger':
        records = []
        base_fields = {
            'record_id', 'customer_name', 'id_card',
            'business_type', 'notary_type', 'amount',
            'status', 'apply_date', 'source_system'
        }
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            base_data = {}
            extra_data = {}
            for k, v in row_dict.items():
                cleaned_v = cls._clean_value(v)
                if k in base_fields:
                    base_data[k] = cleaned_v
                else:
                    extra_data[k] = cleaned_v
            base_data['extra_fields'] = extra_data
            if 'amount' in base_data:
                amt = base_data['amount']
                if isinstance(amt, str):
                    try:
                        base_data['amount'] = float(amt) if amt.strip() else 0.0
                    except (ValueError, TypeError):
                        base_data['amount'] = 0.0
                elif isinstance(amt, (int, float)):
                    import math
                    if math.isnan(amt):
                        base_data['amount'] = 0.0
                else:
                    base_data['amount'] = 0.0
            record = LedgerRecord(**base_data)
            records.append(record)
        return cls(records=records, source_file=source_file)

    @staticmethod
    def _clean_value(v):
        if v is None:
            return ""
        import math
        if isinstance(v, float) and math.isnan(v):
            return ""
        if isinstance(v, str):
            return v
        return v

    @classmethod
    def from_csv(cls, file_path: str) -> 'BusinessLedger':
        df = pd.read_csv(file_path, dtype=str)
        if 'amount' in df.columns:
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
        return cls.from_dataframe(df, source_file=file_path)

    @classmethod
    def from_excel(cls, file_path: str, sheet_name: str = 0) -> 'BusinessLedger':
        df = pd.read_excel(file_path, sheet_name=sheet_name, dtype=str)
        if 'amount' in df.columns:
            df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
        return cls.from_dataframe(df, source_file=file_path)

    def get_record_by_id(self, record_id: str) -> Optional[LedgerRecord]:
        for r in self.records:
            if r.record_id == record_id:
                return r
        return None

    def get_duplicate_ids(self) -> List[str]:
        id_counts: Dict[str, int] = {}
        for r in self.records:
            id_counts[r.record_id] = id_counts.get(r.record_id, 0) + 1
        return [rid for rid, cnt in id_counts.items() if cnt > 1]

    def filter_by(self, conditions: Dict[str, Any]) -> 'BusinessLedger':
        filtered = []
        for r in self.records:
            match = True
            for k, v in conditions.items():
                if v is None or v == '':
                    continue
                record_val = getattr(r, k, None) or r.extra_fields.get(k)
                if isinstance(v, list):
                    if record_val not in v:
                        match = False
                        break
                else:
                    if record_val != v:
                        match = False
                        break
            if match:
                filtered.append(r)
        return BusinessLedger(records=filtered, source_file=self.source_file)
