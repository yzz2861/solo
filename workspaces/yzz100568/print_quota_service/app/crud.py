from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from . import models, schemas
from .models import (
    Student, PrintTask, Transaction, RefundRecord,
    CourseSubsidy, SubsidyUsage, Operator,
    TransactionType, TaskStatus, RefundStatus, AccountType
)


def get_or_create_student(db: Session, student_id: str, name: str = "", initial_cash: float = 0.0) -> Student:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if student:
        return student
    student = Student(
        student_id=student_id,
        name=name or student_id,
        cash_balance=initial_cash,
        subsidy_balance=0.0
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def get_student(db: Session, student_id: str) -> Optional[Student]:
    return db.query(Student).filter(Student.student_id == student_id).first()


def list_students(db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
    return db.query(Student).offset(skip).limit(limit).all()


def get_student_transactions(
    db: Session, student_id: str, skip: int = 0, limit: int = 50
) -> List[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.student_id == student_id)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def _add_transaction(
    db: Session,
    student: Student,
    tx_type: TransactionType,
    amount: float,
    cash_change: float,
    subsidy_change: float,
    reason: str,
    task_id: Optional[int] = None,
    refund_id: Optional[int] = None,
    operator_id: Optional[str] = None,
    operator_name: Optional[str] = None,
) -> Transaction:
    student.cash_balance += cash_change
    student.subsidy_balance += subsidy_change
    student.updated_at = datetime.utcnow()

    if tx_type == TransactionType.DEDUCT:
        student.total_deducted += abs(amount)
    elif tx_type == TransactionType.REFUND:
        student.total_refunded += abs(amount)
    elif tx_type == TransactionType.SUBSIDY_GRANT:
        student.total_subsidy_granted += abs(amount)
    elif tx_type == TransactionType.SUBSIDY_USE:
        student.total_subsidy_used += abs(amount)

    tx = Transaction(
        student_id=student.student_id,
        task_id=task_id,
        refund_id=refund_id,
        type=tx_type,
        amount=amount,
        cash_change=cash_change,
        subsidy_change=subsidy_change,
        balance_after_cash=student.cash_balance,
        balance_after_subsidy=student.subsidy_balance,
        reason=reason,
        operator_id=operator_id,
        operator_name=operator_name,
    )
    db.add(tx)
    db.flush()
    return tx


def create_print_task(
    db: Session, data: schemas.PrintTaskCreate
) -> Tuple[Optional[PrintTask], Optional[str], Optional[List[schemas.OverLimitWarning]]]:
    existing = db.query(PrintTask).filter(
        PrintTask.idempotency_key == data.idempotency_key
    ).first()
    if existing:
        return existing, None, None

    student = get_student(db, data.student_id)
    if not student:
        return None, f"学生 {data.student_id} 不存在", None

    total_amount = round(data.page_count * data.unit_price, 2)

    warnings = []
    active_subsidies = (
        db.query(CourseSubsidy)
        .filter(
            CourseSubsidy.student_id == data.student_id,
            CourseSubsidy.remaining_quota > 0,
            or_(CourseSubsidy.valid_until.is_(None), CourseSubsidy.valid_until > datetime.utcnow())
        )
        .order_by(CourseSubsidy.created_at.asc())
        .all()
    )

    if active_subsidies and total_amount > student.subsidy_balance:
        for s in active_subsidies:
            if s.remaining_quota < total_amount and s.remaining_quota > 0:
                warnings.append(schemas.OverLimitWarning(
                    subsidy_id=s.id,
                    subsidy_code=s.subsidy_code,
                    course_name=s.course_name,
                    total_quota=s.total_quota,
                    used_quota=s.used_quota,
                    remaining_quota=s.remaining_quota,
                    requested_amount=total_amount,
                    message=f"课程《{s.course_name}》补贴剩余 {s.remaining_quota} 元，不足以覆盖本次打印 {total_amount} 元"
                ))

    subsidy_used = 0.0
    cash_used = 0.0
    remaining = total_amount

    if data.prefer_subsidy:
        if student.subsidy_balance >= remaining:
            subsidy_used = remaining
            remaining = 0.0
        else:
            subsidy_used = student.subsidy_balance
            remaining -= subsidy_used
        if remaining > 0:
            if student.cash_balance >= remaining:
                cash_used = remaining
                remaining = 0.0
            else:
                return None, f"余额不足，需 {total_amount} 元，现金余额 {student.cash_balance} 元，补贴余额 {student.subsidy_balance} 元", warnings
    else:
        if student.cash_balance >= remaining:
            cash_used = remaining
            remaining = 0.0
        else:
            cash_used = student.cash_balance
            remaining -= cash_used
        if remaining > 0:
            if student.subsidy_balance >= remaining:
                subsidy_used = remaining
                remaining = 0.0
            else:
                return None, f"余额不足，需 {total_amount} 元，现金余额 {student.cash_balance} 元，补贴余额 {student.subsidy_balance} 元", warnings

    task = PrintTask(
        idempotency_key=data.idempotency_key,
        student_id=data.student_id,
        printer_id=data.printer_id,
        page_count=data.page_count,
        unit_price=data.unit_price,
        total_amount=total_amount,
        subsidy_used=subsidy_used,
        cash_used=cash_used,
        status=TaskStatus.PROCESSING,
        document_name=data.document_name,
    )
    db.add(task)
    db.flush()

    if subsidy_used > 0:
        _consume_subsidies(db, student, task, subsidy_used)

    reason_parts = []
    if subsidy_used > 0:
        reason_parts.append(f"补贴抵扣{subsidy_used}元")
    if cash_used > 0:
        reason_parts.append(f"现金扣费{cash_used}元")
    reason = f"打印扣费：{data.page_count}页×{data.unit_price}元/页={total_amount}元，" + "，".join(reason_parts)

    _add_transaction(
        db, student,
        tx_type=TransactionType.DEDUCT,
        amount=-total_amount,
        cash_change=-cash_used,
        subsidy_change=-subsidy_used,
        reason=reason,
        task_id=task.id,
    )

    task.status = TaskStatus.COMPLETED
    db.commit()
    db.refresh(task)
    return task, None, warnings


def _consume_subsidies(db: Session, student: Student, task: PrintTask, subsidy_amount: float):
    remaining = subsidy_amount
    active_subsidies = (
        db.query(CourseSubsidy)
        .filter(
            CourseSubsidy.student_id == student.student_id,
            CourseSubsidy.remaining_quota > 0,
            or_(CourseSubsidy.valid_until.is_(None), CourseSubsidy.valid_until > datetime.utcnow())
        )
        .order_by(CourseSubsidy.created_at.asc())
        .all()
    )
    for sub in active_subsidies:
        if remaining <= 0:
            break
        use_amount = min(sub.remaining_quota, remaining)
        sub.used_quota = round(sub.used_quota + use_amount, 2)
        sub.remaining_quota = round(sub.remaining_quota - use_amount, 2)
        db.add(SubsidyUsage(
            subsidy_id=sub.id,
            task_id=task.id,
            amount_used=use_amount,
        ))
        remaining = round(remaining - use_amount, 2)


def report_task_exception(db: Session, task_id: int, exception_reason: str) -> Tuple[Optional[PrintTask], Optional[str]]:
    task = db.query(PrintTask).filter(PrintTask.id == task_id).first()
    if not task:
        return None, "任务不存在"
    task.status = TaskStatus.EXCEPTION
    task.exception_reason = exception_reason
    task.is_locked = True
    task.lock_reason = f"异常锁定：{exception_reason}"
    db.commit()
    db.refresh(task)
    return task, None


def get_task(db: Session, task_id: int) -> Optional[PrintTask]:
    return db.query(PrintTask).filter(PrintTask.id == task_id).first()


def get_tasks_by_student(db: Session, student_id: str, skip: int = 0, limit: int = 50) -> List[PrintTask]:
    return (
        db.query(PrintTask)
        .filter(PrintTask.student_id == student_id)
        .order_by(PrintTask.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def list_locked_tasks(db: Session) -> List[PrintTask]:
    return db.query(PrintTask).filter(PrintTask.is_locked == True).order_by(PrintTask.created_at.desc()).all()


def list_exception_tasks(db: Session) -> List[PrintTask]:
    return db.query(PrintTask).filter(PrintTask.status == TaskStatus.EXCEPTION).order_by(PrintTask.created_at.desc()).all()


def apply_refund(db: Session, data: schemas.RefundApply) -> Tuple[Optional[RefundRecord], Optional[str]]:
    task = get_task(db, data.task_id)
    if not task:
        return None, "打印任务不存在"
    if task.status in (TaskStatus.REFUNDED,):
        return None, "该任务已退款，无法重复申请"
    pending = db.query(RefundRecord).filter(
        and_(RefundRecord.task_id == data.task_id, RefundRecord.status == RefundStatus.PENDING)
    ).first()
    if pending:
        return None, f"该任务已有待审批的退款申请（申请ID: {pending.id}）"

    existing_deduct = (
        db.query(Transaction)
        .filter(
            Transaction.task_id == task.id,
            Transaction.type == TransactionType.DEDUCT
        )
        .order_by(Transaction.created_at.asc())
        .first()
    )

    refund = RefundRecord(
        task_id=task.id,
        original_transaction_id=existing_deduct.id if existing_deduct else None,
        student_id=task.student_id,
        refund_amount=task.total_amount,
        cash_refund=task.cash_used,
        subsidy_refund=task.subsidy_used,
        exception_type=data.exception_type,
        refund_reason=data.refund_reason,
        applicant_id=data.applicant_id,
        applicant_name=data.applicant_name,
        status=RefundStatus.PENDING,
    )
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund, None


def list_pending_refunds(db: Session) -> List[RefundRecord]:
    return (
        db.query(RefundRecord)
        .filter(RefundRecord.status == RefundStatus.PENDING)
        .order_by(RefundRecord.applied_at.asc())
        .all()
    )


def get_refund(db: Session, refund_id: int) -> Optional[RefundRecord]:
    return db.query(RefundRecord).filter(RefundRecord.id == refund_id).first()


def list_refunds(db: Session, skip: int = 0, limit: int = 50) -> List[RefundRecord]:
    return db.query(RefundRecord).order_by(RefundRecord.applied_at.desc()).offset(skip).limit(limit).all()


def approve_refund(db: Session, data: schemas.RefundApprove) -> Tuple[Optional[RefundRecord], Optional[str]]:
    refund = get_refund(db, data.refund_id)
    if not refund:
        return None, "退款申请不存在"
    if refund.status != RefundStatus.PENDING:
        return None, f"退款申请状态为 {refund.status.value}，无法审批"

    refund.approver_id = data.approver_id
    refund.approver_name = data.approver_name
    refund.approval_comment = data.approval_comment
    refund.approved_at = datetime.utcnow()

    if data.approve:
        refund.status = RefundStatus.APPROVED
        db.flush()
        result, err = _process_refund(db, refund)
        if err:
            db.rollback()
            return None, err
    else:
        refund.status = RefundStatus.REJECTED

    db.commit()
    db.refresh(refund)
    return refund, None


def _process_refund(db: Session, refund: RefundRecord) -> Tuple[Optional[RefundRecord], Optional[str]]:
    student = get_student(db, refund.student_id)
    if not student:
        return None, "学生不存在"

    task = get_task(db, refund.task_id)
    if not task:
        return None, "任务不存在"

    refund_amount = round(refund.cash_refund + refund.subsidy_refund, 2)

    if refund.subsidy_refund > 0:
        subsidy_usages = db.query(SubsidyUsage).filter(SubsidyUsage.task_id == task.id).all()
        for usage in subsidy_usages:
            sub = db.query(CourseSubsidy).filter(CourseSubsidy.id == usage.subsidy_id).first()
            if sub:
                sub.used_quota = round(max(0, sub.used_quota - usage.amount_used), 2)
                sub.remaining_quota = round(sub.remaining_quota + usage.amount_used, 2)

    reason = (
        f"异常退款：{refund.exception_type}-{refund.refund_reason}，"
        f"返还现金{refund.cash_refund}元，返还补贴{refund.subsidy_refund}元，"
        f"审批人：{refund.approver_name}"
    )

    _add_transaction(
        db, student,
        tx_type=TransactionType.REFUND,
        amount=refund_amount,
        cash_change=refund.cash_refund,
        subsidy_change=refund.subsidy_refund,
        reason=reason,
        task_id=task.id,
        refund_id=refund.id,
        operator_id=refund.approver_id,
        operator_name=refund.approver_name,
    )

    task.status = TaskStatus.REFUNDED
    task.is_locked = False
    task.lock_reason = None
    refund.status = RefundStatus.PROCESSED
    refund.processed_at = datetime.utcnow()

    db.flush()
    return refund, None


def grant_subsidy(db: Session, data: schemas.SubsidyCreate) -> Tuple[Optional[CourseSubsidy], Optional[str]]:
    existing = db.query(CourseSubsidy).filter(CourseSubsidy.subsidy_code == data.subsidy_code).first()
    if existing:
        return None, f"补贴码 {data.subsidy_code} 已存在"

    student = get_or_create_student(db, data.student_id)

    subsidy = CourseSubsidy(
        subsidy_code=data.subsidy_code,
        student_id=data.student_id,
        course_name=data.course_name,
        course_id=data.course_id,
        teacher_name=data.teacher_name,
        total_quota=data.total_quota,
        remaining_quota=data.total_quota,
        description=data.description,
        granted_by=data.granted_by,
        granted_by_name=data.granted_by_name,
        valid_until=data.valid_until,
    )
    db.add(subsidy)
    db.flush()

    reason = (
        f"课程补贴发放：课程《{data.course_name}》，老师：{data.teacher_name}，"
        f"额度：{data.total_quota}元，发放人：{data.granted_by_name}"
    )
    _add_transaction(
        db, student,
        tx_type=TransactionType.SUBSIDY_GRANT,
        amount=data.total_quota,
        cash_change=0.0,
        subsidy_change=data.total_quota,
        reason=reason,
        operator_id=data.granted_by,
        operator_name=data.granted_by_name,
    )

    db.commit()
    db.refresh(subsidy)
    return subsidy, None


def get_subsidy(db: Session, subsidy_id: int) -> Optional[CourseSubsidy]:
    return db.query(CourseSubsidy).filter(CourseSubsidy.id == subsidy_id).first()


def list_student_subsidies(db: Session, student_id: str) -> List[CourseSubsidy]:
    return (
        db.query(CourseSubsidy)
        .filter(CourseSubsidy.student_id == student_id)
        .order_by(CourseSubsidy.created_at.desc())
        .all()
    )


def list_subsidies(db: Session, skip: int = 0, limit: int = 100) -> List[CourseSubsidy]:
    return db.query(CourseSubsidy).order_by(CourseSubsidy.created_at.desc()).offset(skip).limit(limit).all()


def list_subsidy_usages(db: Session, subsidy_id: int) -> List[SubsidyUsage]:
    return (
        db.query(SubsidyUsage)
        .filter(SubsidyUsage.subsidy_id == subsidy_id)
        .order_by(SubsidyUsage.created_at.desc())
        .all()
    )


def create_operator(db: Session, data: schemas.OperatorCreate) -> Operator:
    op = db.query(Operator).filter(Operator.operator_id == data.operator_id).first()
    if op:
        return op
    op = Operator(
        operator_id=data.operator_id,
        name=data.name,
        account_type=data.account_type,
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op


def get_finance_deduction_report(db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    q = db.query(Transaction).filter(Transaction.type == TransactionType.DEDUCT)
    if start_date:
        q = q.filter(Transaction.created_at >= start_date)
    if end_date:
        q = q.filter(Transaction.created_at <= end_date)
    rows = q.all()
    total_amount = sum(abs(r.amount) for r in rows)
    return {
        "count": len(rows),
        "total_amount": round(total_amount, 2),
        "records": rows,
    }


def get_finance_refund_report(db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    q = db.query(RefundRecord).filter(RefundRecord.status == RefundStatus.PROCESSED)
    if start_date:
        q = q.filter(RefundRecord.processed_at >= start_date)
    if end_date:
        q = q.filter(RefundRecord.processed_at <= end_date)
    rows = q.all()
    total_amount = sum(r.refund_amount for r in rows)
    return {
        "count": len(rows),
        "total_amount": round(total_amount, 2),
        "records": rows,
    }


def get_finance_subsidy_report(db: Session, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    q_grant = db.query(CourseSubsidy)
    q_use = db.query(SubsidyUsage)
    if start_date:
        q_grant = q_grant.filter(CourseSubsidy.created_at >= start_date)
        q_use = q_use.filter(SubsidyUsage.created_at >= start_date)
    if end_date:
        q_grant = q_grant.filter(CourseSubsidy.created_at <= end_date)
        q_use = q_use.filter(SubsidyUsage.created_at <= end_date)
    grants = q_grant.all()
    uses = q_use.all()
    total_granted = sum(g.total_quota for g in grants)
    total_used = sum(u.amount_used for u in uses)
    return {
        "grant_count": len(grants),
        "total_granted": round(total_granted, 2),
        "usage_count": len(uses),
        "total_used": round(total_used, 2),
        "grant_records": grants,
        "usage_records": uses,
    }


def get_locked_tasks_report(db: Session):
    locked = list_locked_tasks(db)
    total_amount = sum(t.total_amount for t in locked)
    return {
        "count": len(locked),
        "total_amount": round(total_amount, 2),
        "records": locked,
    }


def recharge_cash(db: Session, student_id: str, amount: float, operator_id: str, operator_name: str):
    if amount <= 0:
        return None, "充值金额必须大于0"
    student = get_or_create_student(db, student_id)
    _add_transaction(
        db, student,
        tx_type=TransactionType.CASH_RECHARGE,
        amount=amount,
        cash_change=amount,
        subsidy_change=0.0,
        reason=f"现金充值：{amount}元，操作人：{operator_name}",
        operator_id=operator_id,
        operator_name=operator_name,
    )
    db.commit()
    db.refresh(student)
    return student, None
