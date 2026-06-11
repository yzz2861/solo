import uuid
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException

from app.models import Appointment, ContainerInventory, OperationLog


def _gen_appointment_no() -> str:
    now = datetime.utcnow()
    return f"APPT{now.strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"


def _log_operation(
    db: Session,
    appointment_id: int,
    operation_type: str,
    operator: str,
    detail: Optional[str] = None,
):
    log = OperationLog(
        appointment_id=appointment_id,
        operation_type=operation_type,
        operator=operator,
        detail=detail,
    )
    db.add(log)


def _get_inventory(
    db: Session,
    shipping_company: str,
    ship_name: str,
    container_type: str,
) -> Optional[ContainerInventory]:
    return (
        db.query(ContainerInventory)
        .filter(
            and_(
                ContainerInventory.shipping_company == shipping_company,
                ContainerInventory.ship_name == ship_name,
                ContainerInventory.container_type == container_type,
            )
        )
        .first()
    )


def _check_duplicate_vehicle(
    db: Session,
    vehicle_plate: str,
    pickup_date: date,
    exclude_id: Optional[int] = None,
) -> Optional[Appointment]:
    active_statuses = (
        Appointment.STATUS_PENDING,
        Appointment.STATUS_APPROVED,
        Appointment.STATUS_RELEASED,
    )
    q = db.query(Appointment).filter(
        and_(
            Appointment.vehicle_plate == vehicle_plate,
            Appointment.pickup_date == pickup_date,
            Appointment.status.in_(active_statuses),
        )
    )
    if exclude_id is not None:
        q = q.filter(Appointment.id != exclude_id)
    return q.first()


