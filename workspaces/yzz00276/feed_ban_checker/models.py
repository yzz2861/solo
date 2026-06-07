"""数据模型与结果封装。"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime

from .config import RiskLevel, TaskStatus


@dataclass
class FormulaRow:
    """单条配方原料行。"""
    row_index: int
    source_file: str
    formula_id: str = ""
    formula_name: str = ""
    ingredient_name: str = ""
    ingredient_code: str = ""
    dosage: float = 0.0
    dosage_unit: str = ""
    effective_date: str = ""
    remark: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BadRow:
    """坏行记录。"""
    row_index: int
    source_file: str
    raw_data: Dict[str, Any]
    error_type: str
    error_message: str


@dataclass
class CheckResult:
    """单条禁用料检查结果。"""
    row: FormulaRow
    is_banned: bool
    risk_level: RiskLevel
    banned_ingredient_name: str = ""
    matched_by: str = ""
    reason: str = ""
    check_time: datetime = field(default_factory=datetime.now)


@dataclass
class DiffRecord:
    """差异记录。"""
    row_index: int
    source_file: str
    formula_id: str
    field_name: str
    original_value: str
    expected_value: str
    diff_type: str


@dataclass
class ProcessResult:
    """整体处理结果。"""
    batch_id: str
    source_files: List[str]
    task_status: TaskStatus
    total_rows: int = 0
    valid_rows: int = 0
    bad_rows: int = 0
    banned_count: int = 0
    low_risk_count: int = 0
    medium_risk_count: int = 0
    high_risk_count: int = 0
    unknown_risk_count: int = 0
    formula_rows: List[FormulaRow] = field(default_factory=list)
    bad_rows_list: List[BadRow] = field(default_factory=list)
    check_results: List[CheckResult] = field(default_factory=list)
    diff_records: List[DiffRecord] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    output_files: Dict[str, str] = field(default_factory=dict)
    log_file: str = ""
    processed_at: datetime = field(default_factory=datetime.now)

    def risk_summary(self) -> Dict[str, int]:
        return {
            "高风险": self.high_risk_count,
            "中风险": self.medium_risk_count,
            "低风险": self.low_risk_count,
            "无法判定": self.unknown_risk_count,
        }
