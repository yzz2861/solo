from datetime import datetime, date
from sqlalchemy import Column, Integer, String, DateTime, Date, Enum as SAEnum, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


class ContainerInventory(Base):
    __tablename__ = "container_inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shipping_company = Column(String(64), nullable=False, index=True)
    ship_name = Column(String(64), nullable=False, index=True)
    container_type = Column(String(16), nullable=False)
    total_qty = Column(Integer, nullable=False, default=0)
    occupied_qty = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_inv_company_type", "shipping_company", "container_type"),
    )

    @property
    def available_qty(self):
        return self.total_qty - self.occupied_qty


class Appointment(Base):
    __tablename__ = "appointment"

    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_RELEASED = "RELEASED"
    STATUS_CHECKED_IN = "CHECKED_IN"
    STATUS_REJECTED = "REJECTED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_TIMEOUT = "TIMEOUT"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_no = Column(String(32), unique=True, nullable=False, index=True)
    shipping_company = Column(String(64), nullable=False, index=True)
    ship_name = Column(String(64), nullable=False, index=True)
    container_type = Column(String(16), nullable=False)
    pickup_date = Column(Date, nullable=False, index=True)
    driver_name = Column(String(32), nullable=False)
    driver_phone = Column(String(20), nullable=False)
    vehicle_plate = Column(String(16), nullable=False)
    status = Column(
        SAEnum(
            STATUS_PENDING, STATUS_APPROVED, STATUS_RELEASED,
            STATUS_CHECKED_IN, STATUS_REJECTED, STATUS_CANCELLED, STATUS_TIMEOUT,
            name="appointment_status",
        ),
        nullable=False,
        default=STATUS_PENDING,
        index=True,
    )
    reject_reason = Column(String(256), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    operation_logs = relationship("OperationLog", back_populates="appointment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_appt_plate_date", "vehicle_plate", "pickup_date"),
    )


class OperationLog(Base):
    __tablename__ = "operation_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    appointment_id = Column(Integer, ForeignKey("appointment.id"), nullable=False, index=True)
    operation_type = Column(String(32), nullable=False)
    operator = Column(String(32), nullable=False, default="system")
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="operation_logs")
