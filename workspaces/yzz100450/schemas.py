from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from models import (
    BloodType, BloodComponent, BagStatus, UrgencyLevel,
    AppointmentStatus, ItemStatus
)


class BloodBagBase(BaseModel):
    bag_code: str
    blood_type: BloodType
    component: BloodComponent
    volume_ml: int
    donation_date: date
    expiration_date: date
    storage_location: Optional[str] = None


class BloodBagCreate(BloodBagBase):
    pass


class BloodBagUpdate(BaseModel):
    storage_location: Optional[str] = None
    status: Optional[BagStatus] = None


class BloodBag(BloodBagBase):
    id: int
    status: BagStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentItemBase(BaseModel):
    blood_bag_id: int


class AppointmentItem(AppointmentItemBase):
    id: int
    status: ItemStatus
    reserved_at: Optional[datetime] = None
    issued_at: Optional[datetime] = None
    blood_bag: Optional[BloodBag] = None

    class Config:
        from_attributes = True


class RejectionRecordBase(BaseModel):
    reason: str
    rejected_by: Optional[str] = None


class RejectionRecord(RejectionRecordBase):
    id: int
    appointment_id: int
    rejected_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentBase(BaseModel):
    hospital: str
    department: Optional[str] = None
    blood_type: BloodType
    component: BloodComponent
    quantity: int = Field(gt=0)
    appointment_time: datetime
    cold_chain_window_start: Optional[datetime] = None
    cold_chain_window_end: Optional[datetime] = None
    urgency: UrgencyLevel = UrgencyLevel.NORMAL
    receiver_name: str
    receiver_phone: str
    receiver_id_card: Optional[str] = None
    clinical_diagnosis: Optional[str] = None
    remark: Optional[str] = None
    created_by: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    cold_chain_window_start: Optional[datetime] = None
    cold_chain_window_end: Optional[datetime] = None
    urgency: Optional[UrgencyLevel] = None
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    remark: Optional[str] = None
    status: Optional[AppointmentStatus] = None


class Appointment(AppointmentBase):
    id: int
    appointment_no: str
    status: AppointmentStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[AppointmentItem] = []
    rejection: Optional[RejectionRecord] = None

    class Config:
        from_attributes = True


class AppointmentDetail(Appointment):
    items: List[AppointmentItem] = []


class IssueRecordBase(BaseModel):
    receiver_name: str
    receiver_phone: Optional[str] = None
    cold_chain_actual_time: Optional[datetime] = None
    cold_chain_delay_reason: Optional[str] = None
    operator: Optional[str] = None
    remark: Optional[str] = None


class IssueCreate(IssueRecordBase):
    appointment_id: int
    blood_bag_ids: List[int]


class IssueRecord(IssueRecordBase):
    id: int
    appointment_id: int
    blood_bag_id: int
    issue_time: datetime
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DuplicateAppointmentWarning(BaseModel):
    has_duplicate: bool
    existing_appointment_no: Optional[str] = None
    existing_hospital: Optional[str] = None
    existing_quantity: Optional[int] = None
    message: str


class AppointmentCreateResponse(BaseModel):
    appointment: Appointment
    duplicate_warning: Optional[DuplicateAppointmentWarning] = None


class PendingListResponse(BaseModel):
    total: int
    items: List[Appointment]


class ExpiryRiskItem(BaseModel):
    blood_bag: BloodBag
    days_to_expiry: int
    risk_level: str


class ExpiryRiskResponse(BaseModel):
    total: int
    items: List[ExpiryRiskItem]


class UrgentUsageResponse(BaseModel):
    total_appointments: int
    total_bags: int
    emergency_count: int
    urgent_count: int
    appointments: List[Appointment]


class RejectedListResponse(BaseModel):
    total: int
    items: List[Appointment]


class HospitalPendingItem(BaseModel):
    hospital: str
    pending_count: int
    appointments: List[Appointment]


class HospitalPendingResponse(BaseModel):
    hospitals: List[HospitalPendingItem]
    total_pending: int


class ReminderItem(BaseModel):
    appointment_no: str
    hospital: str
    receiver_name: str
    receiver_phone: str
    appointment_time: datetime
    quantity: int
    blood_type: BloodType
    component: BloodComponent
    overdue_minutes: int


class ReminderListResponse(BaseModel):
    total: int
    items: List[ReminderItem]