def create_appointment(db: Session, data) -> Appointment:
    duplicate = _check_duplicate_vehicle(db, data.vehicle_plate, data.pickup_date)
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"车牌 {data.vehicle_plate} 在 {data.pickup_date} 已有有效预约（预约号: {duplicate.appointment_no}），不可重复申请",
        )

    inventory = _get_inventory(db, data.shipping_company, data.ship_name, data.container_type)
    if inventory is None or inventory.available_qty <= 0:
        raise HTTPException(
            status_code=422,
            detail=f"船公司 {data.shipping_company} 船名 {data.ship_name} 箱型 {data.container_type} 库存不足或未录入，当前可用: {inventory.available_qty if inventory else 0}",
        )

    appointment = Appointment(
        appointment_no=_gen_appointment_no(),
        shipping_company=data.shipping_company,
        ship_name=data.ship_name,
        container_type=data.container_type,
        pickup_date=data.pickup_date,
        driver_name=data.driver_name,
        driver_phone=data.driver_phone,
        vehicle_plate=data.vehicle_plate,
        status=Appointment.STATUS_PENDING,
    )
    db.add(appointment)
    db.flush()

    _log_operation(
        db, appointment.id, "CREATE", "system",
        f"创建预约: {appointment.appointment_no}, 船公司={data.shipping_company}, 箱型={data.container_type}, 提箱日期={data.pickup_date}, 车牌={data.vehicle_plate}",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def approve_appointment(db: Session, appointment_id: int, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status != Appointment.STATUS_PENDING:
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法审批")

    inventory = _get_inventory(db, appointment.shipping_company, appointment.ship_name, appointment.container_type)
    if inventory is None or inventory.available_qty <= 0:
        appointment.status = Appointment.STATUS_REJECTED
        appointment.reject_reason = f"船名 {appointment.ship_name} 箱型 {appointment.container_type} 库存不足（可用: {inventory.available_qty if inventory else 0}）"
        appointment.updated_at = datetime.utcnow()
        _log_operation(
            db, appointment.id, "REJECT", operator,
            f"审批时库存不足，自动退回: {appointment.reject_reason}",
        )
        db.commit()
        db.refresh(appointment)
        raise HTTPException(status_code=422, detail=appointment.reject_reason)

    inventory.occupied_qty += 1
    inventory.updated_at = datetime.utcnow()

    appointment.status = Appointment.STATUS_APPROVED
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "APPROVE", operator,
        f"审批通过，占用库存: 船公司={appointment.shipping_company}, 船名={appointment.ship_name}, 箱型={appointment.container_type}",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def reject_appointment(db: Session, appointment_id: int, reason: str, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status != Appointment.STATUS_PENDING:
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法退回")

    appointment.status = Appointment.STATUS_REJECTED
    appointment.reject_reason = reason
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "REJECT", operator,
        f"退回预约: {reason}",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def release_appointment(db: Session, appointment_id: int, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status != Appointment.STATUS_APPROVED:
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法放行。只有已审批的预约才可放行")

    appointment.status = Appointment.STATUS_RELEASED
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "RELEASE", operator,
        f"闸口放行: 司机={appointment.driver_name}, 车牌={appointment.vehicle_plate}",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def cancel_release(db: Session, appointment_id: int, reason: str, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status != Appointment.STATUS_RELEASED:
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法撤销放行。只有已放行的预约才可撤销")

    inventory = _get_inventory(db, appointment.shipping_company, appointment.ship_name, appointment.container_type)
    if inventory and inventory.occupied_qty > 0:
        inventory.occupied_qty -= 1
        inventory.updated_at = datetime.utcnow()

    appointment.status = Appointment.STATUS_CANCELLED
    appointment.reject_reason = reason
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "CANCEL_RELEASE", operator,
        f"撤销放行: {reason}，释放库存占用",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def check_in_appointment(db: Session, appointment_id: int, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status != Appointment.STATUS_RELEASED:
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法签到。只有已放行的预约才可签到")

    inventory = _get_inventory(db, appointment.shipping_company, appointment.ship_name, appointment.container_type)
    if inventory:
        if inventory.total_qty > 0:
            inventory.total_qty -= 1
        if inventory.occupied_qty > 0:
            inventory.occupied_qty -= 1
        inventory.updated_at = datetime.utcnow()

    appointment.status = Appointment.STATUS_CHECKED_IN
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "CHECK_IN", operator,
        f"司机签到提箱: 司机={appointment.driver_name}, 车牌={appointment.vehicle_plate}，库存总量和占用各-1",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def mark_timeout(db: Session, appointment_id: int, operator: str) -> Appointment:
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="预约单不存在")
    if appointment.status not in (Appointment.STATUS_APPROVED, Appointment.STATUS_RELEASED):
        raise HTTPException(status_code=400, detail=f"预约单状态为 {appointment.status}，无法标记超时")

    inventory = _get_inventory(db, appointment.shipping_company, appointment.ship_name, appointment.container_type)
    if inventory and inventory.occupied_qty > 0:
        inventory.occupied_qty -= 1
        inventory.updated_at = datetime.utcnow()

    appointment.status = Appointment.STATUS_TIMEOUT
    appointment.updated_at = datetime.utcnow()
    _log_operation(
        db, appointment.id, "TIMEOUT", operator,
        f"司机超时未签到，释放库存占用",
    )

    db.commit()
    db.refresh(appointment)
    return appointment


def get_dashboard(db: Session) -> dict:
    unreleased = (
        db.query(Appointment)
        .filter(Appointment.status == Appointment.STATUS_APPROVED)
        .all()
    )
    occupied = (
        db.query(Appointment)
        .filter(Appointment.status == Appointment.STATUS_RELEASED)
        .all()
    )
    rejected = (
        db.query(Appointment)
        .filter(Appointment.status == Appointment.STATUS_REJECTED)
        .all()
    )
    timeout = (
        db.query(Appointment)
        .filter(Appointment.status == Appointment.STATUS_TIMEOUT)
        .all()
    )

    summary = {
        "unreleased_count": len(unreleased),
        "occupied_count": len(occupied),
        "rejected_count": len(rejected),
        "timeout_count": len(timeout),
    }

    return {
        "summary": summary,
        "unreleased": unreleased,
        "occupied": occupied,
        "rejected": rejected,
        "timeout": timeout,
    }


def filter_by_ship_name(db: Session, ship_name: str) -> List[Appointment]:
    return (
        db.query(Appointment)
        .filter(Appointment.ship_name.ilike(f"%{ship_name}%"))
        .order_by(Appointment.pickup_date.desc(), Appointment.created_at.desc())
        .all()
    )


def get_appointment_logs(db: Session, appointment_id: int) -> List[OperationLog]:
    return (
        db.query(OperationLog)
        .filter(OperationLog.appointment_id == appointment_id)
        .order_by(OperationLog.created_at.asc())
        .all()
    )


def recalculate_inventory(db: Session):
    inventories = db.query(ContainerInventory).all()
    for inv in inventories:
        active_count = (
            db.query(Appointment)
            .filter(
                and_(
                    Appointment.shipping_company == inv.shipping_company,
                    Appointment.ship_name == inv.ship_name,
                    Appointment.container_type == inv.container_type,
                    Appointment.status.in_(
                        (Appointment.STATUS_APPROVED, Appointment.STATUS_RELEASED)
                    ),
                )
            )
            .count()
        )
        inv.occupied_qty = active_count
        inv.updated_at = datetime.utcnow()
    db.commit()
