from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class AnomalyType(str, Enum):
    OUT_OF_AREA = "异地加油"
    EXCESSIVE_VOLUME = "油量超常"
    MILEAGE_UNSUPPORTED = "里程不支持"
    SUSPECTED_DUPLICATE = "疑似重复"
    PLATE_MISMATCH = "车牌不匹配"
    DRIVER_SWAP = "临时换车"
    OVERNIGHT_CROSSDAY = "夜间跨天加油"


class ReimburseStatus(str, Enum):
    APPROVED = "可报销"
    PENDING = "待解释"
    REJECTED = "不可报销"


@dataclass
class FuelTransaction:
    txn_id: str
    card_number: str
    plate_number: str
    driver_name: str
    fuel_time: datetime
    station_name: str
    station_city: str
    fuel_type: str
    volume_liters: float
    amount_with_tax: float
    tax_rate: float = 0.13
    receipt_number: str = ""
    source_file: str = ""

    @property
    def amount_without_tax(self) -> float:
        return round(self.amount_with_tax / (1 + self.tax_rate), 2)

    @property
    def tax_amount(self) -> float:
        return round(self.amount_with_tax - self.amount_without_tax, 2)

    def dedup_key(self) -> str:
        return f"{self.card_number}|{self.fuel_time.isoformat()}|{self.volume_liters}|{self.station_name}"


@dataclass
class DriverShift:
    driver_name: str
    plate_number: str
    shift_start: datetime
    shift_end: datetime
    source_file: str = ""

    def is_on_shift(self, dt: datetime) -> bool:
        return self.shift_start <= dt <= self.shift_end


@dataclass
class MileageRecord:
    plate_number: str
    record_date: str
    start_mileage: float
    end_mileage: float
    source_file: str = ""

    @property
    def daily_mileage(self) -> float:
        return max(0.0, self.end_mileage - self.start_mileage)


@dataclass
class Anomaly:
    txn: FuelTransaction
    anomaly_type: AnomalyType
    description: str
    severity: str = "medium"
    related_txns: list[FuelTransaction] = field(default_factory=list)
    related_shift: Optional[DriverShift] = None
    related_mileage: Optional[MileageRecord] = None


@dataclass
class ReconciliationResult:
    total_transactions: int = 0
    new_transactions: int = 0
    duplicate_skipped: int = 0
    anomalies: list[Anomaly] = field(default_factory=list)

    @property
    def anomaly_count(self) -> int:
        return len(self.anomalies)

    @property
    def approved_amount(self) -> float:
        return sum(
            a.txn.amount_with_tax
            for a in self.anomalies
            if a.anomaly_type == AnomalyType.PLATE_MISMATCH
        ) if False else 0.0

    def anomalies_by_type(self) -> dict[AnomalyType, list[Anomaly]]:
        result: dict[AnomalyType, list[Anomaly]] = {}
        for a in self.anomalies:
            result.setdefault(a.anomaly_type, []).append(a)
        return result
