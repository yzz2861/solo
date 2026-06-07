"""全局配置与常量定义。"""
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


class RiskLevel(str, Enum):
    """风险等级。"""
    LOW = "低风险"
    MEDIUM = "中风险"
    HIGH = "高风险"
    UNKNOWN = "无法判定"


class TaskStatus(str, Enum):
    """任务状态。"""
    PENDING = "待处理"
    RUNNING = "处理中"
    SUCCESS = "成功"
    PARTIAL = "部分成功"
    FAILED = "失败"


class ExportFormat(str, Enum):
    """导出格式。"""
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


@dataclass
class FieldMapping:
    """字段映射配置。"""
    formula_id: str = "配方编号"
    formula_name: str = "配方名称"
    ingredient_name: str = "原料名称"
    ingredient_code: str = "原料编码"
    dosage: str = "添加量"
    dosage_unit: str = "添加量单位"
    date_field: str = "生效日期"
    remark: str = "备注"


@dataclass
class BannedIngredient:
    """禁用料条目。"""
    ingredient_name: str
    ingredient_code: Optional[str] = None
    risk_level: RiskLevel = RiskLevel.HIGH
    reason: str = ""
    ban_date: Optional[str] = None


@dataclass
class ProcessContext:
    """处理上下文，贯穿整个处理流程。"""
    batch_id: str = field(default_factory=lambda: datetime.now().strftime("BATCH%Y%m%d%H%M%S"))
    source_files: List[str] = field(default_factory=list)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    export_format: ExportFormat = ExportFormat.CSV
    dry_run: bool = False
    field_mapping: FieldMapping = field(default_factory=FieldMapping)
    task_status: TaskStatus = TaskStatus.PENDING
    total_rows: int = 0
    valid_rows: int = 0
    bad_rows: int = 0
    banned_found: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    processed_at: datetime = field(default_factory=datetime.now)


RISK_LEVEL_ORDER = {
    RiskLevel.HIGH: 0,
    RiskLevel.MEDIUM: 1,
    RiskLevel.LOW: 2,
    RiskLevel.UNKNOWN: 3,
}
