from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from ..database import Base


class SampleStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    OUT = "out"
    RETURNED = "returned"
    DESTROYED = "destroyed"
    OVERDUE = "overdue"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class SamplePurpose(str, enum.Enum):
    RND = "rnd"
    CUSTOMER = "customer"
    EXHIBITION = "exhibition"
    TESTING = "testing"
    OTHER = "other"


class Sample(Base):
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_no = Column(String(50), unique=True, index=True, nullable=False)
    sample_name = Column(String(200), nullable=False)
    batch_number = Column(String(100), index=True, nullable=False)
    purpose = Column(Enum(SamplePurpose), nullable=False)
    purpose_detail = Column(String(500))
    applicant = Column(String(100), nullable=False)
    department = Column(String(100))
    quantity = Column(Integer, default=1)
    unit = Column(String(20), default="件")

    out_time = Column(DateTime)
    expected_return_time = Column(DateTime)
    actual_return_time = Column(DateTime)

    status = Column(Enum(SampleStatus), default=SampleStatus.PENDING_APPROVAL)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approver = Column(String(100))
    approval_time = Column(DateTime)
    approval_opinion = Column(String(500))

    destroy_time = Column(DateTime)
    destroy_reason = Column(String(500))
    destroy_operator = Column(String(100))

    customs_documents = Column(Text)
    remark = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attachments = relationship("SampleAttachment", back_populates="sample", cascade="all, delete-orphan")


class SampleAttachment(Base):
    __tablename__ = "sample_attachments"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_type = Column(String(100))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    sample = relationship("Sample", back_populates="attachments")
