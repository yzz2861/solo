from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class MaterialCategory(str, Enum):
    BUTTON = "纽扣"
    ZIPPER = "拉链"
    HANG_TAG = "吊牌"
    LABEL = "商标"
    THREAD = "线"
    RIBBON = "织带"
    BUCKLE = "扣具"
    OTHER = "其他"


class UrgencyLevel(str, Enum):
    NORMAL = "正常"
    URGENT = "紧急"
    RUSH = "特急"


class AnomalyType(str, Enum):
    SPEC_INCONSISTENT = "规格写法不一致"
    DIFFERENT_COLOR_SAME_STYLE = "同款不同色"
    URGENT_REPLENISH = "紧急补单"
    DUPLICATE_SUBMISSION = "重复提交"
    BELOW_MOQ = "低于最小起订量"
    DELIVERY_CONFLICT = "交期冲突"
    MATERIAL_SWAP = "临时换料"
    MISSING_FIELD = "字段缺失"
    UNKNOWN_SUPPLIER = "供应商未指定"


@dataclass
class PurchaseRequirement:
    """单条辅料采购需求记录"""
    source_file: str
    source_sheet: Optional[str]
    style_no: str
    style_name: Optional[str]
    material_category: MaterialCategory
    material_name: str
    color: str
    color_code: Optional[str]
    spec_raw: str
    spec_normalized: str
    supplier: Optional[str]
    quantity: float
    unit: str
    unit_price: Optional[float]
    moq: Optional[float]
    delivery_date: Optional[date]
    urgency: UrgencyLevel
    submitted_by: Optional[str]
    submitted_at: Optional[datetime]
    remark: Optional[str]
    swap_reason: Optional[str]
    is_replenishment: bool = False
    row_index: int = 0
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AnomalyRecord:
    """异常记录"""
    anomaly_type: AnomalyType
    description: str
    related_style_nos: List[str]
    related_material: str
    related_spec: str
    related_color: str
    severity: str = "warning"
    suggestion: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MergedPurchaseItem:
    """归并后的采购条目"""
    material_category: MaterialCategory
    material_name: str
    color: str
    color_code: Optional[str]
    spec_normalized: str
    supplier: Optional[str]
    total_quantity: float
    unit: str
    unit_price: Optional[float]
    moq: Optional[float]
    delivery_date: Optional[date]
    urgency: UrgencyLevel
    source_styles: List[str]
    source_quantities: Dict[str, float]
    remarks: List[str]
    anomalies: List[AnomalyRecord]
    original_specs: List[str]
    is_moq_satisfied: bool = True
    moq_shortfall: float = 0.0


@dataclass
class StyleGap:
    """款式辅料缺口"""
    style_no: str
    style_name: Optional[str]
    material_name: str
    color: str
    spec_normalized: str
    required_qty: float
    available_qty: float
    gap_qty: float
    unit: str
    reason: str
    delivery_date: Optional[date]
    urgency: UrgencyLevel


@dataclass
class MergeResult:
    """归并结果汇总"""
    merged_items: List[MergedPurchaseItem] = field(default_factory=list)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    style_gaps: List[StyleGap] = field(default_factory=list)
    raw_requirements: List[PurchaseRequirement] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
