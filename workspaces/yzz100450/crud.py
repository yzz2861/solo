from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date, timedelta
import models, schemas
from models import (
    BagStatus, AppointmentStatus, ItemStatus,
    UrgencyLevel, BloodType, BloodComponent
)


def generate_appointment_no(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"YY{today}"
    last_appt = db.query(models.Appointment).filter(
        models.Appointment.appointment_no.like(f"{prefix}%")
    ).order_by(models.Appointment.id.desc()).first()
    if last_appt:
        seq = int(last_appt.appointment_no[-4:]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def create_blood_bag(db: Session, bag: schemas.BloodBagCreate) -> models.BloodBag:
    db_bag = models.BloodBag(**bag.model_dump())
    db.add(db_bag)
    db.commit()
    db.refresh(db_bag)
    return db_bag


def get_blood_bag(db: Session, bag_id: int) -> models.BloodBag:
    return db.query(models.BloodBag).filter(models.BloodBag.id == bag_id).first()


def get_blood_bag_by_code(db: Session, bag_code: str) -> models.BloodBag:
    return db.query(models.BloodBag).filter(models.BloodBag.bag_code == bag_code).first()


def list_blood_bags(
    db: Session,
    blood_type: BloodType = None,
    component: BloodComponent = None,
    status: BagStatus = None,
    skip: int = 0,
    limit: int = 100
) -> list:
    query = db.query(models.BloodBag)
    if blood_type:
        query = query.filter(models.BloodBag.blood_type == blood_type)
    if component:
        query = query.filter(models.BloodBag.component == component)
    if status:
        query = query.filter(models.BloodBag.status == status)
    return query.order_by(models.BloodBag.expiration_date.asc()).offset(skip).limit(limit).all()


def update_blood_bag(db: Session, bag_id: int, bag_update: schemas.BloodBagUpdate) -> models.BloodBag:
    db_bag = get_blood_bag(db, bag_id)
    if not db_bag:
        return None
    update_data = bag_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bag, key, value)
    db.commit()
    db.refresh(db_bag)
    return db_bag


def get_available_bags(
    db: Session,
    blood_type: BloodType,
    component: BloodComponent,
    quantity: int = None
) -> list:
    query = db.query(models.BloodBag).filter(
        models.BloodBag.blood_type == blood_type,
        models.BloodBag.component == component,
        models.BloodBag.status == BagStatus.AVAILABLE,
        models.BloodBag.expiration_date >= date.today()
    ).order_by(models.BloodBag.expiration_date.asc())
    if quantity:
        query = query.limit(quantity)
    return query.all()


def count_available_bags(db: Session, blood_type: BloodType, component: BloodComponent) -> int:
    return db.query(models.BloodBag).filter(
        models.BloodBag.blood_type == blood_type,
        models.BloodBag.component == component,
        models.BloodBag.status == BagStatus.AVAILABLE,
        models.BloodBag.expiration_date >= date.today()
    ).count()


def check_duplicate_appointment(
    db: Session,
    hospital: str,
    blood_type: BloodType,
    component: BloodComponent,
    appointment_time: datetime
) -> models.Appointment:
    time_window_start = appointment_time - timedelta(hours=2)
    time_window_end = appointment_time + timedelta(hours=2)
    return db.query(models.Appointment).filter(
        models.Appointment.hospital == hospital,
        models.Appointment.blood_type == blood_type,
        models.Appointment.component == component,
        models.Appointment.appointment_time.between(time_window_start, time_window_end),
        models.Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.PARTIAL_FULFILLED
        ])
    ).first()


def create_appointment(db: Session, appt: schemas.AppointmentCreate) -> tuple:
    appointment_no = generate_appointment_no(db)

    available_count = count_available_bags(db, appt.blood_type, appt.component)

    db_appt = models.Appointment(
        **appt.model_dump(),
        appointment_no=appointment_no
    )

    if available_count == 0:
        db_appt.status = AppointmentStatus.REJECTED
        db.add(db_appt)
        db.commit()
        db.refresh(db_appt)
        rejection = models.RejectionRecord(
            appointment_id=db_appt.id,
            reason="库存不足，无可用血袋",
            rejected_by="system"
        )
        db.add(rejection)
        db.commit()
        return db_appt, False

    bags_to_reserve = get_available_bags(db, appt.blood_type, appt.component, appt.quantity)
    actual_quantity = len(bags_to_reserve)

    db.add(db_appt)
    db.flush()

    for bag in bags_to_reserve:
        bag.status = BagStatus.RESERVED
        item = models.AppointmentItem(
            appointment_id=db_appt.id,
            blood_bag_id=bag.id,
            status=ItemStatus.RESERVED
        )
        db.add(item)

    if actual_quantity >= appt.quantity:
        db_appt.status = AppointmentStatus.APPROVED
    elif actual_quantity > 0:
        db_appt.status = AppointmentStatus.PARTIAL_FULFILLED
    else:
        db_appt.status = AppointmentStatus.REJECTED
        rejection = models.RejectionRecord(
            appointment_id=db_appt.id,
            reason="库存不足，无可用血袋",
            rejected_by="system"
        )
        db.add(rejection)

    db.commit()
    db.refresh(db_appt)
    return db_appt, actual_quantity >= appt.quantity


