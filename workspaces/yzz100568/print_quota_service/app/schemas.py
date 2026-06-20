from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from .models import TransactionType, TaskStatus, RefundStatus, AccountType


class StudentBase(BaseModel):
    student_id: str
    name: str


class StudentCreate(StudentBase):
    initial_cash: float = Field(default=0.0, ge=0)


class StudentBalance(BaseModel):
    student_id: str
    name: str
    cash_balance: float
    subsidy_balance: float
    total_deducted: float
    total_refunded: float
    total_subsidy_granted: float
    total_subsidy_used: float

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: int
    type: TransactionType
    amount: float
    cash_change: float
    subsidy_change: float
    balance_after_cash: float
    balance_after_subsidy: float
    reason: str
    operator_name: Optional[str]
    created_at: datetime
    task_id: Optional[int]
    refund_id: Optional[int]

    class Config:
        from_attributes = True


class StudentDetail(StudentBalance):
    recent_transactions: List[TransactionOut]


class PrintTaskCreate(BaseModel):
    idempotency_key: str
    student_id: str
    printer_id: str
    page_count: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    document_name: Optional[str] = None
    prefer_subsidy: bool = Field(default=True, description="是否优先使用补贴额度")


class PrintTaskOut(BaseModel):
    id: int
    idempotency_key: str
    student_id: str
    printer_id: str
    page_count: int
    unit_price: float
    total_amount: float
    subsidy_used: float
    cash_used: float
    status: TaskStatus
    document_name: Optional[str]
    exception_reason: Optional[str]
    is_locked: bool
    lock_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskExceptionReport(BaseModel):
    task_id: int
    exception_reason: str


class RefundApply(BaseModel):
    task_id: int
    exception_type: str
    refund_reason: str
    applicant_id: str
    applicant_name: str


class RefundApprove(BaseModel):
    refund_id: int
    approver_id: str
    approver_name: str
    approval_comment: Optional[str] = None
    approve: bool


class RefundOut(BaseModel):
    id: int
    task_id: int
    student_id: str
    refund_amount: float
    cash_refund: float
    subsidy_refund: float
    exception_type: str
    refund_reason: str
    applicant_id: str
    applicant_name: str
    approver_id: Optional[str]
    approver_name: Optional[str]
    approval_comment: Optional[str]
    status: RefundStatus
    applied_at: datetime
    approved_at: Optional[datetime]
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class SubsidyCreate(BaseModel):
    subsidy_code: str
    student_id: str
    course_name: str
    course_id: str
    teacher_name: str
    total_quota: float = Field(..., gt=0)
    description: Optional[str] = None
    granted_by: str
    granted_by_name: str
    valid_until: Optional[datetime] = None


class SubsidyOut(BaseModel):
    id: int
    subsidy_code: str
    student_id: str
    course_name: str
    course_id: str
    teacher_name: str
    total_quota: float
    used_quota: float
    remaining_quota: float
    description: Optional[str]
    granted_by_name: str
    valid_from: datetime
    valid_until: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class SubsidyUsageOut(BaseModel):
    id: int
    subsidy_id: int
    task_id: int
    amount_used: float
    created_at: datetime

    class Config:
        from_attributes = True


class OperatorCreate(BaseModel):
    operator_id: str
    name: str
    account_type: AccountType


class OperatorOut(BaseModel):
    id: int
    operator_id: str
    name: str
    account_type: AccountType
    created_at: datetime

    class Config:
        from_attributes = True


class FinanceReportRow(BaseModel):
    date: str
    count: int
    total_amount: float


class OverLimitWarning(BaseModel):
    subsidy_id: int
    subsidy_code: str
    course_name: str
    total_quota: float
    used_quota: float
    remaining_quota: float
    requested_amount: float
    message: str
