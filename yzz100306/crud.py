from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import hashlib
import json
import csv
import io
from typing import List, Optional

import models
import schemas


def _compute_hash(data_str: str) -> str:
    return hashlib.sha256(data_str.encode("utf-8")).hexdigest()


def check_duplicate_batch(db: Session, import_type: models.ImportType, batch_hash: str) -> Optional[models.ImportBatch]:
    return db.query(models.ImportBatch).filter(
        models.ImportBatch.import_type == import_type,
        models.ImportBatch.batch_hash == batch_hash
    ).first()


def create_batch(db: Session, import_type: models.ImportType, batch_hash: str,
                 file_name: str, record_count: int) -> models.ImportBatch:
    batch = models.ImportBatch(
        import_type=import_type,
        batch_hash=batch_hash,
        file_name=file_name,
        record_count=record_count
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def import_components_from_csv(db: Session, csv_content: str, file_name: str) -> dict:
    batch_hash = _compute_hash(csv_content)

    existing = check_duplicate_batch(db, models.ImportType.COMPONENTS, batch_hash)
    if existing:
        return {
            "success": True,
            "message": "重复导入，已跳过",
            "total_count": existing.record_count,
            "new_count": 0,
            "skipped_count": existing.record_count,
            "batch_hash": batch_hash
        }

    reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(reader)
    total = len(rows)
    new_count = 0
    skipped = 0

    for row in rows:
        component_code = row.get("component_code", "").strip()
        if not component_code:
            skipped += 1
            continue

        existing_comp = db.query(models.Component).filter(
            models.Component.component_code == component_code
        ).first()

        if existing_comp:
            skipped += 1
            continue

        comp = models.Component(
            component_code=component_code,
            model=row.get("model", ""),
            capacity=float(row.get("capacity", 0) or 0),
            location=row.get("location", ""),
            install_date=row.get("install_date", ""),
            manufacturer=row.get("manufacturer", ""),
            string_code=row.get("string_code", ""),
            array_code=row.get("array_code", ""),
            remark=row.get("remark", "")
        )
        db.add(comp)
        new_count += 1

    db.commit()
    create_batch(db, models.ImportType.COMPONENTS, batch_hash, file_name, total)

    return {
        "success": True,
        "message": "导入完成",
        "total_count": total,
        "new_count": new_count,
        "skipped_count": skipped,
        "batch_hash": batch_hash
    }


def import_defects_from_json(db: Session, json_content: str, file_name: str) -> dict:
    batch_hash = _compute_hash(json_content)

    existing = check_duplicate_batch(db, models.ImportType.DEFECTS, batch_hash)
    if existing:
        return {
            "success": True,
            "message": "重复导入，已跳过",
            "total_count": existing.record_count,
            "new_count": 0,
            "skipped_count": existing.record_count,
            "updated_count": 0,
            "batch_hash": batch_hash
        }

    try:
        data = json.loads(json_content)
    except json.JSONDecodeError:
        return {
            "success": False,
            "message": "JSON格式错误",
            "total_count": 0,
            "new_count": 0,
            "skipped_count": 0,
            "updated_count": 0,
            "batch_hash": batch_hash
        }

    items = data if isinstance(data, list) else data.get("defects", data.get("items", []))
    total = len(items)
    new_count = 0
    skipped = 0
    updated_count = 0

    batch = create_batch(db, models.ImportType.DEFECTS, batch_hash, file_name, total)

    for item in items:
        defect_code = item.get("defect_code", "").strip()
        component_code = item.get("component_code", "").strip()

        if not defect_code or not component_code:
            skipped += 1
            continue

        severity_str = item.get("severity", "minor")
        try:
            severity = models.DefectSeverity(severity_str.lower())
        except ValueError:
            severity = models.DefectSeverity.MINOR

        existing_defect = db.query(models.Defect).filter(
            models.Defect.defect_code == defect_code
        ).first()

        if existing_defect:
            if severity != existing_defect.severity:
                try:
                    history = json.loads(existing_defect.severity_history or "[]")
                except (json.JSONDecodeError, TypeError):
                    history = []
                history.append({
                    "severity": severity.value,
                    "time": datetime.utcnow().isoformat(),
                    "source": "import"
                })
                existing_defect.severity_history = json.dumps(history)
                existing_defect.severity = severity
                updated_count += 1
            else:
                skipped += 1
            continue

        comp = db.query(models.Component).filter(
            models.Component.component_code == component_code
        ).first()
        if not comp:
            comp = models.Component(component_code=component_code)
            db.add(comp)
            db.flush()

        source_str = item.get("source", "drone")
        try:
            source = models.DefectSource(source_str.lower())
        except ValueError:
            source = models.DefectSource.DRONE

        discovery_time_str = item.get("discovery_time", item.get("detect_time", ""))
        try:
            discovery_time = datetime.fromisoformat(discovery_time_str.replace("Z", "")) if discovery_time_str else datetime.utcnow()
        except (ValueError, TypeError):
            discovery_time = datetime.utcnow()

        defect = models.Defect(
            defect_code=defect_code,
            component_code=component_code,
            defect_type=item.get("defect_type", item.get("type", "")),
            severity=severity,
            source=source,
            status=models.DefectStatus.DISCOVERED,
            discovery_time=discovery_time,
            discovery_image=item.get("discovery_image", item.get("image", "")),
            position_detail=item.get("position_detail", item.get("position", "")),
            temperature=float(item.get("temperature", 0) or 0),
            description=item.get("description", ""),
            batch_id=batch.id,
            severity_history=json.dumps([{"severity": severity.value, "time": discovery_time.isoformat()}])
        )
        db.add(defect)
        new_count += 1

    db.commit()

    return {
        "success": True,
        "message": "导入完成",
        "total_count": total,
        "new_count": new_count,
        "skipped_count": skipped,
        "updated_count": updated_count,
        "batch_hash": batch_hash
    }


def import_repairs_from_csv(db: Session, csv_content: str, file_name: str) -> dict:
    batch_hash = _compute_hash(csv_content)

    existing = check_duplicate_batch(db, models.ImportType.REPAIRS, batch_hash)
    if existing:
        return {
            "success": True,
            "message": "重复导入，已跳过",
            "total_count": existing.record_count,
            "new_count": 0,
            "skipped_count": existing.record_count,
            "batch_hash": batch_hash
        }

    reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(reader)
    total = len(rows)
    new_count = 0
    skipped = 0

    for row in rows:
        defect_code = row.get("defect_code", "").strip()
        if not defect_code:
            skipped += 1
            continue

        defect = db.query(models.Defect).filter(
            models.Defect.defect_code == defect_code
        ).first()

        if not defect:
            component_code = row.get("component_code", "").strip()
            if component_code:
                comp = db.query(models.Component).filter(
                    models.Component.component_code == component_code
                ).first()
                if not comp:
                    comp = models.Component(component_code=component_code)
                    db.add(comp)
                    db.flush()

                defect = models.Defect(
                    defect_code=defect_code,
                    component_code=component_code,
                    defect_type=row.get("defect_type", ""),
                    status=models.DefectStatus.DISPATCHED
                )
                db.add(defect)
                db.flush()
            else:
                skipped += 1
                continue

        repair_time_str = row.get("repair_time", "")
        try:
            repair_time = datetime.fromisoformat(repair_time_str) if repair_time_str else datetime.utcnow()
        except (ValueError, TypeError):
            repair_time = datetime.utcnow()

        defect.repairer = row.get("repairer", defect.repairer or "")
        defect.repair_time = repair_time
        defect.repair_content = row.get("repair_content", defect.repair_content or "")
        defect.spare_parts = row.get("spare_parts", defect.spare_parts or "")
        defect.spare_parts_cost = float(row.get("spare_parts_cost", defect.spare_parts_cost or 0) or 0)
        defect.status = models.DefectStatus.REPAIRED

        recheck_time_str = row.get("recheck_time", "")
        if recheck_time_str:
            try:
                recheck_time = datetime.fromisoformat(recheck_time_str)
            except (ValueError, TypeError):
                recheck_time = datetime.utcnow()
            defect.recheck_time = recheck_time
            defect.recheck_result = row.get("recheck_result", "")
            defect.recheck_passed = row.get("recheck_passed", "pending")
            defect.recheck_opinion = row.get("recheck_opinion", "")
            defect.rechecker = row.get("rechecker", "")
            defect.status = models.DefectStatus.RECHECKED

            if row.get("recheck_passed", "").lower() in ["yes", "true", "pass", "通过"]:
                defect.status = models.DefectStatus.CLOSED
                defect.close_time = recheck_time
                defect.close_opinion = row.get("recheck_opinion", "")

        if not defect.dispatch_time and defect.repair_time:
            defect.dispatch_time = defect.repair_time

        new_count += 1

    db.commit()
    create_batch(db, models.ImportType.REPAIRS, batch_hash, file_name, total)

    return {
        "success": True,
        "message": "导入完成",
        "total_count": total,
        "new_count": new_count,
        "skipped_count": skipped,
        "batch_hash": batch_hash
    }


def get_component(db: Session, component_code: str) -> Optional[models.Component]:
    return db.query(models.Component).filter(models.Component.component_code == component_code).first()


def get_components(db: Session, skip: int = 0, limit: int = 100) -> List[models.Component]:
    return db.query(models.Component).offset(skip).limit(limit).all()


def get_defects(db: Session, skip: int = 0, limit: int = 100,
                status: Optional[str] = None,
                severity: Optional[str] = None,
                component_code: Optional[str] = None) -> List[models.Defect]:
    query = db.query(models.Defect)
    if status:
        query = query.filter(models.Defect.status == status)
    if severity:
        query = query.filter(models.Defect.severity == severity)
    if component_code:
        query = query.filter(models.Defect.component_code == component_code)
    return query.order_by(models.Defect.discovery_time.desc()).offset(skip).limit(limit).all()


def get_defect(db: Session, defect_code: str) -> Optional[models.Defect]:
    return db.query(models.Defect).filter(models.Defect.defect_code == defect_code).first()


def get_severity_changed_defects(db: Session) -> List[models.Defect]:
    defects = db.query(models.Defect).all()
    result = []
    for defect in defects:
        try:
            history = json.loads(defect.severity_history or "[]")
            if len(history) > 1:
                result.append(defect)
        except (json.JSONDecodeError, TypeError):
            continue
    return result


def get_recheck_failed_defects(db: Session) -> List[models.Defect]:
    return db.query(models.Defect).filter(
        models.Defect.recheck_passed.in_(["no", "failed", "未通过", "不通过"])
    ).all()


def get_abnormal_spare_parts(db: Session, threshold: float = 1000.0) -> List[models.Defect]:
    return db.query(models.Defect).filter(
        models.Defect.spare_parts_cost > threshold
    ).order_by(models.Defect.spare_parts_cost.desc()).all()


def update_defect_review(db: Session, defect_code: str, review_data: schemas.RecheckUpdate) -> Optional[models.Defect]:
    defect = db.query(models.Defect).filter(models.Defect.defect_code == defect_code).first()
    if not defect:
        return None

    defect.recheck_opinion = review_data.recheck_opinion
    if review_data.recheck_result:
        defect.recheck_result = review_data.recheck_result
    if review_data.recheck_passed:
        defect.recheck_passed = review_data.recheck_passed
    if review_data.rechecker:
        defect.rechecker = review_data.rechecker

    if not defect.recheck_time:
        defect.recheck_time = datetime.utcnow()

    passed_lower = review_data.recheck_passed.lower() if review_data.recheck_passed else ""
    if passed_lower in ["yes", "true", "pass", "通过", "passed"]:
        defect.status = models.DefectStatus.CLOSED
        defect.close_time = datetime.utcnow()
        defect.close_opinion = review_data.recheck_opinion
    else:
        defect.status = models.DefectStatus.RECHECKED

    db.commit()
    db.refresh(defect)
    return defect


def get_closed_loop_report(db: Session) -> dict:
    all_defects = db.query(models.Defect).all()
    total = len(all_defects)

    closed = [d for d in all_defects if d.status == models.DefectStatus.CLOSED]
    in_progress = [d for d in all_defects if d.status != models.DefectStatus.CLOSED]

    cycle_days = []
    items = []

    for d in all_defects:
        cycle = None
        if d.close_time and d.discovery_time:
            cycle = (d.close_time - d.discovery_time).total_seconds() / 86400.0
            cycle_days.append(cycle)

        items.append({
            "defect_code": d.defect_code,
            "component_code": d.component_code,
            "defect_type": d.defect_type,
            "severity": d.severity.value if hasattr(d.severity, "value") else str(d.severity),
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "discovery_time": d.discovery_time,
            "repair_time": d.repair_time,
            "recheck_time": d.recheck_time,
            "close_time": d.close_time,
            "recheck_result": d.recheck_result,
            "recheck_opinion": d.recheck_opinion,
            "spare_parts": d.spare_parts,
            "spare_parts_cost": d.spare_parts_cost,
            "cycle_days": round(cycle, 2) if cycle else None
        })

    avg_cycle = sum(cycle_days) / len(cycle_days) if cycle_days else 0.0
    closed_rate = (len(closed) / total * 100) if total > 0 else 0.0

    return {
        "total_defects": total,
        "closed_count": len(closed),
        "in_progress_count": len(in_progress),
        "closed_rate": round(closed_rate, 2),
        "average_cycle_days": round(avg_cycle, 2),
        "items": items
    }


def update_defect(db: Session, defect_code: str, update_data: schemas.DefectUpdate) -> Optional[models.Defect]:
    defect = db.query(models.Defect).filter(models.Defect.defect_code == defect_code).first()
    if not defect:
        return None

    if update_data.severity and update_data.severity != defect.severity:
        try:
            history = json.loads(defect.severity_history or "[]")
        except (json.JSONDecodeError, TypeError):
            history = []
        history.append({
            "severity": update_data.severity.value,
            "time": datetime.utcnow().isoformat()
        })
        defect.severity_history = json.dumps(history)
        defect.severity = update_data.severity

    if update_data.defect_type is not None:
        defect.defect_type = update_data.defect_type
    if update_data.description is not None:
        defect.description = update_data.description
    if update_data.recheck_opinion is not None:
        defect.recheck_opinion = update_data.recheck_opinion
    if update_data.recheck_result is not None:
        defect.recheck_result = update_data.recheck_result
    if update_data.recheck_passed is not None:
        defect.recheck_passed = update_data.recheck_passed

    db.commit()
    db.refresh(defect)
    return defect
