"""数据模型定义"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import hashlib
import json


@dataclass
class AppointmentRecord:
    """预约记录 - 业务台账中的一行数据"""
    source_id: str
    patient_id: str
    patient_name: str
    therapist_id: str
    therapist_name: str
    treatment_type: str
    appointment_date: str
    start_time: str
    end_time: str
    room: str
    source_system: str
    status: str = "pending"

    def row_hash(self) -> str:
        """计算行数据的哈希值，用于幂等判断与变更追溯
        包含源数据所有业务字段，确保任何源数据变更都能被检测到
        """
        data = (
            f"{self.source_id}|{self.patient_id}|{self.patient_name}|"
            f"{self.therapist_id}|{self.therapist_name}|{self.treatment_type}|"
            f"{self.appointment_date}|{self.start_time}|{self.end_time}|"
            f"{self.room}|{self.source_system}|{self.status}"
        )
        return hashlib.md5(data.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ConfigParams:
    """参数配置"""
    batch_id: str
    check_overlap: bool = True
    check_room_conflict: bool = True
    check_therapist_conflict: bool = True
    check_patient_conflict: bool = True
    allowed_overlap_minutes: int = 0
    treatment_types: Optional[List[str]] = None
    risk_levels: Optional[Dict[str, str]] = None
    operator: str = "system"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConfigParams":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ProcessResult:
    """处理结果 - 单条记录的处理结果"""
    source_id: str
    row_hash: str
    status: str
    risk_label: str = ""
    conflict_with: List[str] = field(default_factory=list)
    error_message: str = ""
    batch_id: str = ""
    processed_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BatchSummary:
    """批次汇总"""
    batch_id: str
    total_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    conflict_count: int = 0
    high_risk_count: int = 0
    medium_risk_count: int = 0
    low_risk_count: int = 0
    operator: str = ""
    processed_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DiffRecord:
    """差异记录 - 与上次结果的对比"""
    source_id: str
    diff_type: str
    field_name: str
    old_value: str
    new_value: str
    batch_id: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LogEntry:
    """操作日志"""
    timestamp: str
    level: str
    batch_id: str
    action: str
    message: str
    details: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
