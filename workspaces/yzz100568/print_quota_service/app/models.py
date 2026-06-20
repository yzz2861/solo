import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base


class TransactionType(str, enum.Enum):
    DEDUCT = "deduct"
    REFUND = "refund"
    SUBSIDY_GRANT = "subsidy_grant"
    SUBSIDY_USE = "subsidy_use"
    CASH_RECHARGE = "cash_recharge"
    CASH_WITHDRAW = "cash_withdraw"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    LOCKED = "locked"
    EXCEPTION = "exception"


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSED = "processed"


class AccountType(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    FINANCE = "finance"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    cash_balance = Column(Float, default=0.0, nullable=False)
    subsidy_balance = Column(Float, default=0.0, nullable=False)
    total_deducted = Column(Float, default=0.0, nullable=False)
    total_refunded = Column(Float, default=0.0, nullable=False)
    total_subsidy_granted = Column(Float, default=0.0, nullable=False)
    total_subsidy_used = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = relationship("PrintTask", back_populates="student")
    transactions = relationship("Transaction", back_populates="student")
    refunds = relationship("RefundRecord", back_populates="student")
    subsidies = relationship("CourseSubsidy", back_populates="student")


class PrintTask(Base):
    __tablename__ = "print_tasks"

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String, unique=True, index=True, nullable=False)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    printer_id = Column(String, nullable=False)
    page_count = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    subsidy_used = Column(Float, default=0.0, nullable=False)
    cash_used = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.PROCESSING, nullable=False)
    document_name = Column(String)
    exception_reason = Column(Text)
    is_locked = Column(Boolean, default=False, nullable=False)
    lock_reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="tasks")
    transactions = relationship("Transaction", back_populates="task")
    refunds = relationship("RefundRecord", back_populates="task")
    subsidy_usages = relationship("SubsidyUsage", back_populates="task")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    task_id = Column(Integer, ForeignKey("print_tasks.id"))
    refund_id = Column(Integer, ForeignKey("refund_records.id"))
    type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    cash_change = Column(Float, default=0.0, nullable=False)
    subsidy_change = Column(Float, default=0.0, nullable=False)
    balance_after_cash = Column(Float, nullable=False)
    balance_after_subsidy = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    operator_id = Column(String)
    operator_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="transactions")
    task = relationship("PrintTask", back_populates="transactions")
    refund = relationship("RefundRecord", back_populates="transactions")


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("print_tasks.id"), nullable=False)
    original_transaction_id = Column(Integer, ForeignKey("transactions.id"))
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    refund_amount = Column(Float, nullable=False)
    cash_refund = Column(Float, default=0.0, nullable=False)
    subsidy_refund = Column(Float, default=0.0, nullable=False)
    exception_type = Column(String, nullable=False)
    refund_reason = Column(Text, nullable=False)
    applicant_id = Column(String, nullable=False)
    applicant_name = Column(String, nullable=False)
    approver_id = Column(String)
    approver_name = Column(String)
    approval_comment = Column(Text)
    status = Column(Enum(RefundStatus), default=RefundStatus.PENDING, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime)
    processed_at = Column(DateTime)

    student = relationship("Student", back_populates="refunds")
    task = relationship("PrintTask", back_populates="refunds")
    transactions = relationship("Transaction", back_populates="refund")


class CourseSubsidy(Base):
    __tablename__ = "course_subsidies"

    id = Column(Integer, primary_key=True, index=True)
    subsidy_code = Column(String, unique=True, index=True, nullable=False)
    student_id = Column(String, ForeignKey("students.student_id"), nullable=False)
    course_name = Column(String, nullable=False)
    course_id = Column(String, nullable=False)
    teacher_name = Column(String, nullable=False)
    total_quota = Column(Float, nullable=False)
    used_quota = Column(Float, default=0.0, nullable=False)
    remaining_quota = Column(Float, nullable=False)
    description = Column(Text)
    granted_by = Column(String, nullable=False)
    granted_by_name = Column(String, nullable=False)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="subsidies")
    usages = relationship("SubsidyUsage", back_populates="subsidy")


class SubsidyUsage(Base):
    __tablename__ = "subsidy_usages"

    id = Column(Integer, primary_key=True, index=True)
    subsidy_id = Column(Integer, ForeignKey("course_subsidies.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("print_tasks.id"), nullable=False)
    amount_used = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    subsidy = relationship("CourseSubsidy", back_populates="usages")
    task = relationship("PrintTask", back_populates="subsidy_usages")


class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
