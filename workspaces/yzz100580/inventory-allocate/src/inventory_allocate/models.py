from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple


class UnmetReason(str, Enum):
    INSUFFICIENT_STOCK = "可调库存不足"
    NO_TRANSPORT_ROUTE = "无可用运输路线"
    TRANSPORT_TOO_LONG = "运输时间过长"
    SAFETY_STOCK_VIOLATION = "调出后安全库存不足"
    SELF_ALLOCATION = "门店自身缺货同时有库存（已优先内部调拨）"
    PARTIAL_FULFILLED = "仅部分满足"
    STORE_NOT_FOUND = "门店不存在"
    SKU_NOT_MATCHED = "SKU无法匹配"
    TRANSPORT_NOT_WORTH = "运输不划算"
    MANUAL_REJECT = "人工拒绝"


@dataclass
class ShortageRecord:
    store_id: str
    store_name: str
    sku: str
    sku_name: str
    shortage_qty: int
    canonical_sku: str = ""
    priority: int = 1


@dataclass
class StockRecord:
    store_id: str
    store_name: str
    sku: str
    sku_name: str
    stock_qty: int
    canonical_sku: str = ""
    available_qty: int = 0


@dataclass
class TransportRoute:
    from_store: str
    to_store: str
    transport_days: int


@dataclass
class SafetyStock:
    sku: str
    safety_qty: int
    canonical_sku: str = ""


@dataclass
class SkuAlias:
    sku_alias: str
    canonical_sku: str


@dataclass
class AllocationItem:
    allocation_id: str = ""
    from_store_id: str = ""
    from_store_name: str = ""
    to_store_id: str = ""
    to_store_name: str = ""
    sku: str = ""
    sku_name: str = ""
    canonical_sku: str = ""
    suggested_qty: int = 0
    actual_qty: int = 0
    transport_days: int = 0
    priority: int = 1
    unexecuted_reason: str = ""
    remarks: str = ""
    status: str = "pending"


@dataclass
class UnmetRecord:
    store_id: str
    store_name: str
    sku: str
    sku_name: str
    canonical_sku: str
    shortage_qty: int
    fulfilled_qty: int
    unmet_qty: int
    reason: UnmetReason
    detail: str = ""


@dataclass
class ProcessResult:
    allocations: List[AllocationItem] = field(default_factory=list)
    unmet_records: List[UnmetRecord] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    self_allocation_stores: List[Tuple[str, str]] = field(default_factory=list)
    duplicate_records: List[str] = field(default_factory=list)
    unmatched_skus: List[str] = field(default_factory=list)


@dataclass
class BatchInfo:
    batch_id: str
    created_at: datetime
    shortage_file: str
    stock_file: str
    transport_file: str
    safety_file: str
    sku_alias_file: str = ""
    total_shortage_qty: int = 0
    total_allocated_qty: int = 0
    total_unmet_qty: int = 0
    fill_rate: float = 0.0
    status: str = "generated"
    filled_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        return {
            "batch_id": self.batch_id,
            "created_at": self.created_at.isoformat(),
            "shortage_file": self.shortage_file,
            "stock_file": self.stock_file,
            "transport_file": self.transport_file,
            "safety_file": self.safety_file,
            "sku_alias_file": self.sku_alias_file,
            "total_shortage_qty": self.total_shortage_qty,
            "total_allocated_qty": self.total_allocated_qty,
            "total_unmet_qty": self.total_unmet_qty,
            "fill_rate": self.fill_rate,
            "status": self.status,
            "filled_at": self.filled_at.isoformat() if self.filled_at else None,
        }
