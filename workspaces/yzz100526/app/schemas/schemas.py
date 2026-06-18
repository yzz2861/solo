from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.models import UserRole, ReturnStatus, RestockStatus, DeliveryStatus, DeliveryStatusDetail, ComplaintStatus


class UserBase(BaseModel):
    name: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=20)
    role: UserRole


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OutletBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    address: str = Field(..., max_length=500)
    district: str = Field(..., max_length=100)
    route_code: str = Field(..., max_length=50)
    owner_id: int


class OutletCreate(OutletBase):
    pass


class OutletUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    route_code: Optional[str] = None
    owner_id: Optional[int] = None
    is_active: Optional[bool] = None


class OutletResponse(OutletBase):
    id: int
    is_active: bool
    created_at: datetime
    owner: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class PublicationBase(BaseModel):
    issn: str = Field(..., max_length=20)
    name: str = Field(..., max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    is_hot: bool = False
    price: float


class PublicationCreate(PublicationBase):
    pass


class PublicationUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    is_hot: Optional[bool] = None
    price: Optional[float] = None


class PublicationResponse(PublicationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IssueBase(BaseModel):
    publication_id: int
    issue_code: str = Field(..., max_length=50)
    publish_date: date
    return_deadline: date
    total_printed: int = 0
    warehouse_stock: int = 0


class IssueCreate(IssueBase):
    pass


class IssueUpdate(BaseModel):
    return_deadline: Optional[date] = None
    total_printed: Optional[int] = None
    warehouse_stock: Optional[int] = None


class IssueResponse(IssueBase):
    id: int
    created_at: datetime
    publication: Optional[PublicationResponse] = None

    class Config:
        from_attributes = True


class InventoryResponse(BaseModel):
    id: int
    outlet_id: int
    issue_id: int
    stock_qty: int
    last_updated: datetime
    issue: Optional[IssueResponse] = None
    outlet: Optional[OutletResponse] = None

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    outlet_id: int
    issue_id: int
    sale_date: date = Field(default_factory=date.today)
    qty: int = Field(..., gt=0)
    notes: Optional[str] = None


class SaleCreate(SaleBase):
    reporter_id: Optional[int] = None


class SaleResponse(SaleBase):
    id: int
    reported_at: datetime
    reporter_id: Optional[int] = None

    class Config:
        from_attributes = True


class ReturnBase(BaseModel):
    outlet_id: int
    issue_id: int
    qty: int = Field(..., gt=0)


class ReturnCreate(ReturnBase):
    pass


class ReturnProcess(BaseModel):
    status: ReturnStatus
    reject_reason: Optional[str] = Field(None, max_length=500)
    processed_by: int


class ReturnResponse(ReturnBase):
    id: int
    status: ReturnStatus
    apply_date: date
    process_date: Optional[date] = None
    reject_reason: Optional[str] = None
    processed_by: Optional[int] = None
    delivery_id: Optional[int] = None
    created_at: datetime
    outlet: Optional[OutletResponse] = None
    issue: Optional[IssueResponse] = None

    class Config:
        from_attributes = True


class RestockItemCreate(BaseModel):
    issue_id: int
    request_qty: int = Field(..., gt=0)


class RestockCreate(BaseModel):
    outlet_id: int
    items: List[RestockItemCreate]
    urgency: str = "normal"
    owner_remark: Optional[str] = Field(None, max_length=500)


class RestockItemProcess(BaseModel):
    id: int
    approved_qty: int = Field(..., ge=0)
    shortage_reason: Optional[str] = Field(None, max_length=500)


class RestockProcess(BaseModel):
    items: List[RestockItemProcess]
    processed_by: int
    reject_reason: Optional[str] = Field(None, max_length=500)


class RestockItemResponse(BaseModel):
    id: int
    restock_id: int
    issue_id: int
    request_qty: int
    approved_qty: int
    shortage_reason: Optional[str] = None
    issue: Optional[IssueResponse] = None

    class Config:
        from_attributes = True


class RestockResponse(BaseModel):
    id: int
    restock_no: str
    outlet_id: int
    status: RestockStatus
    urgency: str
    apply_date: date
    apply_time: datetime
    owner_remark: Optional[str] = None
    merged_into_id: Optional[int] = None
    process_time: Optional[datetime] = None
    processed_by: Optional[int] = None
    reject_reason: Optional[str] = None
    delivery_id: Optional[int] = None
    created_at: datetime
    outlet: Optional[OutletResponse] = None
    items: List[RestockItemResponse] = []

    class Config:
        from_attributes = True


class DeliveryItemResponse(BaseModel):
    id: int
    delivery_id: int
    outlet_id: int
    issue_id: int
    qty: int
    item_type: str
    status: DeliveryStatusDetail
    fail_reason: Optional[str] = None
    signoff_by: Optional[str] = None
    signoff_time: Optional[datetime] = None
    issue: Optional[IssueResponse] = None
    outlet: Optional[OutletResponse] = None

    class Config:
        from_attributes = True


class DeliveryUpdateStatus(BaseModel):
    status: DeliveryStatus
    fail_reason: Optional[str] = Field(None, max_length=500)


class DeliveryItemUpdate(BaseModel):
    status: DeliveryStatusDetail
    fail_reason: Optional[str] = Field(None, max_length=500)
    signoff_by: Optional[str] = Field(None, max_length=100)


class DeliveryResponse(BaseModel):
    id: int
    delivery_no: str
    route_code: str
    driver_id: Optional[int] = None
    status: DeliveryStatus
    plan_date: date
    depart_time: Optional[datetime] = None
    arrive_time: Optional[datetime] = None
    fail_reason: Optional[str] = None
    created_at: datetime
    driver: Optional[UserResponse] = None
    items: List[DeliveryItemResponse] = []

    class Config:
        from_attributes = True


class ComplaintBase(BaseModel):
    outlet_id: int
    complaint_type: str = Field(..., max_length=50)
    description: str
    issue_id: Optional[int] = None
    restock_id: Optional[int] = None


class ComplaintCreate(ComplaintBase):
    reported_by: Optional[int] = None


class ComplaintUpdate(BaseModel):
    status: ComplaintStatus
    handler_id: Optional[int] = None
    resolution: Optional[str] = None


class ComplaintResponse(ComplaintBase):
    id: int
    complaint_no: str
    status: ComplaintStatus
    reported_date: date
    reported_by: Optional[int] = None
    handler_id: Optional[int] = None
    resolution: Optional[str] = None
    close_date: Optional[date] = None
    created_at: datetime
    outlet: Optional[OutletResponse] = None

    class Config:
        from_attributes = True


class DeliveryPlanItem(BaseModel):
    restock_ids: List[int] = []
    return_ids: List[int] = []


class DeliveryPlanCreate(BaseModel):
    route_code: str
    plan_date: date = Field(default_factory=date.today)
    driver_id: Optional[int] = None
    outlets: List[DeliveryPlanItem]


class RouteResponse(BaseModel):
    route_code: str
    plan_date: date
    outlet_count: int
    delivery: Optional[DeliveryResponse] = None
    outlets: List[dict] = []


class ReportComplaintRow(BaseModel):
    complaint_no: str
    outlet_code: str
    outlet_name: str
    complaint_type: str
    description: str
    status: ComplaintStatus
    reported_date: date
    days_open: int


class ReportReturnRateRow(BaseModel):
    publication_issn: str
    publication_name: str
    issue_code: str
    publish_date: date
    total_sold: int
    total_returned: int
    total_distributed: int
    return_rate: float


class ReportResponseTimeRow(BaseModel):
    restock_no: str
    outlet_code: str
    apply_time: datetime
    process_time: Optional[datetime]
    response_minutes: Optional[float]
    status: RestockStatus


class MonthlyUnsoldRow(BaseModel):
    publication_issn: str
    publication_name: str
    issue_code: str
    publish_date: date
    total_printed: int
    total_sold: int
    total_returned: int
    unsold_qty: int
    unsold_amount: float
    category: str
