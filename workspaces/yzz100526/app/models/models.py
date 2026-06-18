from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    OWNER = "owner"
    DISPATCHER = "dispatcher"
    MANAGER = "manager"
    DRIVER = "driver"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.OWNER)
    created_at = Column(DateTime, default=datetime.utcnow)

    outlets = relationship("Outlet", back_populates="owner")


class Outlet(Base):
    __tablename__ = "outlets"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=False)
    district = Column(String(100), index=True, nullable=False)
    route_code = Column(String(50), index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="outlets")
    inventories = relationship("Inventory", back_populates="outlet", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="outlet")
    returns = relationship("Return", back_populates="outlet")
    restocks = relationship("Restock", back_populates="outlet")
    complaints = relationship("Complaint", back_populates="outlet")


class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    issn = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(100), index=True)
    is_hot = Column(Boolean, default=False)
    price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    issues = relationship("Issue", back_populates="publication", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    publication_id = Column(Integer, ForeignKey("publications.id"), nullable=False)
    issue_code = Column(String(50), nullable=False)
    publish_date = Column(Date, nullable=False, index=True)
    return_deadline = Column(Date, nullable=False)
    total_printed = Column(Integer, default=0)
    warehouse_stock = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    publication = relationship("Publication", back_populates="issues")
    inventories = relationship("Inventory", back_populates="issue")
    sales = relationship("Sale", back_populates="issue")
    returns = relationship("Return", back_populates="issue")
    restocks = relationship("RestockItem", back_populates="issue")
    delivery_items = relationship("DeliveryItem", back_populates="issue")

    __table_args__ = (
        {"sqlite_autoincrement": True},
    )


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    stock_qty = Column(Integer, default=0, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    outlet = relationship("Outlet", back_populates="inventories")
    issue = relationship("Issue", back_populates="inventories")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    sale_date = Column(Date, default=date.today, index=True, nullable=False)
    qty = Column(Integer, nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)

    outlet = relationship("Outlet", back_populates="sales")
    issue = relationship("Issue", back_populates="sales")


class ReturnStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELIVERED = "delivered"


class Return(Base):
    __tablename__ = "returns"

    id = Column(Integer, primary_key=True, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    status = Column(Enum(ReturnStatus), default=ReturnStatus.PENDING, index=True)
    apply_date = Column(Date, default=date.today, nullable=False)
    process_date = Column(Date)
    reject_reason = Column(String(500))
    processed_by = Column(Integer, ForeignKey("users.id"))
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    outlet = relationship("Outlet", back_populates="returns")
    issue = relationship("Issue", back_populates="returns")
    delivery = relationship("Delivery", back_populates="returns")


class RestockStatus(str, enum.Enum):
    PENDING = "pending"
    MERGED = "merged"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    REJECTED = "rejected"


class Restock(Base):
    __tablename__ = "restocks"

    id = Column(Integer, primary_key=True, index=True)
    restock_no = Column(String(50), unique=True, index=True, nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    status = Column(Enum(RestockStatus), default=RestockStatus.PENDING, index=True)
    urgency = Column(String(20), default="normal")
    apply_date = Column(Date, default=date.today, nullable=False)
    apply_time = Column(DateTime, default=datetime.utcnow)
    owner_remark = Column(String(500))
    merged_into_id = Column(Integer, ForeignKey("restocks.id"))
    process_time = Column(DateTime)
    processed_by = Column(Integer, ForeignKey("users.id"))
    reject_reason = Column(String(500))
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    outlet = relationship("Outlet", back_populates="restocks")
    items = relationship("RestockItem", back_populates="restock", cascade="all, delete-orphan")
    merged_from = relationship("Restock", remote_side=[id])
    delivery = relationship("Delivery", back_populates="restocks")
    complaints = relationship("Complaint", back_populates="restock")


class RestockItem(Base):
    __tablename__ = "restock_items"

    id = Column(Integer, primary_key=True, index=True)
    restock_id = Column(Integer, ForeignKey("restocks.id"), nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    request_qty = Column(Integer, nullable=False)
    approved_qty = Column(Integer, default=0)
    shortage_reason = Column(String(500))

    restock = relationship("Restock", back_populates="items")
    issue = relationship("Issue", back_populates="restocks")


class DeliveryStatus(str, enum.Enum):
    PLANNED = "planned"
    LOADING = "loading"
    IN_TRANSIT = "in_transit"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    delivery_no = Column(String(50), unique=True, index=True, nullable=False)
    route_code = Column(String(50), index=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.PLANNED, index=True)
    plan_date = Column(Date, default=date.today, index=True, nullable=False)
    depart_time = Column(DateTime)
    arrive_time = Column(DateTime)
    fail_reason = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("User")
    items = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")
    restocks = relationship("Restock", back_populates="delivery")
    returns = relationship("Return", back_populates="delivery")


class DeliveryStatusDetail(str, enum.Enum):
    PENDING = "pending"
    LOADED = "loaded"
    DELIVERED = "delivered"
    FAILED = "failed"


class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    item_type = Column(String(20), nullable=False)
    status = Column(Enum(DeliveryStatusDetail), default=DeliveryStatusDetail.PENDING)
    fail_reason = Column(String(500))
    signoff_by = Column(String(100))
    signoff_time = Column(DateTime)

    delivery = relationship("Delivery", back_populates="items")
    issue = relationship("Issue", back_populates="delivery_items")
    outlet = relationship("Outlet")


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_no = Column(String(50), unique=True, index=True, nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    restock_id = Column(Integer, ForeignKey("restocks.id"))
    complaint_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.OPEN, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"))
    reported_date = Column(Date, default=date.today, index=True)
    reported_by = Column(Integer, ForeignKey("users.id"))
    handler_id = Column(Integer, ForeignKey("users.id"))
    resolution = Column(Text)
    close_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    outlet = relationship("Outlet", back_populates="complaints")
    restock = relationship("Restock", back_populates="complaints")
    issue = relationship("Issue")
