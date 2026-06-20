from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import (
    get_current_active_user,
    require_auditor,
    require_admin,
    require_all_roles,
)
from ..models import User, AuditLog, User
from ..schemas import (
    QuarterlyReport,
    CabinetUtilizationReport,
    AuditLogResponse,
)
from ..services.report import (
    generate_quarterly_report,
    export_quarterly_report_to_excel,
    get_cabinet_utilization,
)

router = APIRouter(prefix="/api/reports", tags=["报告和审计"])


@router.get("/cabinet-utilization", response_model=List[CabinetUtilizationReport])
async def get_cabinet_utilization_report(
    cabinet_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    return get_cabinet_utilization(db, cabinet_id)


@router.get("/quarterly", response_model=QuarterlyReport)
async def get_quarterly_report(
    quarter: Optional[str] = Query(None, description="季度格式: YYYYQN, 如 2026Q2"),
    db: Session = Depends(get_db),
    current_user: User = require_auditor
):
    try:
        return generate_quarterly_report(db, quarter)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/quarterly/export")
async def export_quarterly_report(
    quarter: Optional[str] = Query(None, description="季度格式: YYYYQN, 如 2026Q2"),
    db: Session = Depends(get_db),
    current_user: User = require_auditor
):
    try:
        excel_file = export_quarterly_report_to_excel(db, quarter)
        quarter_str = quarter or f"{datetime.utcnow().year}Q{(datetime.utcnow().month - 1) // 3 + 1}"
        filename = f"机房季度报告_{quarter_str}.xlsx"

        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    rack_request_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    abnormal_only: bool = False,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = require_auditor
):
    query = db.query(AuditLog)

    if rack_request_id:
        query = query.filter(AuditLog.rack_request_id == rack_request_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if abnormal_only:
        query = query.filter(AuditLog.is_abnormal_release == True)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append(AuditLogResponse(
            id=log.id,
            rack_request_id=log.rack_request_id,
            user_id=log.user_id,
            user_name=user.full_name if user else None,
            action=log.action,
            old_value=log.old_value,
            new_value=log.new_value,
            remark=log.remark,
            created_at=log.created_at,
            is_abnormal_release=log.is_abnormal_release
        ))

    return result


@router.get("/rack-requests/{request_id}/audit-logs", response_model=List[AuditLogResponse])
async def get_request_audit_logs(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = require_all_roles
):
    logs = db.query(AuditLog).filter(
        AuditLog.rack_request_id == request_id
    ).order_by(AuditLog.created_at).all()

    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append(AuditLogResponse(
            id=log.id,
            rack_request_id=log.rack_request_id,
            user_id=log.user_id,
            user_name=user.full_name if user else None,
            action=log.action,
            old_value=log.old_value,
            new_value=log.new_value,
            remark=log.remark,
            created_at=log.created_at,
            is_abnormal_release=log.is_abnormal_release
        ))

    return result


@router.get("/abnormal-releases", response_model=List[AuditLogResponse])
async def list_abnormal_releases(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = require_auditor
):
    query = db.query(AuditLog).filter(AuditLog.is_abnormal_release == True)

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.order_by(AuditLog.created_at.desc()).all()

    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append(AuditLogResponse(
            id=log.id,
            rack_request_id=log.rack_request_id,
            user_id=log.user_id,
            user_name=user.full_name if user else None,
            action=log.action,
            old_value=log.old_value,
            new_value=log.new_value,
            remark=log.remark,
            created_at=log.created_at,
            is_abnormal_release=log.is_abnormal_release
        ))

    return result
