from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional, Tuple
from models import ConstructionApplication, SkylightPlan, TemporaryBlock, ConflictRecord
from schemas import ConflictQueryParams


def _time_overlap(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> Optional[Tuple[datetime, datetime]]:
    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)
    if overlap_start < overlap_end:
        return (overlap_start, overlap_end)
    return None


def _km_overlap(km1_start: float, km1_end: float, km2_start: float, km2_end: float) -> Optional[Tuple[float, float]]:
    s1, e1 = min(km1_start, km1_end), max(km1_start, km1_end)
    s2, e2 = min(km2_start, km2_end), max(km2_start, km2_end)
    overlap_start = max(s1, s2)
    overlap_end = min(e1, e2)
    if overlap_start < overlap_end:
        return (overlap_start, overlap_end)
    return None


def _build_conflict_record(
    conflict_type: str,
    line_name: str,
    section: str,
    start_km: float,
    end_km: float,
    item_a_type: str,
    item_a_id: int,
    item_a_no: str,
    item_a_start: datetime,
    item_a_end: datetime,
    item_a_person: str,
    item_b_type: str,
    item_b_id: int,
    item_b_no: str,
    item_b_start: datetime,
    item_b_end: datetime,
    item_b_person: str,
    overlap_start: datetime,
    overlap_end: datetime,
    overlap_km_start: float,
    overlap_km_end: float,
    severity: str = "中等",
) -> ConflictRecord:
    return ConflictRecord(
        conflict_type=conflict_type,
        line_name=line_name,
        section=section,
        start_km=min(start_km, end_km),
        end_km=max(start_km, end_km),
        item_a_type=item_a_type,
        item_a_id=item_a_id,
        item_a_no=item_a_no,
        item_a_start=item_a_start,
        item_a_end=item_a_end,
        item_a_person=item_a_person,
        item_b_type=item_b_type,
        item_b_id=item_b_id,
        item_b_no=item_b_no,
        item_b_start=item_b_start,
        item_b_end=item_b_end,
        item_b_person=item_b_person,
        overlap_start=overlap_start,
        overlap_end=overlap_end,
        overlap_km_start=overlap_km_start,
        overlap_km_end=overlap_km_end,
        severity=severity,
        status="待处理",
        detected_at=datetime.now(),
    )


def run_conflict_detection(db: Session, params: Optional[ConflictQueryParams] = None) -> int:
    db.query(ConflictRecord).delete()
    db.commit()

    applications = db.query(ConstructionApplication).all()
    plans = db.query(SkylightPlan).all()
    blocks = db.query(TemporaryBlock).all()

    all_items = []
    for app in applications:
        all_items.append(("申请", app.id, app.application_no, app.line_name, app.section,
                          app.start_km, app.end_km, app.start_time, app.end_time, app.responsible_person))
    for plan in plans:
        all_items.append(("计划", plan.id, plan.plan_no, plan.line_name, plan.section,
                          plan.start_km, plan.end_km, plan.start_time, plan.end_time, plan.responsible_person))
    for block in blocks:
        all_items.append(("封锁", block.id, block.block_no, block.line_name, block.section,
                          block.start_km, block.end_km, block.start_time, block.end_time, block.responsible_person))

    conflict_count = 0

    for i in range(len(all_items)):
        for j in range(i + 1, len(all_items)):
            item_a = all_items[i]
            item_b = all_items[j]

            type_a, id_a, no_a, line_a, sec_a, km_s_a, km_e_a, t_s_a, t_e_a, person_a = item_a
            type_b, id_b, no_b, line_b, sec_b, km_s_b, km_e_b, t_s_b, t_e_b, person_b = item_b

            if line_a != line_b:
                continue

            if params and params.start_date and params.end_date:
                if t_e_a < params.start_date or t_s_a > params.end_date:
                    continue
                if t_e_b < params.start_date or t_s_b > params.end_date:
                    continue

            time_overlap = _time_overlap(t_s_a, t_e_a, t_s_b, t_e_b)
            if not time_overlap:
                continue

            km_overlap = _km_overlap(km_s_a, km_e_a, km_s_b, km_e_b)
            if not km_overlap:
                continue

            conflict_type = f"{type_a}与{type_b}冲突"

            duration_hours = (time_overlap[1] - time_overlap[0]).total_seconds() / 3600
            km_length = km_overlap[1] - km_overlap[0]
            if duration_hours > 4 and km_length > 5:
                severity = "严重"
            elif duration_hours > 2 or km_length > 2:
                severity = "中等"
            else:
                severity = "轻微"

            conflict = _build_conflict_record(
                conflict_type=conflict_type,
                line_name=line_a,
                section=f"{sec_a} / {sec_b}",
                start_km=min(km_s_a, km_s_b),
                end_km=max(km_e_a, km_e_b),
                item_a_type=type_a,
                item_a_id=id_a,
                item_a_no=no_a,
                item_a_start=t_s_a,
                item_a_end=t_e_a,
                item_a_person=person_a,
                item_b_type=type_b,
                item_b_id=id_b,
                item_b_no=no_b,
                item_b_start=t_s_b,
                item_b_end=t_e_b,
                item_b_person=person_b,
                overlap_start=time_overlap[0],
                overlap_end=time_overlap[1],
                overlap_km_start=km_overlap[0],
                overlap_km_end=km_overlap[1],
                severity=severity,
            )
            db.add(conflict)
            conflict_count += 1

    db.commit()

    _detect_person_conflicts(db, applications, plans, blocks)

    return conflict_count


