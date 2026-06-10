"""数据模型定义。"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any


SCAN_TYPES = ("outbound", "arrive", "return", "clean")
"""扫码环节类型：出库、到店、回仓、清洗。"""


@dataclass
class ScanRecord:
    """单条扫码记录。

    Attributes:
        box_id: 箱号
        scan_type: 扫码类型（outbound/arrive/return/clean）
        scan_time: 扫码时间
        store: 门店名称（到店/出库时的目标门店）
        temperature: 温度（摄氏度），可选
        source: 数据来源（csv/manual）
        source_file: 来源文件名
        source_line: 来源文件行号（原始行号，从1开始）
        raw: 原始数据字典，用于报告回溯
        fingerprint: 去重指纹
    """

    box_id: str
    scan_type: str
    scan_time: datetime
    store: str = ""
    temperature: Optional[float] = None
    source: str = "csv"
    source_file: str = ""
    source_line: int = 0
    raw: Dict[str, Any] = field(default_factory=dict)
    fingerprint: str = ""

    def __post_init__(self):
        if self.scan_type not in SCAN_TYPES:
            raise ValueError(f"无效的扫码类型: {self.scan_type}")
        if not self.fingerprint:
            self.fingerprint = self._make_fingerprint()

    def _make_fingerprint(self) -> str:
        """生成去重指纹。

        同一箱子、同一环节、同一分钟内的扫码视为重复。
        """
        ts = self.scan_time.strftime("%Y%m%d%H%M")
        return f"{self.box_id}|{self.scan_type}|{ts}|{self.store}"


@dataclass
class BoxLifecycle:
    """单个箱子的全生命周期。"""

    box_id: str
    outbound: Optional[ScanRecord] = None
    arrive: Optional[ScanRecord] = None
    return_: Optional[ScanRecord] = None
    clean: Optional[ScanRecord] = None
    anomalies: List["Anomaly"] = field(default_factory=list)

    @property
    def is_complete(self) -> bool:
        """是否走完了完整流程：出库→到店→回仓→清洗。"""
        return all([self.outbound, self.arrive, self.return_, self.clean])

    @property
    def status(self) -> str:
        """当前状态描述。"""
        if self.clean:
            return "已清洗"
        if self.return_:
            return "已回仓"
        if self.arrive:
            return "已到店"
        if self.outbound:
            return "已出库"
        return "未知"


@dataclass
class Anomaly:
    """异常记录。

    Attributes:
        level: 严重级别（warning/error）
        category: 异常类别（duplicate/missing/temp_jump/store_mismatch/...）
        message: 异常描述
        box_id: 关联箱号
        scan_type: 关联环节
        source_file: 来源文件
        source_line: 来源行号
        raw: 原始数据行
    """

    level: str
    category: str
    message: str
    box_id: str = ""
    scan_type: str = ""
    source_file: str = ""
    source_line: int = 0
    raw: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchResult:
    """一个盘点批次的结果。"""

    batch_id: str
    batch_date: str  # YYYY-MM-DD
    created_at: datetime
    total_boxes: int = 0
    complete_boxes: int = 0
    records: List[ScanRecord] = field(default_factory=list)
    boxes: Dict[str, BoxLifecycle] = field(default_factory=dict)
    anomalies: List[Anomaly] = field(default_factory=list)
    source_files: List[str] = field(default_factory=list)

    @property
    def missing_boxes(self) -> List[BoxLifecycle]:
        """缺箱：出库了但未回仓（真正丢失风险）。"""
        result = []
        for box in self.boxes.values():
            if box.outbound and not box.return_:
                result.append(box)
        return result

    @property
    def unwashed_boxes(self) -> List[BoxLifecycle]:
        """未清洗箱：回仓了但未清洗。"""
        result = []
        for box in self.boxes.values():
            if box.return_ and not box.clean:
                result.append(box)
        return result

    @property
    def over_temp_boxes(self) -> List[BoxLifecycle]:
        """超温箱：温度超过阈值。"""
        result = []
        for box in self.boxes.values():
            for rec in (box.outbound, box.arrive, box.return_, box.clean):
                if rec and rec.temperature is not None and rec.temperature > 8:
                    result.append(box)
                    break
        return result

    @property
    def store_diff_boxes(self) -> List[BoxLifecycle]:
        """门店签收差异：出库门店与到店门店不一致。"""
        result = []
        for box in self.boxes.values():
            if box.outbound and box.arrive:
                if box.outbound.store and box.arrive.store:
                    if box.outbound.store != box.arrive.store:
                        result.append(box)
        return result
