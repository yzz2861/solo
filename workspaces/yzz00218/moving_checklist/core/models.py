"""数据模型定义"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime
import hashlib
import json
import uuid


def generate_trace_id(source: str, item_id: str, batch_no: str) -> str:
    """生成可追溯编号：来源+批次+物品ID的哈希"""
    raw = f"{source}:{batch_no}:{item_id}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16].upper()


def generate_batch_no() -> str:
    """生成批次号：时间戳+随机后缀"""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"B{ts}{suffix}"


@dataclass
class MovingItem:
    """搬家物品条目"""
    item_id: str
    name: str
    category: str
    quantity: int
    weight_kg: float
    volume_cbm: float
    value: float
    fragile: bool = False
    need_packing: bool = True
    special_handling: str = ""
    source: str = ""
    remark: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationRule:
    """校验规则"""
    rule_id: str
    rule_name: str
    field: str
    operator: str
    threshold: Any
    severity: str = "error"
    description: str = ""


@dataclass
class ParameterConfig:
    """参数配置"""
    config_id: str = "default"
    config_name: str = "默认参数"
    max_weight_per_item_kg: float = 200.0
    max_volume_per_item_cbm: float = 5.0
    max_value_per_item: float = 100000.0
    max_total_weight_kg: float = 5000.0
    max_total_volume_cbm: float = 30.0
    min_quantity: int = 1
    max_quantity: int = 1000
    required_fields: List[str] = field(default_factory=lambda: [
        "item_id", "name", "category", "quantity", "weight_kg", "volume_cbm", "value"
    ])
    valid_categories: List[str] = field(default_factory=lambda: [
        "家具", "电器", "衣物", "厨房用品", "书籍", "装饰品", "杂物", "易碎品", "贵重物品"
    ])
    fragile_categories: List[str] = field(default_factory=lambda: [
        "易碎品", "装饰品", "厨房用品"
    ])
    export_format: str = "csv"
    output_dir: str = "data/output"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ParameterConfig":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationIssue:
    """校验问题"""
    item_id: str
    trace_id: str
    rule_id: str
    rule_name: str
    field: str
    actual_value: Any
    expected_value: Any
    severity: str
    description: str
    batch_no: str
    source: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProcessResult:
    """处理结果"""
    batch_no: str
    source: str
    process_time: str
    total_count: int
    passed_count: int
    failed_count: int
    passed_items: List[Dict[str, Any]] = field(default_factory=list)
    failed_items: List[Dict[str, Any]] = field(default_factory=list)
    issues: List[Dict[str, Any]] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    previous_batch_no: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def load_items_from_json(file_path: str) -> List[MovingItem]:
    """从JSON文件加载物品清单"""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = []
    for item_data in data:
        items.append(MovingItem(**item_data))
    return items


def load_config_from_json(file_path: str) -> ParameterConfig:
    """从JSON文件加载参数配置"""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ParameterConfig.from_dict(data)
