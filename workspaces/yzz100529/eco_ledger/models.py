from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import date
from typing import Optional


class WeightUnit(enum.Enum):
    KG = "kg"
    TON = "ton"
    LB = "lb"


class IssueType(enum.Enum):
    MISSING_MANIFEST = "缺联单"
    WEIGHT_MISMATCH = "重量不平"
    DUPLICATE_BARREL = "重复桶号"
    CROSS_MONTH_STORAGE = "跨月暂存"
    VOIDED_MANIFEST = "联单作废"
    UNIT_INCONSISTENCY = "称重单位不一致"


@dataclass
class LedgerEntry:
    original_id: str
    barrel_no: str
    batch_no: str
    waste_category: str
    waste_code: str
    production_date: date
    weight: float
    weight_unit: WeightUnit
    manifest_no: Optional[str] = None
    storage_location: Optional[str] = None
    remark: Optional[str] = None
    new_id: Optional[str] = None
    original_row: int = 0

    @property
    def weight_kg(self) -> float:
        if self.weight_unit == WeightUnit.KG:
            return self.weight
        elif self.weight_unit == WeightUnit.TON:
            return self.weight * 1000
        elif self.weight_unit == WeightUnit.LB:
            return self.weight * 0.453592
        return self.weight


@dataclass
class ManifestEntry:
    manifest_no: str
    batch_no: str
    waste_category: str
    waste_code: str
    transfer_date: date
    total_weight: float
    weight_unit: WeightUnit
    barrel_count: int
    status: str = "正常"
    remark: Optional[str] = None
    original_row: int = 0

    @property
    def total_weight_kg(self) -> float:
        if self.weight_unit == WeightUnit.KG:
            return self.total_weight
        elif self.weight_unit == WeightUnit.TON:
            return self.total_weight * 1000
        elif self.weight_unit == WeightUnit.LB:
            return self.total_weight * 0.453592
        return self.total_weight


@dataclass
class IssueRecord:
    issue_type: IssueType
    barrel_no: Optional[str] = None
    batch_no: Optional[str] = None
    manifest_no: Optional[str] = None
    ledger_id: Optional[str] = None
    detail: str = ""
    suggestion: str = ""
    resolved: bool = False
    resolution: Optional[str] = None

    def resolve(self, resolution: str):
        self.resolved = True
        self.resolution = resolution


@dataclass
class ReorderResult:
    entries: list[LedgerEntry] = field(default_factory=list)
    issues: list[IssueRecord] = field(default_factory=list)
    id_mapping: dict[str, str] = field(default_factory=dict)
    original_id_mapping: dict[str, str] = field(default_factory=dict)
