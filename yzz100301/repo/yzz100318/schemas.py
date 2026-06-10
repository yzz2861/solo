from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ConstructionApplicationBase(BaseModel):
    application_no: str
    line_name: str
    section: str
    start_km: float
    end_km: float
    construction_type: Optional[str] = None
    construction_content: Optional[str] = None
    start_time: datetime
    end_time: datetime
    responsible_person: str
    phone: Optional[str] = None
    status: Optional[str] = "待审批"
    review_opinion: Optional[str] = None
    batch_no: Optional[str] = None


class ConstructionApplicationCreate(ConstructionApplicationBase):
    source_file: Optional[str] = None


class ConstructionApplicationUpdate(BaseModel):
    status: Optional[str] = None
    review_opinion: Optional[str] = None
    responsible_person: Optional[str] = None
    phone: Optional[str] = None


class ConstructionApplicationOut(ConstructionApplicationBase):
    id: int
    source_file: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SkylightPlanBase(BaseModel):
    plan_no: str
    line_name: str
    section: str
    start_km: float
    end_km: float
    skylight_type: Optional[str] = None
    start_time: datetime
    end_time: datetime
    construction_content: Optional[str] = None
    responsible_person: str
    phone: Optional[str] = None
    status: Optional[str] = "已批准"
    review_opinion: Optional[str] = None
    application_id: Optional[int] = None
    batch_no: Optional[str] = None


class SkylightPlanCreate(SkylightPlanBase):
    source_file: Optional[str] = None


class SkylightPlanUpdate(BaseModel):
    status: Optional[str] = None
    review_opinion: Optional[str] = None
    responsible_person: Optional[str] = None
    phone: Optional[str] = None


class SkylightPlanOut(SkylightPlanBase):
    id: int
    source_file: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TemporaryBlockBase(BaseModel):
    block_no: str
    line_name: str
    section: str
    start_km: float
    end_km: float
    block_reason: Optional[str] = None
    start_time: datetime
    end_time: datetime
    responsible_person: str
    phone: Optional[str] = None
    status: Optional[str] = "待复核"
    review_opinion: Optional[str] = None
    plan_id: Optional[int] = None
    batch_no: Optional[str] = None


class TemporaryBlockCreate(TemporaryBlockBase):
    source_file: Optional[str] = None


class TemporaryBlockUpdate(BaseModel):
    status: Optional[str] = None
    review_opinion: Optional[str] = None
    responsible_person: Optional[str] = None
    phone: Optional[str] = None


class TemporaryBlockOut(TemporaryBlockBase):
    id: int
    source_file: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConflictRecordOut(BaseModel):
    id: int
    conflict_type: str
    line_name: str
    section: str
    start_km: float
    end_km: float
    item_a_type: Optional[str] = None
    item_a_id: Optional[int] = None
    item_a_no: Optional[str] = None
    item_a_start: Optional[datetime] = None
    item_a_end: Optional[datetime] = None
    item_a_person: Optional[str] = None
    item_b_type: Optional[str] = None
    item_b_id: Optional[int] = None
    item_b_no: Optional[str] = None
    item_b_start: Optional[datetime] = None
    item_b_end: Optional[datetime] = None
    item_b_person: Optional[str] = None
    overlap_start: Optional[datetime] = None
    overlap_end: Optional[datetime] = None
    overlap_km_start: Optional[float] = None
    overlap_km_end: Optional[float] = None
    severity: Optional[str] = "中等"
    status: Optional[str] = "待处理"
    handle_opinion: Optional[str] = None
    detected_at: Optional[datetime] = None
    handled_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConflictHandleUpdate(BaseModel):
    status: str
    handle_opinion: Optional[str] = None


class ImportResult(BaseModel):
    total: int = 0
    created: int = 0
    skipped: int = 0
    updated: int = 0
    errors: List[str] = []


class ConflictQueryParams(BaseModel):
    line_name: Optional[str] = None
    conflict_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