def _detect_person_conflicts(db: Session, applications: List, plans: List, blocks: List) -> int:
    conflict_count = 0

    grouped = {}

    for app in applications:
        key = (app.line_name, _round_km(app.start_km), _round_km(app.end_km))
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(("申请", app.id, app.application_no, app.start_time, app.end_time, app.responsible_person))

    for plan in plans:
        key = (plan.line_name, _round_km(plan.start_km), _round_km(plan.end_km))
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(("计划", plan.id, plan.plan_no, plan.start_time, plan.end_time, plan.responsible_person))

    for block in blocks:
        key = (block.line_name, _round_km(block.start_km), _round_km(block.end_km))
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(("封锁", block.id, block.block_no, block.start_time, block.end_time, block.responsible_person))

    for key, items in grouped.items():
        line_name, km_s, km_e = key
        if len(items) < 2:
            continue

        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                type_a, id_a, no_a, t_s_a, t_e_a, person_a = items[i]
                type_b, id_b, no_b, t_s_b, t_e_b, person_b = items[j]

                if person_a == person_b:
                    continue

                time_overlap = _time_overlap(t_s_a, t_e_a, t_s_b, t_e_b)
                if not time_overlap:
                    continue

                conflict = ConflictRecord(
                    conflict_type="负责人不一致",
                    line_name=line_name,
                    section=f"{km_s}-{km_e} km",
                    start_km=km_s,
                    end_km=km_e,
                    item_a_type=type_a,
                    item_a_id=id_a,
                    item_a_no=no_a,
                    item_a_start=t_s_a,
                    item_a_end=t_e_a,
                    item_a_person=person_a,
                    item_b_type=type_b,
                    item_b_id=id_b,
                    item_b_no=no_b,
                    item_b_start=t_s_b,
                    item_b_end=t_e_b,
                    item_b_person=person_b,
                    overlap_start=time_overlap[0],
                    overlap_end=time_overlap[1],
                    overlap_km_start=km_s,
                    overlap_km_end=km_e,
                    severity="中等",
                    status="待处理",
                    detected_at=datetime.now(),
                )
                db.add(conflict)
                conflict_count += 1

    db.commit()
    return conflict_count


def _round_km(km: float) -> float:
    return round(km / 1.0) * 1.0


def get_conflicts(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    params: Optional[ConflictQueryParams] = None,
) -> List[ConflictRecord]:
    query = db.query(ConflictRecord)
    if params:
        if params.line_name:
            query = query.filter(ConflictRecord.line_name == params.line_name)
        if params.conflict_type:
            query = query.filter(ConflictRecord.conflict_type.like(f"%{params.conflict_type}%"))
        if params.severity:
            query = query.filter(ConflictRecord.severity == params.severity)
        if params.status:
            query = query.filter(ConflictRecord.status == params.status)
        if params.start_date:
            query = query.filter(ConflictRecord.overlap_start >= params.start_date)
        if params.end_date:
            query = query.filter(ConflictRecord.overlap_end <= params.end_date)
    return query.order_by(ConflictRecord.severity.desc(), ConflictRecord.overlap_start.desc()).offset(skip).limit(limit).all()


def get_conflict(db: Session, conflict_id: int) -> Optional[ConflictRecord]:
    return db.query(ConflictRecord).filter(ConflictRecord.id == conflict_id).first()


def handle_conflict(db: Session, conflict_id: int, status: str, handle_opinion: Optional[str] = None) -> Optional[ConflictRecord]:
    conflict = get_conflict(db, conflict_id)
    if not conflict:
        return None
    conflict.status = status
    if handle_opinion:
        conflict.handle_opinion = handle_opinion
    conflict.handled_at = datetime.now()
    db.commit()
    db.refresh(conflict)
    return conflict


def get_conflict_statistics(db: Session) -> dict:
    total = db.query(ConflictRecord).count()
    pending = db.query(ConflictRecord).filter(ConflictRecord.status == "待处理").count()
    resolved = db.query(ConflictRecord).filter(ConflictRecord.status == "已处理").count()

    by_type = db.query(ConflictRecord.conflict_type, func.count(ConflictRecord.id)).group_by(ConflictRecord.conflict_type).all()
    by_severity = db.query(ConflictRecord.severity, func.count(ConflictRecord.id)).group_by(ConflictRecord.severity).all()
    by_line = db.query(ConflictRecord.line_name, func.count(ConflictRecord.id)).group_by(ConflictRecord.line_name).all()

    return {
        "total": total,
        "pending": pending,
        "resolved": resolved,
        "by_type": [{"type": t, "count": c} for t, c in by_type],
        "by_severity": [{"severity": s, "count": c} for s, c in by_severity],
        "by_line": [{"line": l, "count": c} for l, c in by_line],
    }
