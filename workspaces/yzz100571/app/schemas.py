from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator

from .models import UserRole, RackRequestStatus, AuditAction


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None


class UserBase(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class CabinetBase(BaseModel):
    name: str
    location: str
    total_u: int = Field(default=42, ge=1, le=48)
    max_power_watts: int = Field(gt=0)
    description: Optional[str] = None


class CabinetCreate(CabinetBase):
    pass


class CabinetUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    total_u: Optional[int] = Field(default=None, ge=1, le=48)
    max_power_watts: Optional[int] = Field(default=None, gt=0)
    description: Optional[str] = None


class CabinetResponse(CabinetBase):
    id: int
    current_power_watts: int
    created_at: datetime
    used_u_count: Optional[int] = None
    utilization_rate: Optional[float] = None

    class Config:
        from_attributes = True


class PDUBase(BaseModel):
    cabinet_id: int
    name: str
    total_ports: int = Field(default=8, ge=1)
    max_current_amps: float = Field(default=16.0, gt=0)
    voltage: int = Field(default=220, gt=0)


class PDUCreate(PDUBase):
    pass


class PDUResponse(PDUBase):
    id: int
    created_at: datetime
    used_ports: Optional[int] = None

    class Config:
        from_attributes = True


class PDUPortBase(BaseModel):
    pdu_id: int
    port_number: int = Field(ge=1)


class PDUPortCreate(PDUPortBase):
    pass


class PDUPortResponse(PDUPortBase):
    id: int
    is_occupied: bool
    occupied_by: Optional[int] = None
    power_draw_watts: int
    created_at: datetime
    released_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SwitchBase(BaseModel):
    cabinet_id: int
    name: str
    model: Optional[str] = None
    total_ports: int = Field(default=48, ge=1)


class SwitchCreate(SwitchBase):
    pass


class SwitchResponse(SwitchBase):
    id: int
    created_at: datetime
    used_ports: Optional[int] = None

    class Config:
        from_attributes = True


class SwitchPortBase(BaseModel):
    switch_id: int
    port_number: int = Field(ge=1)


class SwitchPortCreate(SwitchPortBase):
    pass


class SwitchPortResponse(SwitchPortBase):
    id: int
    is_occupied: bool
    occupied_by: Optional[int] = None
    created_at: datetime
    released_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeviceModelBase(BaseModel):
    brand: str
    model: str
    height_u: int = Field(gt=0)
    power_watts: int = Field(gt=0)
    network_ports: int = Field(default=2, ge=1)
    power_ports: int = Field(default=2, ge=1)
    description: Optional[str] = None


class DeviceModelCreate(DeviceModelBase):
    pass


class DeviceModelResponse(DeviceModelBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RackRequestBase(BaseModel):
    device_model_id: int
    device_name: str
    serial_number: Optional[str] = None
    cabinet_id: int
    planned_u_start: int = Field(ge=1)
    power_draw_watts: int = Field(gt=0)
    planned_pdu_port_ids: Optional[int] = None
    planned_switch_port_ids: Optional[int] = None
    construction_date: Optional[datetime] = None


class RackRequestCreate(RackRequestBase):
    pass


class RackRequestUpdate(BaseModel):
    device_model_id: Optional[int] = None
    device_name: Optional[str] = None
    serial_number: Optional[str] = None
    cabinet_id: Optional[int] = None
    planned_u_start: Optional[int] = Field(default=None, ge=1)
    power_draw_watts: Optional[int] = Field(default=None, gt=0)
    planned_pdu_port_ids: Optional[int] = None
    planned_switch_port_ids: Optional[int] = None
    construction_date: Optional[datetime] = None


class RackRequestSubmit(BaseModel):
    pass


class RackRequestApprove(BaseModel):
    pass


class RackRequestReject(BaseModel):
    reject_reason: str


class RackRequestStartConstruction(BaseModel):
    pass


class RackRequestComplete(BaseModel):
    actual_u_start: int = Field(ge=1)
    actual_pdu_port_ids: int
    actual_switch_port_ids: int
    completion_remark: Optional[str] = None


class RackRequestDecommission(BaseModel):
    decommission_remark: str
    release_pdu_remark: Optional[str] = None
    release_switch_remark: Optional[str] = None


class RackRequestResponse(BaseModel):
    id: int
    request_no: str
    device_model_id: int
    device_name: str
    serial_number: Optional[str] = None
    cabinet_id: int
    cabinet_name: Optional[str] = None
    planned_u_start: int
    planned_u_end: int
    actual_u_start: Optional[int] = None
    actual_u_end: Optional[int] = None
    power_draw_watts: int
    planned_pdu_port_ids: Optional[int] = None
    actual_pdu_port_ids: Optional[int] = None
    planned_switch_port_ids: Optional[int] = None
    actual_switch_port_ids: Optional[int] = None
    status: RackRequestStatus
    reject_reason: Optional[str] = None
    construction_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    decommissioned_at: Optional[datetime] = None
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    completion_remark: Optional[str] = None
    decommission_remark: Optional[str] = None
    validation_errors: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True


class ValidationErrorResponse(BaseModel):
    type: str
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    id: int
    rack_request_id: Optional[int] = None
    user_id: int
    user_name: Optional[str] = None
    action: AuditAction
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime
    is_abnormal_release: bool

    class Config:
        from_attributes = True


class CabinetUtilizationReport(BaseModel):
    cabinet_id: int
    cabinet_name: str
    location: str
    total_u: int
    used_u: int
    utilization_rate: float
    max_power_watts: int
    used_power_watts: int
    power_utilization_rate: float
    device_count: int


class QuarterlyReport(BaseModel):
    quarter: str
    start_date: datetime
    end_date: datetime
    cabinet_utilization: List[CabinetUtilizationReport]
    total_requests: int
    approved_requests: int
    rejected_requests: int
    rejection_rate: float
    abnormal_releases: List[AuditLogResponse]
    average_utilization_rate: float


class ResourceCheckRequest(BaseModel):
    cabinet_id: int
    u_start: int
    u_height: int
    power_watts: int
    pdu_port_id: Optional[int] = None
    switch_port_id: Optional[int] = None
    exclude_request_id: Optional[int] = None


class ResourceCheckResponse(BaseModel):
    available: bool
    errors: List[ValidationErrorResponse]
    warnings: List[ValidationErrorResponse]
