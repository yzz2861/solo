"""核心数据模型"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from enum import Enum
import hashlib
import json
from datetime import datetime


class PlotStatus(str, Enum):
    """地块状态"""
    PENDING = "pending"       # 待处理
    SUCCESS = "success"       # 已分配
    FAILED = "failed"         # 分配失败
    REVIEW = "review"         # 需人工复核


class TaskStatus(str, Enum):
    """任务状态"""
    CREATED = "created"
    VALIDATED = "validated"
    GENERATED = "generated"
    EXPORTED = "exported"
    FAILED = "failed"


@dataclass
class Plot:
    """地块信息"""
    plot_id: str
    plot_name: str
    area: float           # 亩
    crop_type: str        # 作物类型
    district: str         # 片区/管理区
    water_requirement: float  # 每亩需水量 (m³)
    priority: int = 3     # 优先级 1-5，1最高
    source_file: str = ""
    source_line: int = 0

    @property
    def total_water(self) -> float:
        return self.area * self.water_requirement


@dataclass
class IrrigationRule:
    """轮灌规则"""
    group_name: str
    max_plots: int = 10            # 每组最多地块数
    max_area: float = 500.0        # 每组最大面积 (亩)
    max_water: float = 20000.0     # 每组最大用水量 (m³)
    duration_hours: float = 8.0    # 灌溉时长 (小时)
    start_date: str = ""           # 开始日期 YYYY-MM-DD
    interval_days: int = 7         # 轮灌间隔 (天)
    max_groups: int = 100          # 最多创建多少个轮灌组（用于限制资源）
    crop_filter: Optional[List[str]] = None  # 适用作物，None表示全部
    district_filter: Optional[List[str]] = None  # 适用片区


@dataclass
class RotationGroup:
    """轮灌组"""
    group_id: str
    group_name: str
    sequence: int               # 轮灌次序
    plots: List[Plot] = field(default_factory=list)
    start_time: str = ""        # 开始时间
    end_time: str = ""          # 结束时间

    @property
    def total_area(self) -> float:
        return sum(p.area for p in self.plots)

    @property
    def total_water(self) -> float:
        return sum(p.total_water for p in self.plots)

    @property
    def plot_count(self) -> int:
        return len(self.plots)


@dataclass
class PlotResult:
    """单地块处理结果"""
    plot_id: str
    plot_name: str
    status: PlotStatus
    group_id: str = ""
    group_name: str = ""
    sequence: int = 0
    start_time: str = ""
    end_time: str = ""
    error_reason: str = ""
    review_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "plot_id": self.plot_id,
            "plot_name": self.plot_name,
            "status": self.status.value,
            "group_id": self.group_id,
            "group_name": self.group_name,
            "sequence": self.sequence,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_reason": self.error_reason,
            "review_reason": self.review_reason,
        }


@dataclass
class BatchInfo:
    """批次信息"""
    batch_id: str
    batch_name: str
    created_at: str
    input_hash: str          # 输入内容哈希，用于幂等校验
    source_files: List[str] = field(default_factory=list)

    @classmethod
    def generate_id(cls) -> str:
        return f"B{datetime.now().strftime('%Y%m%d%H%M%S')}"

    @classmethod
    def compute_hash(cls, plots: List[Plot], rules: List[IrrigationRule]) -> str:
        data = {
            "plots": sorted([asdict(p) for p in plots], key=lambda x: x["plot_id"]),
            "rules": sorted([asdict(r) for r in rules], key=lambda x: x["group_name"]),
        }
        raw = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


@dataclass
class Snapshot:
    """历史快照"""
    batch_id: str
    batch_name: str
    input_hash: str
    created_at: str
    result_count: int
    success_count: int
    failed_count: int
    review_count: int
    results: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "batch_id": self.batch_id,
            "batch_name": self.batch_name,
            "input_hash": self.input_hash,
            "created_at": self.created_at,
            "result_count": self.result_count,
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "review_count": self.review_count,
            "results": self.results,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Snapshot":
        return cls(
            batch_id=data["batch_id"],
            batch_name=data["batch_name"],
            input_hash=data["input_hash"],
            created_at=data["created_at"],
            result_count=data["result_count"],
            success_count=data["success_count"],
            failed_count=data["failed_count"],
            review_count=data["review_count"],
            results=data.get("results", []),
        )


@dataclass
class ScheduleResult:
    """调度总结果"""
    batch: BatchInfo
    status: TaskStatus
    groups: List[RotationGroup] = field(default_factory=list)
    plot_results: List[PlotResult] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    is_idempotent: bool = False     # 是否命中缓存（幂等）
    source_batch_id: str = ""       # 来源批次号（幂等复用时）

    @property
    def total_plots(self) -> int:
        return len(self.plot_results)

    @property
    def success_count(self) -> int:
        return sum(1 for r in self.plot_results if r.status == PlotStatus.SUCCESS)

    @property
    def failed_count(self) -> int:
        return sum(1 for r in self.plot_results if r.status == PlotStatus.FAILED)

    @property
    def review_count(self) -> int:
        return sum(1 for r in self.plot_results if r.status == PlotStatus.REVIEW)
