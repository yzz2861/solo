from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..auth import (
    get_current_active_user,
    require_operation,
    require_duty,
    require_auditor,
    require_operation_or_duty,
    require_admin,
)
from ..models import User, RackRequest, RackRequestStatus, DeviceModel
from ..schemas import (
    RackRequestCreate,
    RackRequestUpdate,
    RackRequestResponse,
    RackRequestSubmit,
    RackRequestApprove,
    RackRequestReject,
    RackRequestStartConstruction,
    RackRequestComplete,
    RackRequestDecommission,
    ResourceCheckRequest,
    ResourceCheckResponse,
)
from ..services.rack_request import (
    create_rack_request,
    update_rack_request,
    submit_rack_request,
    approve_rack_request,
    reject_rack_request,
    start_construction,
    complete_construction,
    build_request_response,
)
from ..services.audit import decommission_rack_request
from ..services.validation import check_resources

router = APIRouter(prefix="/api/rack-requests", tags=["上架申请"])


@router.post("", response_model=RackRequestResponse)
async def create_request(
    request_data: RackRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    try:
        request, validation_errors = create_rack_request(
            db=db,
            request_data=request_data,
            created_by=current_user.id
        )
        db.commit()
        db.refresh(request)
        return build_request_response(db, request, validation_errors)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[RackRequestResponse])
async def list_requests(
    status: Optional[RackRequestStatus] = None,
    cabinet_id: Optional[int] = None,
    created_by: Optional[int] = None,
    construction_date: Optional[datetime] = None,
    my_requests_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(RackRequest)

    if status:
        query = query.filter(RackRequest.status == status)
    if cabinet_id:
        query = query.filter(RackRequest.cabinet_id == cabinet_id)
    if created_by:
        query = query.filter(RackRequest.created_by == created_by)
    if my_requests_only:
        query = query.filter(RackRequest.created_by == current_user.id)
    if construction_date:
        date_only = construction_date.date()
        query = query.filter(func.date(RackRequest.construction_date) == date_only)

    requests = query.order_by(RackRequest.created_at.desc()).all()
    return [build_request_response(db, req) for req in requests]


@router.get("/pending-approval", response_model=List[RackRequestResponse])
async def list_pending_approval(
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    requests = db.query(RackRequest).filter(
        RackRequest.status == RackRequestStatus.PENDING
    ).order_by(RackRequest.created_at).all()
    return [build_request_response(db, req) for req in requests]


@router.get("/today-construction", response_model=List[RackRequestResponse])
async def list_today_construction(
    db: Session = Depends(get_db),
    current_user: User = require_duty
):
    today = datetime.utcnow().date()
    requests = db.query(RackRequest).filter(
        RackRequest.status == RackRequestStatus.APPROVED,
        func.date(RackRequest.construction_date) == today
    ).order_by(RackRequest.construction_date).all()
    return [build_request_response(db, req) for req in requests]


@router.get("/construction-orders", response_model=List[RackRequestResponse])
async def list_construction_orders(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = require_duty
):
    query = db.query(RackRequest).filter(
        RackRequest.status.in_([
            RackRequestStatus.APPROVED,
            RackRequestStatus.IN_PROGRESS,
            RackRequestStatus.COMPLETED,
        ])
    )
    if start_date:
        query = query.filter(RackRequest.construction_date >= start_date)
    if end_date:
        query = query.filter(RackRequest.construction_date <= end_date)

    requests = query.order_by(RackRequest.construction_date.desc()).all()
    return [build_request_response(db, req) for req in requests]


@router.get("/{request_id}", response_model=RackRequestResponse)
async def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    request = db.query(RackRequest).filter(RackRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="上架申请单不存在")
    return build_request_response(db, request)


@router.put("/{request_id}", response_model=RackRequestResponse)
async def update_request(
    request_id: int,
    update_data: RackRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    try:
        request, validation_errors = update_rack_request(
            db=db,
            request_id=request_id,
            update_data=update_data,
            user_id=current_user.id
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request, validation_errors)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/submit", response_model=RackRequestResponse)
async def submit_request(
    request_id: int,
    submit_data: RackRequestSubmit,
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    try:
        request, validation_errors = submit_rack_request(
            db=db,
            request_id=request_id,
            user_id=current_user.id
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        if validation_errors:
            return build_request_response(db, request, validation_errors)
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/approve", response_model=RackRequestResponse)
async def approve_request(
    request_id: int,
    approve_data: RackRequestApprove,
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    try:
        request = approve_rack_request(
            db=db,
            request_id=request_id,
            user_id=current_user.id
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/reject", response_model=RackRequestResponse)
async def reject_request(
    request_id: int,
    reject_data: RackRequestReject,
    db: Session = Depends(get_db),
    current_user: User = require_operation
):
    try:
        request = reject_rack_request(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            reject_reason=reject_data.reject_reason
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/start-construction", response_model=RackRequestResponse)
async def start_construction_request(
    request_id: int,
    data: RackRequestStartConstruction,
    db: Session = Depends(get_db),
    current_user: User = require_duty
):
    try:
        request = start_construction(
            db=db,
            request_id=request_id,
            user_id=current_user.id
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/complete", response_model=RackRequestResponse)
async def complete_construction_request(
    request_id: int,
    complete_data: RackRequestComplete,
    db: Session = Depends(get_db),
    current_user: User = require_duty
):
    try:
        request = complete_construction(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            actual_u_start=complete_data.actual_u_start,
            actual_pdu_port_ids=complete_data.actual_pdu_port_ids,
            actual_switch_port_ids=complete_data.actual_switch_port_ids,
            completion_remark=complete_data.completion_remark
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/decommission", response_model=RackRequestResponse)
async def decommission_request(
    request_id: int,
    decommission_data: RackRequestDecommission,
    db: Session = Depends(get_db),
    current_user: User = require_operation_or_duty
):
    try:
        request = decommission_rack_request(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            decommission_remark=decommission_data.decommission_remark,
            release_pdu_remark=decommission_data.release_pdu_remark,
            release_switch_remark=decommission_data.release_switch_remark
        )
        if not request:
            raise HTTPException(status_code=404, detail="上架申请单不存在")
        db.commit()
        db.refresh(request)
        return build_request_response(db, request)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/check-resources", response_model=ResourceCheckResponse)
async def check_resource_availability(
    check_data: ResourceCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return check_resources(
        db=db,
        cabinet_id=check_data.cabinet_id,
        u_start=check_data.u_start,
        u_height=check_data.u_height,
        power_watts=check_data.power_watts,
        pdu_port_id=check_data.pdu_port_id,
        switch_port_id=check_data.switch_port_id,
        exclude_request_id=check_data.exclude_request_id
    )
