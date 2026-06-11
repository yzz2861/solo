from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AppointmentCreate, AppointmentOut, AppointmentApprove, AppointmentReject,
    OperationLogOut,
)
from app import crud

router = APIRouter(prefix="/appointments", tags=["预约管理"])


@router.post("", response_model=AppointmentOut, summary="登记预约")
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    return crud.create_appointment(db, data)


@router.get("/{appointment_id}", response_model=AppointmentOut, summary="查询预约详情")
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    from app.models import Appointment
    from fastapi import HTTPException
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="预约单不存在")
    return appt


@router.post("/{appointment_id}/approve", response_model=AppointmentOut, summary="审批通过预约")
def approve_appointment(
    appointment_id: int,
    body: AppointmentApprove = AppointmentApprove(),
    db: Session = Depends(get_db),
):
    return crud.approve_appointment(db, appointment_id, body.operator)


@router.post("/{appointment_id}/reject", response_model=AppointmentOut, summary="退回预约")
def reject_appointment(
    appointment_id: int,
    body: AppointmentReject,
    db: Session = Depends(get_db),
):
    return crud.reject_appointment(db, appointment_id, body.reason, body.operator)


@router.get("/{appointment_id}/logs", response_model=List[OperationLogOut], summary="查询预约操作记录")
def get_appointment_logs(appointment_id: int, db: Session = Depends(get_db)):
    return crud.get_appointment_logs(db, appointment_id)
