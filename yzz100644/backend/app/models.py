from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class ProductModel(Base):
    __tablename__ = "product_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    is_old = Column(Boolean, default=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)

    manuals = relationship("Manual", back_populates="product_model")
    faqs = relationship("FAQ", back_populates="product_model")
    queries = relationship("QueryRecord", back_populates="product_model")


class Manual(Base):
    __tablename__ = "manuals"

    id = Column(Integer, primary_key=True, index=True)
    product_model_id = Column(Integer, ForeignKey("product_models.id"))
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    source_type = Column(String(20), default="manual")
    created_at = Column(DateTime, default=datetime.now)

    product_model = relationship("ProductModel", back_populates="manuals")
    sections = relationship("ManualSection", back_populates="manual", cascade="all, delete-orphan")


class ManualSection(Base):
    __tablename__ = "manual_sections"

    id = Column(Integer, primary_key=True, index=True)
    manual_id = Column(Integer, ForeignKey("manuals.id"))
    page_number = Column(Integer, default=1)
    section_title = Column(String(200), default="")
    content = Column(Text, nullable=False)
    keywords = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)

    manual = relationship("Manual", back_populates="sections")


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    product_model_id = Column(Integer, ForeignKey("product_models.id"))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_page = Column(String(100), default="FAQ")
    notes = Column(Text, default="")
    category = Column(String(50), default="general")
    is_warranty_exception = Column(Boolean, default=False)
    is_model_difference = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    product_model = relationship("ProductModel", back_populates="faqs")


class QueryRecord(Base):
    __tablename__ = "query_records"

    id = Column(Integer, primary_key=True, index=True)
    product_model_id = Column(Integer, ForeignKey("product_models.id"), nullable=True)
    question = Column(Text, nullable=False)
    answer_type = Column(String(20), default="answered")
    matched_question = Column(Text, default="")
    matched_answer = Column(Text, default="")
    matched_source = Column(String(200), default="")
    notes = Column(Text, default="")
    is_no_answer = Column(Boolean, default=False)
    is_old_model = Column(Boolean, default=False)
    is_missing_model = Column(Boolean, default=False)
    is_warranty_question = Column(Boolean, default=False)
    is_model_diff_question = Column(Boolean, default=False)
    agent_id = Column(String(50), default="default")
    created_at = Column(DateTime, default=datetime.now)

    product_model = relationship("ProductModel", back_populates="queries")
    decision = relationship("AgentDecision", back_populates="query", uselist=False)


class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(Integer, primary_key=True, index=True)
    query_record_id = Column(Integer, ForeignKey("query_records.id"), unique=True)
    adopted = Column(Boolean, default=True)
    modified_answer = Column(Text, default="")
    modify_reason = Column(Text, default="")
    supervisor_reviewed = Column(Boolean, default=False)
    supervisor_note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    query = relationship("QueryRecord", back_populates="decision")