def get_appointment(db: Session, appt_id: int) -> models.Appointment:
    return db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()


def get_appointment_by_no(db: Session, appointment_no: str) -> models.Appointment:
    return db.query(models.Appointment).filter(
        models.Appointment.appointment_no == appointment_no
    ).first()


def list_appointments(
    db: Session,
    status: AppointmentStatus = None,
    hospital: str = None,
    blood_type: BloodType = None,
    component: BloodComponent = None,
    urgency: UrgencyLevel = None,
    skip: int = 0,
    limit: int = 100
) -> list:
    query = db.query(models.Appointment)
    if status:
        query = query.filter(models.Appointment.status == status)
    if hospital:
        query = query.filter(models.Appointment.hospital.contains(hospital))
    if blood_type:
        query = query.filter(models.Appointment.blood_type == blood_type)
    if component:
        query = query.filter(models.Appointment.component == component)
    if urgency:
        query = query.filter(models.Appointment.urgency == urgency)
    return query.order_by(models.Appointment.created_at.desc()).offset(skip).limit(limit).all()


def update_appointment_status(
    db: Session,
    appt_id: int,
    status: AppointmentStatus,
    rejection_reason: str = None,
    rejected_by: str = None
) -> models.Appointment:
    db_appt = get_appointment(db, appt_id)
    if not db_appt:
        return None
    db_appt.status = status

    if status == AppointmentStatus.REJECTED and rejection_reason:
        if db_appt.rejection:
            db_appt.rejection.reason = rejection_reason
            if rejected_by:
                db_appt.rejection.rejected_by = rejected_by
        else:
            rejection = models.RejectionRecord(
                appointment_id=db_appt.id,
                reason=rejection_reason,
                rejected_by=rejected_by
            )
            db.add(rejection)

        for item in db_appt.items:
            if item.status == ItemStatus.RESERVED:
                item.status = ItemStatus.CANCELLED
                item.blood_bag.status = BagStatus.AVAILABLE

    db.commit()
    db.refresh(db_appt)
    return db_appt


def cancel_appointment(db: Session, appt_id: int) -> models.Appointment:
    return update_appointment_status(db, appt_id, AppointmentStatus.CANCELLED)


def issue_blood_bags(
    db: Session,
    appointment_id: int,
    blood_bag_ids: list,
    issue_data: schemas.IssueCreate
) -> list:
    db_appt = get_appointment(db, appointment_id)
    if not db_appt:
        return []

    issued_records = []
    issue_time = datetime.now()

    for bag_id in blood_bag_ids:
        item = db.query(models.AppointmentItem).filter(
            models.AppointmentItem.appointment_id == appointment_id,
            models.AppointmentItem.blood_bag_id == bag_id,
            models.AppointmentItem.status == ItemStatus.RESERVED
        ).first()

        if not item:
            continue

        item.status = ItemStatus.ISSUED
        item.issued_at = issue_time
        item.blood_bag.status = BagStatus.ISSUED

        delay_reason = None
        if db_appt.cold_chain_window_end and issue_data.cold_chain_actual_time:
            if issue_data.cold_chain_actual_time > db_appt.cold_chain_window_end:
                delay_reason = issue_data.cold_chain_delay_reason or "超出冷链交接窗口"

        record = models.IssueRecord(
            appointment_id=appointment_id,
            blood_bag_id=bag_id,
            receiver_name=issue_data.receiver_name,
            receiver_phone=issue_data.receiver_phone,
            issue_time=issue_time,
            cold_chain_actual_time=issue_data.cold_chain_actual_time,
            cold_chain_delay_reason=delay_reason,
            operator=issue_data.operator,
            remark=issue_data.remark
        )
        db.add(record)
        issued_records.append(record)

    reserved_count = db.query(models.AppointmentItem).filter(
        models.AppointmentItem.appointment_id == appointment_id,
        models.AppointmentItem.status == ItemStatus.RESERVED
    ).count()

    if reserved_count == 0:
        db_appt.status = AppointmentStatus.FULFILLED
    else:
        db_appt.status = AppointmentStatus.PARTIAL_FULFILLED

    db.commit()
    return issued_records


