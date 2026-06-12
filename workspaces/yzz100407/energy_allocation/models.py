from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Dict, List, Optional


class MeterType(str, Enum):
    ELECTRIC = "electric"
    WATER = "water"


class BillStatus(str, Enum):
    NORMAL = "normal"
    DISPUTED = "disputed"
    ABNORMAL = "abnormal"


class AnomalyType(str, Enum):
    READING_REVERSAL = "reading_reversal"
    MISSING_PREVIOUS = "missing_previous"
    ZERO_AREA = "zero_area"
    SHOP_RENAMED = "shop_renamed"
    SHOP_CLOSED_MID_MONTH = "shop_closed_mid_month"
    MISSING_SHOP = "missing_shop"


@dataclass
class MeterReading:
    meter_id: str
    meter_type: MeterType
    shop_id: Optional[str]
    shop_name: str
    reading_date: date
    reading_value: float
    previous_reading: Optional[float] = None
    is_master: bool = False

    @property
    def consumption(self) -> Optional[float]:
        if self.previous_reading is None:
            return None
        return self.reading_value - self.previous_reading


@dataclass
class ShopArea:
    shop_id: str
    shop_name: str
    area: float
    floor: Optional[str] = None
    is_active: bool = True
    effective_date: Optional[date] = None
    end_date: Optional[date] = None


@dataclass
class AllocationRule:
    rule_id: str
    rule_name: str
    meter_type: MeterType
    allocation_method: str
    fixed_fee: float = 0.0
    unit_price: float = 0.0
    public_area_ratio: float = 0.0

    def validate(self) -> List[str]:
        errors = []
        if self.unit_price < 0:
            errors.append(f"规则 {self.rule_name} 单价不能为负")
        if self.public_area_ratio < 0 or self.public_area_ratio > 1:
            errors.append(f"规则 {self.rule_name} 公摊比例应在0-1之间")
        return errors


@dataclass
class AllocationItem:
    item_name: str
    amount: float
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    formula: str = ""


@dataclass
class ShopBill:
    bill_no: str
    billing_month: str
    shop_id: str
    shop_name: str
    meter_type: MeterType
    total_amount: float
    status: BillStatus = BillStatus.NORMAL
    items: List[AllocationItem] = field(default_factory=list)
    anomalies: List[AnomalyType] = field(default_factory=list)
    notes: str = ""

    def add_item(self, item: AllocationItem):
        self.items.append(item)

    def add_anomaly(self, anomaly: AnomalyType):
        if anomaly not in self.anomalies:
            self.anomalies.append(anomaly)
        if self.status == BillStatus.NORMAL:
            self.status = BillStatus.ABNORMAL


@dataclass
class BillingResult:
    billing_month: str
    bills: List[ShopBill] = field(default_factory=list)
    anomalies: List[dict] = field(default_factory=list)
    total_master_consumption: Dict[MeterType, float] = field(default_factory=dict)
    total_billed_amount: Dict[MeterType, float] = field(default_factory=dict)

    def get_bill(self, shop_id: str, meter_type: MeterType) -> Optional[ShopBill]:
        for bill in self.bills:
            if bill.shop_id == shop_id and bill.meter_type == meter_type:
                return bill
        return None
