from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/refunds", tags=["异常退款与审批"])


@router.post("/apply", response_model=schemas.RefundOut, summary="申请异常退款（机房老师发起）")
def apply_refund(data: schemas.RefundApply, db: Session = Depends(get_db)):
    refund, err = crud.apply_refund(db, data)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return refund


@router.post("/approve", response_model=schemas.RefundOut, summary="审批退款（审批老师）")
def approve_refund(data: schemas.RefundApprove, db: Session = Depends(get_db)):
    refund, err = crud.approve_refund(db, data)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return refund


@router.get("/pending", response_model=List[schemas.RefundOut], summary="获取待审批退款列表")
def list_pending_refunds(db: Session = Depends(get_db)):
    return crud.list_pending_refunds(db)


@router.get("", response_model=List[schemas.RefundOut], summary="获取全部退款记录")
def list_refunds(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return crud.list_refunds(db, skip=skip, limit=limit)


@router.get("/{refund_id}", response_model=schemas.RefundOut, summary="查询单条退款记录")
def get_refund(refund_id: int, db: Session = Depends(get_db)):
    refund = crud.get_refund(db, refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="退款申请不存在")
    return refund
