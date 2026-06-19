from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List


class PhotoInfo(BaseModel):
    id: int
    photo_type: str
    file_path: str
    file_name: str
    upload_time: Optional[datetime] = None
    uploaded_by: Optional[str] = None

    class Config:
        from_attributes = True


class WashRecordBase(BaseModel):
    wash_station: Optional[str] = None
    operator: Optional[str] = None
    water_pressure: Optional[float] = None
    quality_score: Optional[int] = Field(None, ge=0, le=100)
    remark: Optional[str] = None


class WashRecordCreate(WashRecordBase):
    pass


class WashRecordResponse(WashRecordBase):
    id: int
    vehicle_record_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    is_rewash: bool = False
    rewash_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InspectionRecordBase(BaseModel):
    inspector: Optional[str] = None
    tarp_cover_ok: bool = False
    tarp_photo_taken: bool = False
    wheel_clean_ok: bool = False
    body_clean_ok: bool = False
    license_plate_clear: bool = False
    overloaded: bool = False
    need_rewash: bool = False
    remark: Optional[str] = None


class InspectionRecordCreate(InspectionRecordBase):
    pass


class InspectionRecordResponse(InspectionRecordBase):
    id: int
    vehicle_record_id: int
    inspection_time: datetime
    passed: bool
    failure_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BlockRecordBase(BaseModel):
    block_type: str
    block_reason: str
    block_operator: Optional[str] = None
    is_environmental_issue: bool = False
    remark: Optional[str] = None


class BlockRecordResponse(BlockRecordBase):
    id: int
    vehicle_record_id: int
    plate_number: str
    block_time: datetime
    resolved: bool
    resolve_time: Optional[datetime] = None
    resolve_method: Optional[str] = None
    resolve_operator: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VehicleEntryCreate(BaseModel):
    plate_number: str = Field(..., min_length=5, max_length=20, description="车牌号")
    driver_name: Optional[str] = Field(None, max_length=50, description="司机姓名")
    driver_phone: Optional[str] = Field(None, max_length=20, description="司机电话")
    vehicle_type: str = Field("渣土车", max_length=30)
    construction_site: Optional[str] = Field(None, max_length=100)
    gate_operator: Optional[str] = Field(None, max_length=50)

    @field_validator('plate_number')
    @classmethod
    def normalize_plate(cls, v: str) -> str:
        return v.strip().upper()


class VehicleLoadComplete(BaseModel):
    load_cargo: Optional[str] = Field(None, max_length=100)
    load_weight: Optional[float] = Field(None, ge=0, description="装载重量(吨)")
    operator: Optional[str] = Field(None, max_length=50)


class VehicleWashStart(BaseModel):
    wash_station: Optional[str] = Field(None, max_length=50)
    operator: Optional[str] = Field(None, max_length=50)
    is_rewash: bool = False
    rewash_reason: Optional[str] = None


class VehicleWashComplete(BaseModel):
    water_pressure: Optional[float] = None
    quality_score: Optional[int] = Field(None, ge=0, le=100)
    remark: Optional[str] = None


class VehicleInspect(BaseModel):
    inspector: Optional[str] = Field(None, max_length=50)
    tarp_cover_ok: bool = False
    tarp_photo_taken: bool = False
    wheel_clean_ok: bool = False
    body_clean_ok: bool = False
    license_plate_clear: bool = False
    overloaded: bool = False
    need_rewash: bool = False
    remark: Optional[str] = None


class VehicleExit(BaseModel):
    gate_operator: Optional[str] = Field(None, max_length=50)


class VehicleRecordResponse(BaseModel):
    id: int
    plate_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_type: str
    construction_site: Optional[str] = None

    entry_time: datetime
    load_complete_time: Optional[datetime] = None
    wash_start_time: Optional[datetime] = None
    wash_complete_time: Optional[datetime] = None
    inspection_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None

    status: str
    queue_position: Optional[int] = None

    load_cargo: Optional[str] = None
    load_weight: Optional[float] = None

    is_rewashed: bool
    rewash_count: int
    block_count: int
    last_block_reason: Optional[str] = None

    gate_operator: Optional[str] = None
    safety_officer: Optional[str] = None
    inspector: Optional[str] = None

    wash_records: List[WashRecordResponse] = []
    inspection_records: List[InspectionRecordResponse] = []
    block_records: List[BlockRecordResponse] = []
    photos: List[PhotoInfo] = []

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VehicleQueueItem(BaseModel):
    id: int
    plate_number: str
    driver_name: Optional[str] = None
    status: str
    status_text: str
    entry_time: datetime
    queue_position: Optional[int] = None
    load_complete_time: Optional[datetime] = None
    wash_complete_time: Optional[datetime] = None
    wait_minutes: int
    is_rewashed: bool
    block_count: int


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[VehicleRecordResponse]


class ApiResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: Optional[dict] = None


class BlockResolve(BaseModel):
    resolve_method: str = Field(..., max_length=100, description="解决方式")
    resolve_operator: Optional[str] = Field(None, max_length=50)
