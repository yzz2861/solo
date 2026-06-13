from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, date, timedelta
from typing import List, Tuple, Optional
import models, schemas
from models import (
    BagStatus, AppointmentStatus, ItemStatus,
    UrgencyLevel, BloodType, BloodComponent
)


TERMINAL_STATUSES = {BagStatus.ISSUED, BagStatus.EXPIRED, BagStatus.DAMAGED}

STATUS_TRANSITION_RULES = {
    BagStatus.AVAILABLE: {
        BagStatus.RESERVED,
        BagStatus.ISSUED,
        BagStatus.EXPIRED,
        BagStatus.DAMAGED,
        BagStatus.AVAILABLE,
    },
    BagStatus.RESERVED: {
        BagStatus.AVAILABLE,
        BagStatus.ISSUED,
        BagStatus.EXPIRED,
        BagStatus.DAMAGED,
        BagStatus.RESERVED,
    },
    BagStatus.ISSUED: {BagStatus.ISSUED},
    BagStatus.EXPIRED: {BagStatus.EXPIRED},
    BagStatus.DAMAGED: {BagStatus.DAMAGED},
}

URGENCY_PRIORITY = {
    UrgencyLevel.EMERGENCY: 3,
    UrgencyLevel.URGENT: 2,
    UrgencyLevel.NORMAL: 1,
}


def is_valid_status_transition(current: BagStatus, target: BagStatus) -> bool:
    if target not in STATUS_TRANSITION_RULES:
        return False
    allowed = STATUS_TRANSITION_RULES.get(current, set())
    return target in allowed


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


def update_blood_bag(
    db: Session,
    bag_id: int,
    bag_update: schemas.BloodBagUpdate
) -> Tuple[Optional[models.BloodBag], Optional[str]]:
    """
    更新血袋信息，带状态流转保护。
    返回: (更新后的血袋对象或None, 错误信息或None)
    """
    db_bag = get_blood_bag(db, bag_id)
    if not db_bag:
        return None, "血袋不存在"

    update_data = bag_update.model_dump(exclude_unset=True)

    if "status" in update_data:
        target_status = update_data["status"]
        if not is_valid_status_transition(db_bag.status, target_status):
            return None, (
                f"非法状态流转: {db_bag.status.value} → {target_status.value}。"
                f"终态(已发放/已过期/已损坏)的血袋不可变更状态"
            )

        if db_bag.status in TERMINAL_STATUSES:
            return None, (
                f"血袋处于终态({db_bag.status.value})，不可修改状态"
            )

    for key, value in update_data.items():
        setattr(db_bag, key, value)

    db.commit()
    db.refresh(db_bag)
    return db_bag, None


def get_available_bags(
    db: Session,
    blood_type: BloodType,
    component: BloodComponent,
    quantity: int = None
) -> List[models.BloodBag]:
    """
    获取可预约血袋，双重保护：
    1. status == AVAILABLE（主要条件）
    2. 显式排除所有终态（ISSUED / EXPIRED / DAMAGED）
    3. 有效期校验
    4. 按有效期从近到远排序（FIFO，快过期的优先被分配）
    """
    query = db.query(models.BloodBag).filter(
        models.BloodBag.blood_type == blood_type,
        models.BloodBag.component == component,
        models.BloodBag.status == BagStatus.AVAILABLE,
        models.BloodBag.expiration_date >= date.today(),
        models.BloodBag.status.notin_(TERMINAL_STATUSES)
    ).order_by(models.BloodBag.expiration_date.asc())

    if quantity:
        query = query.limit(quantity)
    return query.all()


def count_available_bags(db: Session, blood_type: BloodType, component: BloodComponent) -> int:
    """可用血袋计数，同样带终态排除保护"""
    return db.query(models.BloodBag).filter(
        models.BloodBag.blood_type == blood_type,
        models.BloodBag.component == component,
        models.BloodBag.status == BagStatus.AVAILABLE,
        models.BloodBag.expiration_date >= date.today(),
        models.BloodBag.status.notin_(TERMINAL_STATUSES)
    ).count()


