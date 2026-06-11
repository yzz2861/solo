from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import GateRelease, GateCancel, CheckIn, TimeoutMark, AppointmentOut
from app import crud

router = APIRouter(prefix="/gate", tags=["闸口操作"])


@router.post("/{appointment_id}/release", response_model=AppointmentOut, summary="闸口放行")
def release_appointment(
    appointment_id: int,
    body: GateRelease = GateRelease(),
    db: Session = Depends(get_db),
):
    return crud.release_appointment(db, appointment_id, body.operator)


@router.post("/{appointment_id}/cancel-release", response_model=AppointmentOut, summary="撤销放行")
def cancel_release(
    appointment_id: int,
    body: GateCancel,
    db: Session = Depends(get_db),
):
    return crud.cancel_release(db, appointment_id, body.reason, body.operator)


@router.post("/{appointment_id}/check-in", response_model=AppointmentOut, summary="司机签到")
def check_in(
    appointment_id: int,
    body: CheckIn = CheckIn(),
    db: Session = Depends(get_db),
):
    return crud.check_in_appointment(db, appointment_id, body.operator)


@router.post("/{appointment_id}/timeout", response_model=AppointmentOut, summary="标记超时")
def mark_timeout(
    appointment_id: int,
    body: TimeoutMark = TimeoutMark(),
    db: Session = Depends(get_db),
):
    return crud.mark_timeout(db, appointment_id, body.operator)
