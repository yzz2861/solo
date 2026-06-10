from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class DefectStatus(str, enum.Enum):
    DISCOVERED = "discovered"
    DISPATCHED = "dispatched"
    REPAIRED = "repaired"
    RECHECKED = "rechecked"
    CLOSED = "closed"


class DefectSeverity(str, enum.Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"


class DefectSource(str, enum.Enum):
    DRONE = "drone"
    MANUAL = "manual"


class ImportType(str, enum.Enum):
    COMPONENTS = "components"
    DEFECTS = "defects"
    REPAIRS = "repairs"


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    import_type = Column(Enum(ImportType), nullable=False)
    batch_hash = Column(String, unique=True, index=True, nullable=False)
    file_name = Column(String, nullable=False)
    record_count = Column(Integer, default=0)
    import_time = Column(DateTime, default=datetime.utcnow)
    remark = Column(String, default="")


class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    component_code = Column(String, unique=True, index=True, nullable=False)
    model = Column(String, default="")
    capacity = Column(Float, default=0.0)
    location = Column(String, default="")
    install_date = Column(String, default="")
    manufacturer = Column(String, default="")
    string_code = Column(String, default="")
    array_code = Column(String, default="")
    remark = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    defects = relationship("Defect", back_populates="component")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String, unique=True, index=True, nullable=False)
    component_code = Column(String, ForeignKey("components.component_code"), nullable=False)
    defect_type = Column(String, default="")
    severity = Column(Enum(DefectSeverity), default=DefectSeverity.MINOR)
    source = Column(Enum(DefectSource), default=DefectSource.DRONE)
    status = Column(Enum(DefectStatus), default=DefectStatus.DISCOVERED)
    discovery_time = Column(DateTime, default=datetime.utcnow)
    discovery_image = Column(String, default="")
    position_detail = Column(String, default="")
    temperature = Column(Float, default=0.0)
    description = Column(Text, default="")
    batch_id = Column(Integer, default=0)

    dispatch_time = Column(DateTime, nullable=True)
    repairer = Column(String, default="")
    repair_time = Column(DateTime, nullable=True)
    repair_content = Column(Text, default="")
    spare_parts = Column(Text, default="")
    spare_parts_cost = Column(Float, default=0.0)

    recheck_time = Column(DateTime, nullable=True)
    recheck_result = Column(String, default="")
    recheck_passed = Column(String, default="pending")
    recheck_opinion = Column(Text, default="")
    rechecker = Column(String, default="")

    close_time = Column(DateTime, nullable=True)
    close_opinion = Column(Text, default="")

    severity_history = Column(Text, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    component = relationship("Component", back_populates="defects")