def _get_preemptible_reserved_bags(
    db: Session,
    blood_type: BloodType,
    component: BloodComponent,
    target_urgency: UrgencyLevel,
    max_age_days: int = 2,
    quantity: int = None
) -> List[models.BloodBag]:
    """
    查找可以被高优先级预约抢占的已锁定血袋：
    - 仅可从 紧急程度 低于当前预约的预约中抢占
    - 仅抢占 有效期在 max_age_days 天内（快过期）的血袋（避免抢占长期有效的）
    - 按有效期从近到远排序（先抢占最可能浪费的）
    """
    target_priority = URGENCY_PRIORITY[target_urgency]

    lower_urgencies = [
        u for u, p in URGENCY_PRIORITY.items() if p < target_priority
    ]
    if not lower_urgencies:
        return []

    today = date.today()
    near_expiry_cutoff = today + timedelta(days=max_age_days)

    query = db.query(models.BloodBag).join(
        models.AppointmentItem,
        models.AppointmentItem.blood_bag_id == models.BloodBag.id
    ).join(
        models.Appointment,
        models.Appointment.id == models.AppointmentItem.appointment_id
    ).filter(
        models.BloodBag.blood_type == blood_type,
        models.BloodBag.component == component,
        models.BloodBag.status == BagStatus.RESERVED,
        models.BloodBag.status.notin_(TERMINAL_STATUSES),
        models.BloodBag.expiration_date >= today,
        models.BloodBag.expiration_date <= near_expiry_cutoff,
        models.AppointmentItem.status == ItemStatus.RESERVED,
        models.Appointment.urgency.in_(lower_urgencies),
        models.Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.APPROVED,
            AppointmentStatus.PARTIAL_FULFILLED
        ])
    ).order_by(models.BloodBag.expiration_date.asc())

    if quantity:
        query = query.limit(quantity)
    return query.all()


def _preempt_bag(
    db: Session,
    bag: models.BloodBag,
    new_appointment_id: int,
    reason: str
) -> Optional[models.Appointment]:
    """
    执行抢占：从低优先级预约中拿走一袋，转交给新预约。
    - 将原预约item标记为CANCELLED
    - 检查并更新原预约状态
    - 为新预约创建RESERVED item
    - 返回被抢占的原预约对象（供通知/记录用）
    """
    old_item = db.query(models.AppointmentItem).filter(
        models.AppointmentItem.blood_bag_id == bag.id,
        models.AppointmentItem.status == ItemStatus.RESERVED
    ).first()

    if not old_item:
        return None

    old_appointment = old_item.appointment

    old_item.status = ItemStatus.CANCELLED
    if old_item.blood_bag:
        old_item.blood_bag.status = BagStatus.AVAILABLE
    db.flush()

    remaining_reserved = db.query(models.AppointmentItem).filter(
        models.AppointmentItem.appointment_id == old_appointment.id,
        models.AppointmentItem.status == ItemStatus.RESERVED
    ).count()

    if remaining_reserved == 0:
        old_appointment.status = AppointmentStatus.PENDING
    else:
        old_appointment.status = AppointmentStatus.PARTIAL_FULFILLED

    if not old_appointment.remark:
        old_appointment.remark = ""
    old_appointment.remark += (
        f"\n[系统调整] {datetime.now().strftime('%Y-%m-%d %H:%M')}: "
        f"血袋 {bag.bag_code} 因{reason}被更高优先级预约调度，请注意后续补配"
    )
    db.flush()

    bag.status = BagStatus.RESERVED
    new_item = models.AppointmentItem(
        appointment_id=new_appointment_id,
        blood_bag_id=bag.id,
        status=ItemStatus.RESERVED
    )
    db.add(new_item)
    db.flush()

    return old_appointment


