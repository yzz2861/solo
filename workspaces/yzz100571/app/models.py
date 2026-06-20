from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    Enum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .database import Base


class UserRole(str, enum.Enum):
    OPERATION = "operation"
    DUTY = "duty"
    AUDITOR = "auditor"
    ADMIN = "admin"


class RackRequestStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECOMMISSIONED = "decommissioned"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    START_CONSTRUCTION = "start_construction"
    COMPLETE_CONSTRUCTION = "complete_construction"
    RELEASE_RESOURCE = "release_resource"
    DECOMMISSION = "decommission"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_requests = relationship(
        "RackRequest", foreign_keys="RackRequest.created_by", back_populates="creator"
    )
    approved_requests = relationship(
        "RackRequest", foreign_keys="RackRequest.approved_by", back_populates="approver"
    )


class Cabinet(Base):
    __tablename__ = "cabinets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    location = Column(String(100), nullable=False)
    total_u = Column(Integer, default=42)
    max_power_watts = Column(Integer, nullable=False)
    current_power_watts = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pdus = relationship("PDU", back_populates="cabinet")
    switches = relationship("Switch", back_populates="cabinet")
    rack_requests = relationship("RackRequest", back_populates="cabinet")


class PDU(Base):
    __tablename__ = "pdus"

    id = Column(Integer, primary_key=True, index=True)
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    name = Column(String(50), nullable=False)
    total_ports = Column(Integer, default=8)
    max_current_amps = Column(Float, default=16)
    voltage = Column(Integer, default=220)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cabinet = relationship("Cabinet", back_populates="pdus")
    ports = relationship("PDUPort", back_populates="pdu")

    __table_args__ = (
        UniqueConstraint("cabinet_id", "name", name="uq_cabinet_pdu_name"),
    )


class PDUPort(Base):
    __tablename__ = "pdu_ports"

    id = Column(Integer, primary_key=True, index=True)
    pdu_id = Column(Integer, ForeignKey("pdus.id"), nullable=False)
    port_number = Column(Integer, nullable=False)
    is_occupied = Column(Boolean, default=False)
    occupied_by = Column(Integer, ForeignKey("rack_requests.id"))
    power_draw_watts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    released_at = Column(DateTime(timezone=True))
    release_remark = Column(Text)

    pdu = relationship("PDU", back_populates="ports")
    rack_request = relationship("RackRequest", foreign_keys=[occupied_by])

    __table_args__ = (
        UniqueConstraint("pdu_id", "port_number", name="uq_pdu_port_number"),
    )


class Switch(Base):
    __tablename__ = "switches"

    id = Column(Integer, primary_key=True, index=True)
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    name = Column(String(50), nullable=False)
    model = Column(String(100))
    total_ports = Column(Integer, default=48)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cabinet = relationship("Cabinet", back_populates="switches")
    ports = relationship("SwitchPort", back_populates="switch")

    __table_args__ = (
        UniqueConstraint("cabinet_id", "name", name="uq_cabinet_switch_name"),
    )


class SwitchPort(Base):
    __tablename__ = "switch_ports"

    id = Column(Integer, primary_key=True, index=True)
    switch_id = Column(Integer, ForeignKey("switches.id"), nullable=False)
    port_number = Column(Integer, nullable=False)
    is_occupied = Column(Boolean, default=False)
    occupied_by = Column(Integer, ForeignKey("rack_requests.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    released_at = Column(DateTime(timezone=True))
    release_remark = Column(Text)

    switch = relationship("Switch", back_populates="ports")
    rack_request = relationship("RackRequest", foreign_keys=[occupied_by])

    __table_args__ = (
        UniqueConstraint("switch_id", "port_number", name="uq_switch_port_number"),
    )


class DeviceModel(Base):
    __tablename__ = "device_models"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    height_u = Column(Integer, nullable=False)
    power_watts = Column(Integer, nullable=False)
    network_ports = Column(Integer, default=2)
    power_ports = Column(Integer, default=2)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("brand", "model", name="uq_brand_model"),
    )


class RackRequest(Base):
    __tablename__ = "rack_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_no = Column(String(50), unique=True, nullable=False)
    device_model_id = Column(Integer, ForeignKey("device_models.id"), nullable=False)
    device_name = Column(String(100), nullable=False)
    serial_number = Column(String(100))
    cabinet_id = Column(Integer, ForeignKey("cabinets.id"), nullable=False)
    planned_u_start = Column(Integer, nullable=False)
    planned_u_end = Column(Integer, nullable=False)
    actual_u_start = Column(Integer)
    actual_u_end = Column(Integer)
    power_draw_watts = Column(Integer, nullable=False)
    planned_pdu_port_ids = Column(Integer, ForeignKey("pdu_ports.id"))
    actual_pdu_port_ids = Column(Integer, ForeignKey("pdu_ports.id"))
    planned_switch_port_ids = Column(Integer, ForeignKey("switch_ports.id"))
    actual_switch_port_ids = Column(Integer, ForeignKey("switch_ports.id"))
    status = Column(Enum(RackRequestStatus), default=RackRequestStatus.DRAFT, nullable=False)
    reject_reason = Column(Text)
    construction_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    decommissioned_at = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    construction_user_id = Column(Integer, ForeignKey("users.id"))
    completion_remark = Column(Text)
    decommission_remark = Column(Text)

    device_model = relationship("DeviceModel")
    cabinet = relationship("Cabinet", back_populates="rack_requests")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_requests")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_requests")
    planned_pdu_port = relationship("PDUPort", foreign_keys=[planned_pdu_port_ids])
    actual_pdu_port = relationship("PDUPort", foreign_keys=[actual_pdu_port_ids])
    planned_switch_port = relationship("SwitchPort", foreign_keys=[planned_switch_port_ids])
    actual_switch_port = relationship("SwitchPort", foreign_keys=[actual_switch_port_ids])

    audit_logs = relationship("AuditLog", back_populates="rack_request")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    rack_request_id = Column(Integer, ForeignKey("rack_requests.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(Enum(AuditAction), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_abnormal_release = Column(Boolean, default=False)

    rack_request = relationship("RackRequest", back_populates="audit_logs")
    user = relationship("User")
