from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class BloodType(str, enum.Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"


class BloodComponent(str, enum.Enum):
    RED_CELLS = "红细胞"
    PLATELETS = "血小板"
    PLASMA = "血浆"
    CRYOPRECIPITATE = "冷沉淀"
    WHOLE_BLOOD = "全血"


class BagStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    ISSUED = "issued"
    EXPIRED = "expired"
    DAMAGED = "damaged"


class UrgencyLevel(str, enum.Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PARTIAL_FULFILLED = "partial_fulfilled"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ItemStatus(str, enum.Enum):
    RESERVED = "reserved"
    ISSUED = "issued"
    CANCELLED = "cancelled"


class BloodBag(Base):
    __tablename__ = "blood_bags"

    id = Column(Integer, primary_key=True, index=True)
    bag_code = Column(String(50), unique=True, index=True, nullable=False)
    blood_type = Column(Enum(BloodType), nullable=False, index=True)
    component = Column(Enum(BloodComponent), nullable=False, index=True)
    volume_ml = Column(Integer, nullable=False)
    donation_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False, index=True)
    storage_location = Column(String(100))
    status = Column(Enum(BagStatus), default=BagStatus.AVAILABLE, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    appointment_items = relationship("AppointmentItem", back_populates="blood_bag")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_no = Column(String(50), unique=True, index=True, nullable=False)
    hospital = Column(String(200), nullable=False, index=True)
    department = Column(String(200))
    blood_type = Column(Enum(BloodType), nullable=False)
    component = Column(Enum(BloodComponent), nullable=False)
    quantity = Column(Integer, nullable=False)
    appointment_time = Column(DateTime(timezone=True), nullable=False, index=True)
    cold_chain_window_start = Column(DateTime(timezone=True))
    cold_chain_window_end = Column(DateTime(timezone=True))
    urgency = Column(Enum(UrgencyLevel), default=UrgencyLevel.NORMAL, index=True)
    receiver_name = Column(String(100), nullable=False)
    receiver_phone = Column(String(50), nullable=False)
    receiver_id_card = Column(String(50))
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.PENDING, index=True)
    clinical_diagnosis = Column(Text)
    remark = Column(Text)
    created_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("AppointmentItem", back_populates="appointment", cascade="all, delete-orphan")
    rejection = relationship("RejectionRecord", back_populates="appointment", uselist=False)
    issue_records = relationship("IssueRecord", back_populates="appointment")


class AppointmentItem(Base):
    __tablename__ = "appointment_items"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    blood_bag_id = Column(Integer, ForeignKey("blood_bags.id"), nullable=False)
    status = Column(Enum(ItemStatus), default=ItemStatus.RESERVED, index=True)
    reserved_at = Column(DateTime(timezone=True), server_default=func.now())
    issued_at = Column(DateTime(timezone=True))

    appointment = relationship("Appointment", back_populates="items")
    blood_bag = relationship("BloodBag", back_populates="appointment_items")


class IssueRecord(Base):
    __tablename__ = "issue_records"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    blood_bag_id = Column(Integer, ForeignKey("blood_bags.id"), nullable=False)
    receiver_name = Column(String(100), nullable=False)
    receiver_phone = Column(String(50))
    issue_time = Column(DateTime(timezone=True), nullable=False)
    cold_chain_actual_time = Column(DateTime(timezone=True))
    cold_chain_delay_reason = Column(Text)
    operator = Column(String(100))
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointment = relationship("Appointment", back_populates="issue_records")


class RejectionRecord(Base):
    __tablename__ = "rejection_records"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False, unique=True)
    reason = Column(Text, nullable=False)
    rejected_by = Column(String(100))
    rejected_at = Column(DateTime(timezone=True), server_default=func.now())

    appointment = relationship("Appointment", back_populates="rejection")