def get_expiry_risk_bags(db: Session, days_threshold: int = 3) -> list:
    today = date.today()
    expiry_date = today + timedelta(days=days_threshold)
    bags = db.query(models.BloodBag).filter(
        models.BloodBag.status.in_([BagStatus.AVAILABLE, BagStatus.RESERVED]),
        models.BloodBag.expiration_date <= expiry_date,
        models.BloodBag.expiration_date >= today
    ).order_by(models.BloodBag.expiration_date.asc()).all()

    result = []
    for bag in bags:
        days_to_expiry = (bag.expiration_date - today).days
        if days_to_expiry <= 1:
            risk_level = "high"
        elif days_to_expiry <= 2:
            risk_level = "medium"
        else:
            risk_level = "low"
        result.append({
            "blood_bag": bag,
            "days_to_expiry": days_to_expiry,
            "risk_level": risk_level
        })
    return result


def get_urgent_usage(db: Session) -> dict:
    urgent_appts = db.query(models.Appointment).filter(
        models.Appointment.urgency.in_([UrgencyLevel.URGENT, UrgencyLevel.EMERGENCY]),
        models.Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.PARTIAL_FULFILLED
        ])
    ).all()

    emergency_count = sum(1 for a in urgent_appts if a.urgency == UrgencyLevel.EMERGENCY)
    urgent_count = sum(1 for a in urgent_appts if a.urgency == UrgencyLevel.URGENT)
    total_bags = sum(len(a.items) for a in urgent_appts)

    return {
        "total_appointments": len(urgent_appts),
        "total_bags": total_bags,
        "emergency_count": emergency_count,
        "urgent_count": urgent_count,
        "appointments": urgent_appts
    }


def get_rejected_appointments(db: Session, skip: int = 0, limit: int = 100) -> list:
    return db.query(models.Appointment).filter(
        models.Appointment.status == AppointmentStatus.REJECTED
    ).order_by(models.Appointment.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_by_hospital(db: Session, hospital: str = None) -> dict:
    query = db.query(models.Appointment).filter(
        models.Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.PARTIAL_FULFILLED
        ])
    )
    if hospital:
        query = query.filter(models.Appointment.hospital.contains(hospital))

    appointments = query.order_by(models.Appointment.hospital.asc(), models.Appointment.appointment_time.asc()).all()

    hospital_map = {}
    total_pending = 0
    for appt in appointments:
        if appt.hospital not in hospital_map:
            hospital_map[appt.hospital] = []
        hospital_map[appt.hospital].append(appt)
        total_pending += 1

    result = []
    for hosp, appts in hospital_map.items():
        result.append({
            "hospital": hosp,
            "pending_count": len(appts),
            "appointments": appts
        })

    return {
        "hospitals": result,
        "total_pending": total_pending
    }


def get_reminder_list(db: Session, overdue_minutes: int = 30) -> list:
    now = datetime.now()
    pending_appts = db.query(models.Appointment).filter(
        models.Appointment.status.in_([
            AppointmentStatus.APPROVED,
            AppointmentStatus.PARTIAL_FULFILLED
        ]),
        models.Appointment.appointment_time < now
    ).all()

    reminders = []
    for appt in pending_appts:
        overdue = (now - appt.appointment_time).total_seconds() / 60
        if overdue >= overdue_minutes:
            reminders.append({
                "appointment_no": appt.appointment_no,
                "hospital": appt.hospital,
                "receiver_name": appt.receiver_name,
                "receiver_phone": appt.receiver_phone,
                "appointment_time": appt.appointment_time,
                "quantity": appt.quantity,
                "blood_type": appt.blood_type,
                "component": appt.component,
                "overdue_minutes": int(overdue)
            })

    reminders.sort(key=lambda x: x["overdue_minutes"], reverse=True)
    return {
        "total": len(reminders),
        "items": reminders
    }


def update_expired_bags(db: Session) -> int:
    today = date.today()
    expired_bags = db.query(models.BloodBag).filter(
        models.BloodBag.status.in_([BagStatus.AVAILABLE, BagStatus.RESERVED]),
        models.BloodBag.expiration_date < today
    ).all()

    count = 0
    for bag in expired_bags:
        bag.status = BagStatus.EXPIRED
        for item in bag.appointment_items:
            if item.status == ItemStatus.RESERVED:
                item.status = ItemStatus.CANCELLED
        count += 1

    db.commit()
    return count


def list_issue_records(
    db: Session,
    appointment_id: int = None,
    skip: int = 0,
    limit: int = 100
) -> list:
    query = db.query(models.IssueRecord)
    if appointment_id:
        query = query.filter(models.IssueRecord.appointment_id == appointment_id)
    return query.order_by(models.IssueRecord.created_at.desc()).offset(skip).limit(limit).all()