def _select_bags_for_appointment(
    db: Session,
    appt: schemas.AppointmentCreate
) -> Tuple[List[models.BloodBag], List[dict]]:
    """
    综合调度：为预约选择要锁定的血袋。
    规则（优先级从高到低）：
      1. 先从 available 池中按有效期优先取（FIFO）
      2. 若不够且当前预约为 急诊/加急：
         - 从低优先级预约中抢占 快过期（≤2天）的已锁定血袋
         - 急诊最多可抢占，加急抢占上限更保守
      3. 返回 (选定血袋列表, 抢占记录列表)
    """
    needed = appt.quantity
    selected: List[models.BloodBag] = []
    preemptions: List[dict] = []

    available_bags = get_available_bags(db, appt.blood_type, appt.component, needed)
    selected.extend(available_bags)
    remaining_needed = needed - len(selected)

    if remaining_needed > 0 and appt.urgency in (UrgencyLevel.EMERGENCY, UrgencyLevel.URGENT):
        if appt.urgency == UrgencyLevel.EMERGENCY:
            max_preempt = remaining_needed
            expiry_window = 2
            preempt_reason = "急诊优先调度"
        else:
            max_preempt = min(remaining_needed, max(1, remaining_needed // 2 + 1))
            expiry_window = 1
            preempt_reason = "加急优先调度"

        preemptible = _get_preemptible_reserved_bags(
            db,
            appt.blood_type,
            appt.component,
            appt.urgency,
            max_age_days=expiry_window,
            quantity=max_preempt
        )

        for bag in preemptible:
            if remaining_needed <= 0:
                break
            selected.append(bag)
            preemptions.append({
                "bag_code": bag.bag_code,
                "days_to_expiry": (bag.expiration_date - date.today()).days,
                "reason": preempt_reason
            })
            remaining_needed -= 1

    return selected, preemptions


def check_duplicate_appointment(
    db: Session,
    hospital: str,
    blood_type: BloodType,
    component: BloodComponent,
    appointment_time: datetime
) -> Optional[models.Appointment]:
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


def create_appointment(
    db: Session,
    appt: schemas.AppointmentCreate
) -> Tuple[models.Appointment, bool, List[dict]]:
    """
    创建预约（带综合调度和加急抢占逻辑）。
    返回: (预约对象, 是否完全满足, 抢占记录列表)
    """
    appointment_no = generate_appointment_no(db)

    db_appt = models.Appointment(
        **appt.model_dump(),
        appointment_no=appointment_no
    )
    db.add(db_appt)
    db.flush()

    selected_bags, preemptions = _select_bags_for_appointment(db, appt)

    preempted_from_appointments = []

    for bag in selected_bags:
        if bag.status == BagStatus.AVAILABLE:
            bag.status = BagStatus.RESERVED
            item = models.AppointmentItem(
                appointment_id=db_appt.id,
                blood_bag_id=bag.id,
                status=ItemStatus.RESERVED
            )
            db.add(item)
        elif bag.status == BagStatus.RESERVED:
            old_appt = _preempt_bag(
                db, bag, db_appt.id,
                reason=f"{appt.urgency.value} 预约优先 ({appt.hospital})"
            )
            if old_appt and old_appt not in preempted_from_appointments:
                preempted_from_appointments.append(old_appt)

    db.flush()

    actual_quantity = len(selected_bags)

    if actual_quantity >= appt.quantity:
        db_appt.status = AppointmentStatus.APPROVED
    elif actual_quantity > 0:
        db_appt.status = AppointmentStatus.PARTIAL_FULFILLED
    else:
        db_appt.status = AppointmentStatus.REJECTED
        rejection = models.RejectionRecord(
            appointment_id=db_appt.id,
            reason="库存不足，无可用血袋（加急调度池也已耗尽）",
            rejected_by="system"
        )
        db.add(rejection)

    if preemptions and db_appt.remark is None:
        db_appt.remark = ""

    if preemptions:
        preempt_info = "; ".join(
            f"{p['bag_code']}(剩{p['days_to_expiry']}天,{p['reason']})"
            for p in preemptions
        )
        db_appt.remark = (db_appt.remark or "") + (
            f"\n[调度说明] {datetime.now().strftime('%Y-%m-%d %H:%M')}: "
            f"从低优先级预约中紧急调配血袋: {preempt_info}"
        )

    db.commit()
    db.refresh(db_appt)
    return db_appt, actual_quantity >= appt.quantity, preemptions


def get_appointment(db: Session, appt_id: int) -> Optional[models.Appointment]:
    return db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()


def get_appointment_by_no(db: Session, appointment_no: str) -> Optional[models.Appointment]:
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
) -> Optional[models.Appointment]:
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
                if item.blood_bag and item.blood_bag.status not in TERMINAL_STATUSES:
                    item.blood_bag.status = BagStatus.AVAILABLE

    db.commit()
    db.refresh(db_appt)
    return db_appt


def cancel_appointment(db: Session, appt_id: int) -> Optional[models.Appointment]:
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
        if item.blood_bag:
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
