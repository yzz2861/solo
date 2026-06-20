from dataclasses import dataclass, field
from datetime import date
from typing import Optional, Dict, List
from enum import Enum


class OrderStatus(str, Enum):
    FULLY_DELIVERED = "已到货"
    PARTIALLY_DELIVERED = "部分到货"
    DELAYED = "延期"
    PENDING = "待到货"
    NO_PROMISE = "无承诺"
    PROMISED_PENDING = "承诺未到"


@dataclass
class PurchaseOrder:
    order_no: str
    order_line: Optional[str] = None
    material_code: str = ""
    material_name: str = ""
    supplier_full: str = ""
    supplier_short: str = ""
    quantity: float = 0.0
    unit: str = ""
    plan_date: Optional[date] = None
    remark: str = ""
    is_split: bool = False
    parent_order: Optional[str] = None

    @property
    def order_key(self) -> str:
        if self.order_line:
            return f"{self.order_no}-{self.order_line}"
        return self.order_no


@dataclass
class DeliveryPromise:
    order_no: str
    order_line: Optional[str] = None
    material_code: str = ""
    supplier_full: str = ""
    supplier_short: str = ""
    promise_date: Optional[date] = None
    promise_quantity: Optional[float] = None
    batch_no: Optional[str] = None
    is_partial: bool = False
    source: str = ""
    remark: str = ""

    @property
    def order_key(self) -> str:
        if self.order_line:
            return f"{self.order_no}-{self.order_line}"
        return self.order_no


@dataclass
class ArrivalRecord:
    order_no: str
    order_line: Optional[str] = None
    material_code: str = ""
    supplier_full: str = ""
    arrival_date: Optional[date] = None
    arrival_quantity: float = 0.0
    unit: str = ""
    batch_no: Optional[str] = None
    warehouse: str = ""
    remark: str = ""

    @property
    def order_key(self) -> str:
        if self.order_line:
            return f"{self.order_no}-{self.order_line}"
        return self.order_no


@dataclass
class MatchedOrder:
    purchase_order: PurchaseOrder
    promises: List[DeliveryPromise] = field(default_factory=list)
    arrivals: List[ArrivalRecord] = field(default_factory=list)
    status: OrderStatus = OrderStatus.NO_PROMISE
    delivered_quantity: float = 0.0
    remaining_quantity: float = 0.0
    latest_promise_date: Optional[date] = None
    latest_arrival_date: Optional[date] = None
    delay_days: int = 0
    has_promise: bool = False
    has_arrival: bool = False
    is_partial_batch: bool = False
    notes: List[str] = field(default_factory=list)

    @property
    def order_key(self) -> str:
        return self.purchase_order.order_key

    @property
    def delivery_rate(self) -> float:
        if self.purchase_order.quantity == 0:
            return 0.0
        return round(self.delivered_quantity / self.purchase_order.quantity * 100, 1)


SUPPLIER_SHORT_NAMES: Dict[str, str] = {
    "深圳市华强电子有限公司": "华强电子",
    "苏州精密模具制造有限公司": "苏州精模",
    "上海五金材料股份有限公司": "上海五金",
    "东莞市塑胶制品厂": "东莞塑胶",
    "广州市化工原料有限公司": "广州化工",
    "佛山市陶瓷建材集团": "佛山陶瓷",
    "北京市机械设备制造厂": "北京机械",
    "杭州电子元器件有限公司": "杭州电子",
    "南京钢铁联合有限公司": "南京钢铁",
    "武汉汽车零部件股份公司": "武汉汽配",
    "成都包装材料有限公司": "成都包装",
    "青岛纺织品进出口公司": "青岛纺织",
}

DEFAULT_SUPPLIER_COLUMNS = {
    "采购单": {
        "order_no": ["订单号", "采购单号", "PO号", "PO编号", "order_no", "po_no"],
        "order_line": ["行号", "订单行号", "line_no", "item_no"],
        "material_code": ["物料编码", "物料号", "料号", "SKU", "material_code", "sku"],
        "material_name": ["物料名称", "品名", "规格型号", "material_name", "description"],
        "supplier_full": ["供应商", "供应商名称", "全称", "supplier", "vendor"],
        "quantity": ["数量", "采购数量", "下单数量", "quantity", "qty"],
        "unit": ["单位", "计量单位", "unit", "uom"],
        "plan_date": ["计划交期", "要求交期", "需求日期", "plan_date", "required_date"],
        "remark": ["备注", "remark", "note", "comment"],
    },
    "承诺表": {
        "order_no": ["订单号", "采购单号", "PO号", "PO编号", "order_no", "po_no"],
        "order_line": ["行号", "订单行号", "line_no", "item_no"],
        "material_code": ["物料编码", "物料号", "料号", "material_code"],
        "supplier_full": ["供应商", "供应商名称", "supplier", "vendor"],
        "promise_date": ["承诺交期", "回复交期", "答应日期", "promise_date", "confirmed_date"],
        "promise_quantity": ["承诺数量", "回复数量", "promise_qty", "confirmed_qty"],
        "batch_no": ["批次号", "分批号", "batch_no", "batch"],
        "source": ["来源", "邮件", "source", "email"],
        "remark": ["备注", "remark", "note"],
    },
    "到货表": {
        "order_no": ["订单号", "采购单号", "PO号", "order_no", "po_no"],
        "order_line": ["行号", "订单行号", "line_no", "item_no"],
        "material_code": ["物料编码", "物料号", "料号", "material_code"],
        "supplier_full": ["供应商", "供应商名称", "supplier", "vendor"],
        "arrival_date": ["到货日期", "入库日期", "收货日期", "arrival_date", "receipt_date"],
        "arrival_quantity": ["到货数量", "入库数量", "收货数量", "arrival_qty", "receipt_qty", "quantity"],
        "unit": ["单位", "计量单位", "unit", "uom"],
        "batch_no": ["批次号", "batch_no", "batch"],
        "warehouse": ["仓库", "库位", "warehouse", "location"],
        "remark": ["备注", "remark", "note"],
    },
}
