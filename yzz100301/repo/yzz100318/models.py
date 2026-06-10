from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, Date, Time
from sqlalchemy.orm import relationship
from database import Base


class ConstructionApplication(Base):
    __tablename__ = "construction_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_no = Column(String(100), unique=True, index=True, nullable=False)
    line_name = Column(String(100), index=True, nullable=False)
    section = Column(String(200), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    construction_type = Column(String(100))
    construction_content = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    responsible_person = Column(String(100), nullable=False)
    phone = Column(String(50))
    status = Column(String(50), default="待审批", index=True)
    review_opinion = Column(Text)
    batch_no = Column(String(100), index=True)
    source_file = Column(String(255))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class SkylightPlan(Base):
    __tablename__ = "skylight_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_no = Column(String(100), unique=True, index=True, nullable=False)
    line_name = Column(String(100), index=True, nullable=False)
    section = Column(String(200), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    skylight_type = Column(String(50))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    construction_content = Column(Text)
    responsible_person = Column(String(100), nullable=False)
    phone = Column(String(50))
    status = Column(String(50), default="已批准", index=True)
    review_opinion = Column(Text)
    application_id = Column(Integer, ForeignKey("construction_applications.id"))
    application = relationship("ConstructionApplication", backref="skylight_plans")
    batch_no = Column(String(100), index=True)
    source_file = Column(String(255))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class TemporaryBlock(Base):
    __tablename__ = "temporary_blocks"

    id = Column(Integer, primary_key=True, index=True)
    block_no = Column(String(100), unique=True, index=True, nullable=False)
    line_name = Column(String(100), index=True, nullable=False)
    section = Column(String(200), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    block_reason = Column(String(255))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    responsible_person = Column(String(100), nullable=False)
    phone = Column(String(50))
    status = Column(String(50), default="待复核", index=True)
    review_opinion = Column(Text)
    plan_id = Column(Integer, ForeignKey("skylight_plans.id"))
    plan = relationship("SkylightPlan", backref="temporary_blocks")
    batch_no = Column(String(100), index=True)
    source_file = Column(String(255))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)


class ConflictRecord(Base):
    __tablename__ = "conflict_records"

    id = Column(Integer, primary_key=True, index=True)
    conflict_type = Column(String(50), index=True, nullable=False)
    line_name = Column(String(100), index=True, nullable=False)
    section = Column(String(200), nullable=False)
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    item_a_type = Column(String(50))
    item_a_id = Column(Integer)
    item_a_no = Column(String(100))
    item_a_start = Column(DateTime)
    item_a_end = Column(DateTime)
    item_a_person = Column(String(100))
    item_b_type = Column(String(50))
    item_b_id = Column(Integer)
    item_b_no = Column(String(100))
    item_b_start = Column(DateTime)
    item_b_end = Column(DateTime)
    item_b_person = Column(String(100))
    overlap_start = Column(DateTime)
    overlap_end = Column(DateTime)
    overlap_km_start = Column(Float)
    overlap_km_end = Column(Float)
    severity = Column(String(20), default="中等")
    status = Column(String(50), default="待处理", index=True)
    handle_opinion = Column(Text)
    detected_at = Column(DateTime)
    handled_at = Column(DateTime)
