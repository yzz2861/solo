from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/subsidies", tags=["课程补贴"])


@router.post("", response_model=schemas.SubsidyOut, summary="发放课程补贴（不可提现）")
def grant_subsidy(data: schemas.SubsidyCreate, db: Session = Depends(get_db)):
    subsidy, err = crud.grant_subsidy(db, data)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return subsidy


@router.get("", response_model=List[schemas.SubsidyOut], summary="获取补贴列表")
def list_subsidies(
    student_id: Optional[str] = Query(None, description="按学生过滤"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    if student_id:
        return crud.list_student_subsidies(db, student_id)
    return crud.list_subsidies(db, skip=skip, limit=limit)


@router.get("/{subsidy_id}", response_model=schemas.SubsidyOut, summary="查询单条补贴详情")
def get_subsidy(subsidy_id: int, db: Session = Depends(get_db)):
    subsidy = crud.get_subsidy(db, subsidy_id)
    if not subsidy:
        raise HTTPException(status_code=404, detail="补贴不存在")
    return subsidy


@router.get("/{subsidy_id}/usages", response_model=List[schemas.SubsidyUsageOut], summary="查询补贴消费明细")
def list_subsidy_usages(subsidy_id: int, db: Session = Depends(get_db)):
    subsidy = crud.get_subsidy(db, subsidy_id)
    if not subsidy:
        raise HTTPException(status_code=404, detail="补贴不存在")
    return crud.list_subsidy_usages(db, subsidy_id)
