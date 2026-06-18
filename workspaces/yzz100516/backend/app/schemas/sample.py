from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class SampleStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    OUT = "out"
    RETURNED = "returned"
    DESTROYED = "destroyed"
    OVERDUE = "overdue"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class SamplePurpose(str, Enum):
    RND = "rnd"
    CUSTOMER = "customer"
    EXHIBITION = "exhibition"
    TESTING = "testing"
    OTHER = "other"


class SampleAttachmentBase(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None


class SampleAttachmentCreate(SampleAttachmentBase):
    file_path: str


class SampleAttachment(SampleAttachmentBase):
    id: int
    sample_id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class SampleBase(BaseModel):
    sample_name: str = Field(..., min_length=1, max_length=200)
    batch_number: str = Field(..., min_length=1, max_length=100)
    purpose: SamplePurpose
    purpose_detail: Optional[str] = Field(None, max_length=500)
    applicant: str = Field(..., min_length=1, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    quantity: int = Field(1, ge=1)
    unit: str = Field("件", max_length=20)
    out_time: Optional[datetime] = None
    expected_return_time: Optional[datetime] = None
    customs_documents: Optional[str] = None
    remark: Optional[str] = None


class SampleCreate(SampleBase):
    pass


class SampleUpdate(BaseModel):
    sample_name: Optional[str] = Field(None, min_length=1, max_length=200)
    batch_number: Optional[str] = Field(None, min_length=1, max_length=100)
    purpose: Optional[SamplePurpose] = None
    purpose_detail: Optional[str] = Field(None, max_length=500)
    applicant: Optional[str] = Field(None, min_length=1, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = Field(None, ge=1)
    unit: Optional[str] = Field(None, max_length=20)
    out_time: Optional[datetime] = None
    expected_return_time: Optional[datetime] = None
    customs_documents: Optional[str] = None
    remark: Optional[str] = None


class Sample(SampleBase):
    id: int
    sample_no: str
    status: SampleStatus
    approval_status: ApprovalStatus
    approver: Optional[str] = None
    approval_time: Optional[datetime] = None
    approval_opinion: Optional[str] = None
    actual_return_time: Optional[datetime] = None
    destroy_time: Optional[datetime] = None
    destroy_reason: Optional[str] = None
    destroy_operator: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[SampleAttachment] = []

    class Config:
        from_attributes = True


class SampleListResponse(BaseModel):
    total: int
    items: List[Sample]


class ApprovalRequest(BaseModel):
    approved: bool
    approver: str = Field(..., min_length=1, max_length=100)
    opinion: Optional[str] = Field(None, max_length=500)


class ReturnRequest(BaseModel):
    return_time: Optional[datetime] = None
    remark: Optional[str] = None


class DestroyRequest(BaseModel):
    destroy_time: Optional[datetime] = None
    reason: str = Field(..., min_length=1, max_length=500)
    operator: str = Field(..., min_length=1, max_length=100)


class OutboundRequest(BaseModel):
    out_time: Optional[datetime] = None
    operator: Optional[str] = None


class BatchDuplicateCheck(BaseModel):
    batch_number: str
    existing_count: int
    existing_samples: List[dict]


class BatchDuplicateItem(BaseModel):
    id: int
    sample_no: str
    sample_name: str
    status: str
    applicant: str


class SampleCreateResponse(BaseModel):
    sample: Sample
    batch_warning: bool = False
    batch_duplicate_info: Optional[BatchDuplicateCheck] = None


class OverdueSample(BaseModel):
    id: int
    sample_no: str
    sample_name: str
    batch_number: str
    applicant: str
    expected_return_time: datetime
    out_time: Optional[datetime] = None
    overdue_days: int
    status: SampleStatus


class ComplianceExport(BaseModel):
    outbound_samples: List[Sample] = []
    returned_samples: List[Sample] = []
    destroyed_samples: List[Sample] = []
    missing_docs_samples: List[Sample] = []
