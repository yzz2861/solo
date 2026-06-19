from datetime import datetime, date, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models import VehicleRecord, WashRecord, InspectionRecord, BlockRecord, VehiclePhoto
from app.schemas import (
    VehicleEntryCreate, VehicleLoadComplete, VehicleWashStart, VehicleWashComplete,
    VehicleInspect, VehicleExit, VehicleQueueItem, BlockResolve
)


STATUS_TEXT_MAP = {
    "entered": "已进场待装载",
    "loading": "装载中",
    "loaded": "装载完成待洗轮",
    "washing": "洗轮中",
    "washed": "洗轮完成待检查",
    "inspecting": "检查中",
    "blocked": "已拦截",
    "inspected": "检查通过待出场",
    "exited": "已出场",
}


class BusinessRuleError(Exception):
    def __init__(self, message: str, error_code: str = "BUSINESS_ERROR", details: Optional[dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


def _create_block_record(
    db: Session,
    vehicle_record: VehicleRecord,
    block_type: str,
    block_reason: str,
    operator: Optional[str] = None,
    is_environmental: bool = False
) -> BlockRecord:
    block = BlockRecord(
        vehicle_record_id=vehicle_record.id,
        plate_number=vehicle_record.plate_number,
        block_type=block_type,
        block_reason=block_reason,
        block_operator=operator,
        is_environmental_issue=is_environmental,
    )
    db.add(block)
    db.flush()

    vehicle_record.status = "blocked"
    vehicle_record.block_count += 1
    vehicle_record.last_block_reason = block_reason
    db.flush()
    return block


def check_vehicle_can_enter(db: Session, plate_number: str) -> None:
    active_record = (
        db.query(VehicleRecord)
        .filter(
            VehicleRecord.plate_number == plate_number,
            VehicleRecord.exit_time.is_(None),
            VehicleRecord.status != "exited",
        )
        .first()
    )
    if active_record:
        raise BusinessRuleError(
            f"车牌 {plate_number} 当前在场内，状态为「{STATUS_TEXT_MAP.get(active_record.status, active_record.status)}」，"
            f"进场时间 {active_record.entry_time.strftime('%Y-%m-%d %H:%M:%S')}，未出场前不能再次进场",
            "VEHICLE_ALREADY_ON_SITE",
            {"active_record_id": active_record.id, "status": active_record.status}
        )


def vehicle_entry(db: Session, data: VehicleEntryCreate) -> VehicleRecord:
    check_vehicle_can_enter(db, data.plate_number)

    record = VehicleRecord(
        plate_number=data.plate_number,
        driver_name=data.driver_name,
        driver_phone=data.driver_phone,
        vehicle_type=data.vehicle_type,
        construction_site=data.construction_site,
        gate_operator=data.gate_operator,
        status="entered",
    )
    db.add(record)
    db.flush()

    max_pos = (
        db.query(func.max(VehicleRecord.queue_position))
        .filter(VehicleRecord.exit_time.is_(None))
        .scalar()
    ) or 0
    record.queue_position = max_pos + 1
    db.flush()
    return record


def vehicle_load_complete(db: Session, record_id: int, data: VehicleLoadComplete) -> VehicleRecord:
    record = db.query(VehicleRecord).filter(VehicleRecord.id == record_id).first()
    if not record:
        raise BusinessRuleError("车辆记录不存在", "RECORD_NOT_FOUND")
    if record.status in ("exited",):
        raise BusinessRuleError("车辆已出场，无法更新装载信息", "VEHICLE_EXITED")

    record.load_complete_time = datetime.now()
    record.load_cargo = data.load_cargo
    record.load_weight = data.load_weight
    record.status = "loaded"
    if data.operator:
        record.safety_officer = data.operator
    db.flush()
    return record


def vehicle_wash_start(db: Session, record_id: int, data: VehicleWashStart) -> Tuple[VehicleRecord, WashRecord]:
    record = db.query(VehicleRecord).filter(VehicleRecord.id == record_id).first()
    if not record:
        raise BusinessRuleError("车辆记录不存在", "RECORD_NOT_FOUND")
    if record.status == "exited":
        raise BusinessRuleError("车辆已出场", "VEHICLE_EXITED")
    if record.status == "washing":
        raise BusinessRuleError("车辆正在洗轮中", "WASH_IN_PROGRESS")

    now = datetime.now()
    wash = WashRecord(
        vehicle_record_id=record_id,
        wash_station=data.wash_station,
        operator=data.operator,
        start_time=now,
        is_rewash=data.is_rewash,
        rewash_reason=data.rewash_reason,
    )
    db.add(wash)
    db.flush()

    record.wash_start_time = now
    record.status = "washing"
    if data.is_rewash:
        record.is_rewashed = True
        record.rewash_count += 1
    db.flush()
    return record, wash


def vehicle_wash_complete(db: Session, record_id: int, data: VehicleWashComplete) -> Tuple[VehicleRecord, WashRecord]:
    record = db.query(VehicleRecord).filter(VehicleRecord.id == record_id).first()
    if not record:
        raise BusinessRuleError("车辆记录不存在", "RECORD_NOT_FOUND")
    if record.status != "washing":
        raise BusinessRuleError("车辆当前不在洗轮状态，无法完成洗轮", "NOT_WASHING")

    now = datetime.now()
    active_wash = (
        db.query(WashRecord)
        .filter(
            WashRecord.vehicle_record_id == record_id,
            WashRecord.end_time.is_(None),
        )
        .order_by(WashRecord.id.desc())
        .first()
    )
    if not active_wash:
        raise BusinessRuleError("未找到进行中的洗轮记录", "NO_ACTIVE_WASH")

    active_wash.end_time = now
    duration = int((now - active_wash.start_time).total_seconds())
    active_wash.duration_seconds = max(0, duration)
    active_wash.water_pressure = data.water_pressure
    active_wash.quality_score = data.quality_score
    active_wash.remark = data.remark
    db.flush()

    record.wash_complete_time = now
    record.status = "washed"
    db.flush()
    return record, active_wash


def _has_tarp_photo(db: Session, record_id: int) -> bool:
    return (
        db.query(VehiclePhoto)
        .filter(
            VehiclePhoto.vehicle_record_id == record_id,
            VehiclePhoto.photo_type == "tarp",
        )
        .first()
    ) is not None


def _has_wheel_after_photo(db: Session, record_id: int) -> bool:
    return (
        db.query(VehiclePhoto)
        .filter(
            VehiclePhoto.vehicle_record_id == record_id,
            VehiclePhoto.photo_type == "wheel_after",
        )
        .first()
    ) is not None


def vehicle_inspect(db: Session, record_id: int, data: VehicleInspect) -> Tuple[VehicleRecord, InspectionRecord, Optional[BlockRecord]]:
    record = db.query(VehicleRecord).filter(VehicleRecord.id == record_id).first()
    if not record:
        raise BusinessRuleError("车辆记录不存在", "RECORD_NOT_FOUND")
    if record.status == "exited":
        raise BusinessRuleError("车辆已出场", "VEHICLE_EXITED")

    if not record.wash_complete_time:
        raise BusinessRuleError(
            "车辆未完成洗轮，不能进行检查。请先完成洗轮流程",
            "WASH_NOT_COMPLETED",
            {"status": record.status}
        )

    has_tarp_photo = _has_tarp_photo(db, record_id)
    has_wheel_after = _has_wheel_after_photo(db, record_id)
    data_dict = data.model_dump()
    tarp_photo_taken = data_dict.get("tarp_photo_taken", False) or has_tarp_photo

    failure_reasons = []
    if not tarp_photo_taken:
        failure_reasons.append("篷布照片缺失")
    if not data_dict.get("tarp_cover_ok", False):
        failure_reasons.append("篷布覆盖不合格")
    if not data_dict.get("wheel_clean_ok", False):
        failure_reasons.append("车轮清洁不合格")
    if not data_dict.get("body_clean_ok", False):
        failure_reasons.append("车身清洁不合格")
    if not data_dict.get("license_plate_clear", False):
        failure_reasons.append("车牌不清晰")
    if data_dict.get("overloaded", False):
        failure_reasons.append("超载")
    if not has_wheel_after:
        failure_reasons.append("洗轮后照片缺失")

    passed = len(failure_reasons) == 0
    need_rewash = data_dict.get("need_rewash", False) or (
        not data_dict.get("wheel_clean_ok", False) or not data_dict.get("body_clean_ok", False)
    )

    now = datetime.now()
    inspection = InspectionRecord(
        vehicle_record_id=record_id,
        inspector=data.inspector,
        inspection_time=now,
        tarp_cover_ok=data_dict.get("tarp_cover_ok", False),
        tarp_photo_taken=tarp_photo_taken,
        wheel_clean_ok=data_dict.get("wheel_clean_ok", False),
        body_clean_ok=data_dict.get("body_clean_ok", False),
        license_plate_clear=data_dict.get("license_plate_clear", False),
        overloaded=data_dict.get("overloaded", False),
        passed=passed,
        failure_reason="；".join(failure_reasons) if failure_reasons else None,
        need_rewash=need_rewash,
        remark=data_dict.get("remark"),
    )
    db.add(inspection)
    db.flush()

    record.inspection_time = now
    if data.inspector:
        record.inspector = data.inspector

    block_record = None
    if not passed:
        record.status = "blocked"
        reason_str = "；".join(failure_reasons)
        block_type = "no_tarp_photo" if "篷布照片缺失" in failure_reasons else "inspection_failed"
        is_env = "篷布覆盖不合格" in failure_reasons or "车轮清洁不合格" in failure_reasons or "车身清洁不合格" in failure_reasons
        block_record = _create_block_record(
            db, record,
            block_type=block_type,
            block_reason=f"检查不通过：{reason_str}",
            operator=data.inspector,
            is_environmental=is_env,
        )
    else:
        record.status = "inspected"
    db.flush()
    return record, inspection, block_record


def vehicle_exit(db: Session, record_id: int, data: VehicleExit) -> VehicleRecord:
    record = db.query(VehicleRecord).filter(VehicleRecord.id == record_id).first()
    if not record:
        raise BusinessRuleError("车辆记录不存在", "RECORD_NOT_FOUND")
    if record.status == "exited":
        raise BusinessRuleError("车辆已出场", "VEHICLE_EXITED")

    if not record.wash_complete_time:
        raise BusinessRuleError(
            "车辆未完成洗轮，不能出场！请先完成洗轮流程。当前状态："
            f"{STATUS_TEXT_MAP.get(record.status, record.status)}",
            "EXIT_NO_WASH",
            {"status": record.status}
        )

    active_block = (
        db.query(BlockRecord)
        .filter(
            BlockRecord.vehicle_record_id == record_id,
            BlockRecord.resolved == False,
        )
        .first()
    )
    if active_block:
        raise BusinessRuleError(
            f"车辆存在未解决的拦截记录，不能出场。拦截原因：{active_block.block_reason}",
            "EXIT_UNRESOLVED_BLOCK",
            {"block_id": active_block.id, "block_reason": active_block.block_reason}
        )

    if record.status not in ("inspected", "washed"):
        if record.status == "blocked":
            raise BusinessRuleError(
                "车辆当前被拦截状态，需先解决拦截问题后才能出场",
                "EXIT_BLOCKED",
                {"last_block_reason": record.last_block_reason}
            )
        raise BusinessRuleError(
            f"车辆当前状态「{STATUS_TEXT_MAP.get(record.status, record.status)}」不允许出场。"
            f"请完成洗轮→检查流程后再出场。",
            "EXIT_INVALID_STATUS",
            {"status": record.status}
        )

    now = datetime.now()
    record.exit_time = now
    record.status = "exited"
    if data.gate_operator:
        record.gate_operator = data.gate_operator
    db.flush()
    return record


def resolve_block(db: Session, block_id: int, data: BlockResolve) -> BlockRecord:
    block = db.query(BlockRecord).filter(BlockRecord.id == block_id).first()
    if not block:
        raise BusinessRuleError("拦截记录不存在", "BLOCK_NOT_FOUND")
    if block.resolved:
        raise BusinessRuleError("该拦截记录已解决", "BLOCK_ALREADY_RESOLVED")

    block.resolved = True
    block.resolve_time = datetime.now()
    block.resolve_method = data.resolve_method
    block.resolve_operator = data.resolve_operator
    db.flush()

    record = db.query(VehicleRecord).filter(VehicleRecord.id == block.vehicle_record_id).first()
    if record and record.status == "blocked":
        unresolved = (
            db.query(BlockRecord)
            .filter(
                BlockRecord.vehicle_record_id == block.vehicle_record_id,
                BlockRecord.resolved == False,
            )
            .count()
        )
        if unresolved == 0:
            if record.wash_complete_time and record.inspection_time:
                record.status = "inspected"
            elif record.wash_complete_time:
                record.status = "washed"
            elif record.load_complete_time:
                record.status = "loaded"
            else:
                record.status = "entered"
        db.flush()
    return block


def get_queue(db: Session) -> List[VehicleQueueItem]:
    records = (
        db.query(VehicleRecord)
        .filter(VehicleRecord.exit_time.is_(None))
        .order_by(VehicleRecord.queue_position.asc(), VehicleRecord.entry_time.asc())
        .all()
    )
    now = datetime.now()
    items = []
    for idx, r in enumerate(records):
        wait_minutes = int((now - r.entry_time).total_seconds() // 60)
        items.append(VehicleQueueItem(
            id=r.id,
            plate_number=r.plate_number,
            driver_name=r.driver_name,
            status=r.status,
            status_text=STATUS_TEXT_MAP.get(r.status, r.status),
            entry_time=r.entry_time,
            queue_position=r.queue_position or (idx + 1),
            load_complete_time=r.load_complete_time,
            wash_complete_time=r.wash_complete_time,
            wait_minutes=wait_minutes,
            is_rewashed=r.is_rewashed,
            block_count=r.block_count,
        ))
    return items


def get_record(db: Session, record_id: int) -> Optional[VehicleRecord]:
    return (
        db.query(VehicleRecord)
        .filter(VehicleRecord.id == record_id)
        .first()
    )


def find_by_plate(db: Session, plate_number: str, date_filter: Optional[date] = None) -> List[VehicleRecord]:
    q = db.query(VehicleRecord).filter(VehicleRecord.plate_number == plate_number.strip().upper())
    if date_filter:
        start = datetime.combine(date_filter, datetime.min.time())
        end = datetime.combine(date_filter, datetime.max.time())
        q = q.filter(or_(
            VehicleRecord.entry_time.between(start, end),
            VehicleRecord.exit_time.between(start, end),
        ))
    return q.order_by(VehicleRecord.entry_time.desc()).all()


def list_records(
    db: Session,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    plate_number: Optional[str] = None,
    construction_site: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[int, List[VehicleRecord]]:
    q = db.query(VehicleRecord)
    if status:
        q = q.filter(VehicleRecord.status == status)
    if plate_number:
        q = q.filter(VehicleRecord.plate_number.contains(plate_number.strip().upper()))
    if construction_site:
        q = q.filter(VehicleRecord.construction_site.contains(construction_site))
    if start_date:
        start = datetime.combine(start_date, datetime.min.time())
        q = q.filter(VehicleRecord.entry_time >= start)
    if end_date:
        end = datetime.combine(end_date, datetime.max.time())
        q = q.filter(VehicleRecord.entry_time <= end)

    total = q.count()
    offset = (max(1, page) - 1) * max(1, page_size)
    items = (
        q.order_by(VehicleRecord.entry_time.desc())
        .offset(offset)
        .limit(max(1, page_size))
        .all()
    )
    return total, items


def get_shift_flow(db: Session, shift_date: Optional[date] = None, shift: str = "all") -> dict:
    target_date = shift_date or date.today()
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    if shift == "day":
        start = day_start.replace(hour=8)
        end = day_start.replace(hour=20)
    elif shift == "night":
        start = day_start.replace(hour=20)
        end = day_end.replace(hour=8) + timedelta(days=1)
    else:
        start = day_start
        end = day_end

    records = (
        db.query(VehicleRecord)
        .filter(or_(
            VehicleRecord.entry_time.between(start, end),
            VehicleRecord.exit_time.between(start, end),
        ))
        .order_by(VehicleRecord.entry_time.asc())
        .all()
    )

    block_records = (
        db.query(BlockRecord)
        .filter(BlockRecord.block_time.between(start, end))
        .order_by(BlockRecord.block_time.asc())
        .all()
    )

    entered_count = sum(1 for r in records if start <= r.entry_time <= end)
    exited_count = sum(1 for r in records if r.exit_time and start <= r.exit_time <= end)
    rewash_count = sum(1 for r in records if r.is_rewashed and start <= r.entry_time <= end)
    blocked_count = len(block_records)
    env_issue_count = sum(1 for b in block_records if b.is_environmental_issue)

    return {
        "shift_date": target_date.isoformat(),
        "shift": shift,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "summary": {
            "entered": entered_count,
            "exited": exited_count,
            "rewashed": rewash_count,
            "blocked": blocked_count,
            "environmental_issues": env_issue_count,
            "on_site": entered_count - exited_count,
        },
        "records": records,
        "block_records": block_records,
    }


def get_safety_export(db: Session, target_date: Optional[date] = None) -> dict:
    target_date = target_date or date.today()
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    exited_records = (
        db.query(VehicleRecord)
        .filter(VehicleRecord.exit_time.between(day_start, day_end))
        .order_by(VehicleRecord.exit_time.asc())
        .all()
    )

    block_records = (
        db.query(BlockRecord)
        .filter(BlockRecord.block_time.between(day_start, day_end))
        .order_by(BlockRecord.block_time.asc())
        .all()
    )

    rewash_records = (
        db.query(VehicleRecord)
        .filter(
            VehicleRecord.is_rewashed == True,
            or_(
                VehicleRecord.entry_time.between(day_start, day_end),
                VehicleRecord.exit_time.between(day_start, day_end),
            )
        )
        .order_by(VehicleRecord.entry_time.asc())
        .all()
    )

    env_issues = [b for b in block_records if b.is_environmental_issue]

    return {
        "date": target_date.isoformat(),
        "exited_records": exited_records,
        "block_records": block_records,
        "rewash_records": rewash_records,
        "environmental_issues": env_issues,
        "counts": {
            "exited": len(exited_records),
            "blocked": len(block_records),
            "rewashed": len(rewash_records),
            "environmental_issues": len(env_issues),
        }
    }


def save_photo(
    db: Session,
    record_id: int,
    photo_type: str,
    file_path: str,
    file_name: str,
    file_size: int,
    uploaded_by: Optional[str] = None,
    remark: Optional[str] = None,
) -> VehiclePhoto:
    photo = VehiclePhoto(
        vehicle_record_id=record_id,
        photo_type=photo_type,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        uploaded_by=uploaded_by,
        remark=remark,
    )
    db.add(photo)
    db.flush()
    return photo


def get_photos(db: Session, record_id: int, photo_type: Optional[str] = None) -> List[VehiclePhoto]:
    q = db.query(VehiclePhoto).filter(VehiclePhoto.vehicle_record_id == record_id)
    if photo_type:
        q = q.filter(VehiclePhoto.photo_type == photo_type)
    return q.order_by(VehiclePhoto.upload_time.asc()).all()
