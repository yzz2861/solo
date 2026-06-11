from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AppointmentCreate(BaseModel):
    shipping_company: str = Field(..., max_length=64)
    ship_name: str = Field(..., max_length=64)
    container_type: str = Field(..., max_length=16)
    pickup_date: date
    driver_name: str = Field(..., max_length=32)
    driver_phone: str = Field(..., max_length=20)
    vehicle_plate: str = Field(..., max_length=16)


class AppointmentOut(BaseModel):
    id: int
    appointment_no: str
    shipping_company: str
    ship_name: str
    container_type: str
    pickup_date: date
    driver_name: str
    driver_phone: str
    vehicle_plate: str
    status: str
    reject_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AppointmentApprove(BaseModel):
    operator: str = Field(default="system", max_length=32)


class AppointmentReject(BaseModel):
    reason: str = Field(..., max_length=256)
    operator: str = Field(default="system", max_length=32)


class GateRelease(BaseModel):
    operator: str = Field(default="gate_operator", max_length=32)


class GateCancel(BaseModel):
    reason: str = Field(..., max_length=256)
    operator: str = Field(default="gate_operator", max_length=32)


class CheckIn(BaseModel):
    operator: str = Field(default="gate_operator", max_length=32)


class TimeoutMark(BaseModel):
    operator: str = Field(default="system", max_length=32)


class OperationLogOut(BaseModel):
    id: int
    appointment_id: int
    operation_type: str
    operator: str
    detail: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryCreate(BaseModel):
    shipping_company: str = Field(..., max_length=64)
    ship_name: str = Field(..., max_length=64)
    container_type: str = Field(..., max_length=16)
    total_qty: int = Field(..., ge=0)


class InventoryOut(BaseModel):
    id: int
    shipping_company: str
    ship_name: str
    container_type: str
    total_qty: int
    occupied_qty: int
    available_qty: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    unreleased_count: int
    occupied_count: int
    rejected_count: int
    timeout_count: int


class DashboardDetail(AppointmentOut):
    pass


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    unreleased: List[DashboardDetail]
    occupied: List[DashboardDetail]
    rejected: List[DashboardDetail]
    timeout: List[DashboardDetail]


class FilterResult(BaseModel):
    total: int
    items: List[AppointmentOut]
