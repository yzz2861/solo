from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DefectStatus(str, Enum):
    DISCOVERED = "discovered"
    DISPATCHED = "dispatched"
    REPAIRED = "repaired"
    RECHECKED = "rechecked"
    CLOSED = "closed"


class DefectSeverity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"


class DefectSource(str, Enum):
    DRONE = "drone"
    MANUAL = "manual"


class ComponentBase(BaseModel):
    component_code: str
    model: Optional[str] = ""
    capacity: Optional[float] = 0.0
    location: Optional[str] = ""
    install_date: Optional[str] = ""
    manufacturer: Optional[str] = ""
    string_code: Optional[str] = ""
    array_code: Optional[str] = ""
    remark: Optional[str] = ""


class ComponentCreate(ComponentBase):
    pass


class Component(ComponentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DefectBase(BaseModel):
    defect_code: str
    component_code: str
    defect_type: Optional[str] = ""
    severity: Optional[DefectSeverity] = DefectSeverity.MINOR
    source: Optional[DefectSource] = DefectSource.DRONE
    status: Optional[DefectStatus] = DefectStatus.DISCOVERED
    discovery_time: Optional[datetime] = None
    discovery_image: Optional[str] = ""
    position_detail: Optional[str] = ""
    temperature: Optional[float] = 0.0
    description: Optional[str] = ""


class DefectCreate(DefectBase):
    pass


class DefectUpdate(BaseModel):
    defect_type: Optional[str] = None
    severity: Optional[DefectSeverity] = None
    description: Optional[str] = None
    recheck_opinion: Optional[str] = None
    recheck_result: Optional[str] = None
    recheck_passed: Optional[str] = None


class Defect(DefectBase):
    id: int
    dispatch_time: Optional[datetime] = None
    repairer: Optional[str] = ""
    repair_time: Optional[datetime] = None
    repair_content: Optional[str] = ""
    spare_parts: Optional[str] = ""
    spare_parts_cost: Optional[float] = 0.0
    recheck_time: Optional[datetime] = None
    recheck_result: Optional[str] = ""
    recheck_passed: Optional[str] = "pending"
    recheck_opinion: Optional[str] = ""
    rechecker: Optional[str] = ""
    close_time: Optional[datetime] = None
    close_opinion: Optional[str] = ""
    severity_history: Optional[str] = ""
    batch_id: Optional[int] = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComponentDetail(Component):
    defects: List[Defect] = []

    class Config:
        from_attributes = True


class ImportResult(BaseModel):
    success: bool
    message: str
    total_count: int
    new_count: int
    skipped_count: int
    updated_count: Optional[int] = 0
    batch_hash: str


class RecheckUpdate(BaseModel):
    recheck_opinion: str
    recheck_result: Optional[str] = "passed"
    recheck_passed: Optional[str] = "yes"
    rechecker: Optional[str] = ""


class ClosedLoopReportItem(BaseModel):
    defect_code: str
    component_code: str
    defect_type: str
    severity: str
    status: str
    discovery_time: Optional[datetime]
    repair_time: Optional[datetime]
    recheck_time: Optional[datetime]
    close_time: Optional[datetime]
    recheck_result: str
    recheck_opinion: str
    spare_parts: str
    spare_parts_cost: float
    cycle_days: Optional[float] = None


class ClosedLoopReport(BaseModel):
    total_defects: int
    closed_count: int
    in_progress_count: int
    closed_rate: float
    average_cycle_days: float
    items: List[ClosedLoopReportItem]
