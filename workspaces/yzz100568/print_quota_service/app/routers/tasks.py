from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud

router = APIRouter(prefix="/tasks", tags=["打印任务与扣费"])


@router.post("", response_model=schemas.PrintTaskOut, summary="创建打印任务（幂等扣费）")
def create_task(data: schemas.PrintTaskCreate, db: Session = Depends(get_db)):
    task, err, warnings = crud.create_print_task(db, data)
    if err:
        detail = {"message": err}
        if warnings:
            detail["warnings"] = [w.model_dump() for w in warnings]
        raise HTTPException(status_code=400, detail=detail)
    if warnings:
        from fastapi.responses import JSONResponse
        content = schemas.PrintTaskOut.model_validate(task).model_dump(mode="json")
        content["warnings"] = [w.model_dump() for w in warnings]
        return JSONResponse(status_code=201, content=content)
    return task


@router.get("/{task_id}", response_model=schemas.PrintTaskOut, summary="查询单个打印任务")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.get("", response_model=List[schemas.PrintTaskOut], summary="查询学生打印任务列表")
def list_tasks(
    student_id: Optional[str] = Query(None, description="按学生过滤"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    if student_id:
        return crud.get_tasks_by_student(db, student_id, skip=skip, limit=limit)
    from ..models import PrintTask
    return db.query(PrintTask).order_by(PrintTask.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/{task_id}/exception", response_model=schemas.PrintTaskOut, summary="上报任务异常并锁定")
def report_exception(task_id: int, data: schemas.TaskExceptionReport, db: Session = Depends(get_db)):
    task, err = crud.report_task_exception(db, task_id, data.exception_reason)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return task


@router.get("/exception/list", response_model=List[schemas.PrintTaskOut], summary="获取所有异常任务")
def list_exceptions(db: Session = Depends(get_db)):
    return crud.list_exception_tasks(db)


@router.get("/locked/list", response_model=List[schemas.PrintTaskOut], summary="获取所有锁定任务")
def list_locked(db: Session = Depends(get_db)):
    return crud.list_locked_tasks(db)
