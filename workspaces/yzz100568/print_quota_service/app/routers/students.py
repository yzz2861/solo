from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/students", tags=["学生账户"])


@router.post("", response_model=schemas.StudentBalance, summary="创建/注册学生账户")
def create_student(data: schemas.StudentCreate, db: Session = Depends(get_db)):
    student = crud.get_or_create_student(db, data.student_id, data.name, data.initial_cash)
    return student


@router.get("", response_model=List[schemas.StudentBalance], summary="获取学生列表")
def list_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_students(db, skip=skip, limit=limit)


@router.get("/{student_id}", response_model=schemas.StudentDetail, summary="查询学生余额与概览")
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"学生 {student_id} 不存在")
    txs = crud.get_student_transactions(db, student_id, limit=20)
    return {
        "student_id": student.student_id,
        "name": student.name,
        "cash_balance": student.cash_balance,
        "subsidy_balance": student.subsidy_balance,
        "total_deducted": student.total_deducted,
        "total_refunded": student.total_refunded,
        "total_subsidy_granted": student.total_subsidy_granted,
        "total_subsidy_used": student.total_subsidy_used,
        "recent_transactions": txs,
    }


@router.get("/{student_id}/transactions", response_model=List[schemas.TransactionOut], summary="查询学生交易流水")
def get_transactions(
    student_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    student = crud.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"学生 {student_id} 不存在")
    return crud.get_student_transactions(db, student_id, skip=skip, limit=limit)


@router.post("/{student_id}/recharge", response_model=schemas.StudentBalance, summary="为学生充值现金余额")
def recharge(
    student_id: str,
    amount: float = Query(..., gt=0, description="充值金额"),
    operator_id: str = Query(..., description="操作人ID"),
    operator_name: str = Query(..., description="操作人姓名"),
    db: Session = Depends(get_db),
):
    student, err = crud.recharge_cash(db, student_id, amount, operator_id, operator_name)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return student
