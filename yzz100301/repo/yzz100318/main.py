from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query, Path
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
import io
from urllib.parse import quote

from database import engine, get_db, Base
from models import *
from schemas import *
from services import applications as app_service
from services import plans as plan_service
from services import blocks as block_service
from services import conflicts as conflict_service
from services import reports as report_service

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="铁路检修天窗安排 API 服务",
    description="施工申请、天窗计划、临时封锁单管理与冲突检测系统",
    version="1.0.0"
)


@app.get("/", tags=["系统"])
def root():
    return {
        "service": "铁路检修天窗安排 API 服务",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health", tags=["系统"])
def health_check():
    return {"status": "healthy"}


@app.post("/applications/import", response_model=ImportResult, tags=["施工申请"])
async def import_applications(
    file: UploadFile = File(..., description="施工申请 CSV 文件"),
    batch_no: Optional[str] = Query(None, description="批次号"),
    db: Session = Depends(get_db)
):
    content = await file.read()
    result = app_service.import_applications_from_csv(db, content, file.filename, batch_no)
    return result


@app.get("/applications", response_model=List[ConstructionApplicationOut], tags=["施工申请"])
def list_applications(
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return app_service.get_applications(db, skip, limit, line_name, status, batch_no)


@app.get("/applications/{app_id}", response_model=ConstructionApplicationOut, tags=["施工申请"])
def get_application(app_id: int, db: Session = Depends(get_db)):
    app = app_service.get_application(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="施工申请不存在")
    return app


@app.get("/applications/no/{application_no}", response_model=ConstructionApplicationOut, tags=["施工申请"])
def get_application_by_no(application_no: str, db: Session = Depends(get_db)):
    app = app_service.get_application_by_no(db, application_no)
    if not app:
        raise HTTPException(status_code=404, detail="施工申请不存在")
    return app


@app.post("/applications", response_model=ConstructionApplicationOut, tags=["施工申请"])
def create_application(app: ConstructionApplicationCreate, db: Session = Depends(get_db)):
    existing = app_service.get_application_by_no(db, app.application_no)
    if existing:
        raise HTTPException(status_code=400, detail="申请编号已存在")
    return app_service.create_application(db, app)


@app.put("/applications/{app_id}", response_model=ConstructionApplicationOut, tags=["施工申请"])
def update_application(app_id: int, app_update: ConstructionApplicationUpdate, db: Session = Depends(get_db)):
    app = app_service.update_application(db, app_id, app_update)
    if not app:
        raise HTTPException(status_code=404, detail="施工申请不存在")
    return app


@app.delete("/applications/{app_id}", tags=["施工申请"])
def delete_application(app_id: int, db: Session = Depends(get_db)):
    success = app_service.delete_application(db, app_id)
    if not success:
        raise HTTPException(status_code=404, detail="施工申请不存在")
    return {"message": "删除成功"}


@app.post("/plans/import", response_model=ImportResult, tags=["天窗计划"])
async def import_plans(
    file: UploadFile = File(..., description="天窗计划 JSON 文件"),
    batch_no: Optional[str] = Query(None, description="批次号"),
    db: Session = Depends(get_db)
):
    content = await file.read()
    result = plan_service.import_plans_from_json(db, content, file.filename, batch_no)
    return result


@app.get("/plans", response_model=List[SkylightPlanOut], tags=["天窗计划"])
def list_plans(
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return plan_service.get_plans(db, skip, limit, line_name, status, batch_no, application_id)


@app.get("/plans/{plan_id}", response_model=SkylightPlanOut, tags=["天窗计划"])
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = plan_service.get_plan(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="天窗计划不存在")
    return plan


@app.get("/plans/no/{plan_no}", response_model=SkylightPlanOut, tags=["天窗计划"])
def get_plan_by_no(plan_no: str, db: Session = Depends(get_db)):
    plan = plan_service.get_plan_by_no(db, plan_no)
    if not plan:
        raise HTTPException(status_code=404, detail="天窗计划不存在")
    return plan


@app.post("/plans", response_model=SkylightPlanOut, tags=["天窗计划"])
def create_plan(plan: SkylightPlanCreate, db: Session = Depends(get_db)):
    existing = plan_service.get_plan_by_no(db, plan.plan_no)
    if existing:
        raise HTTPException(status_code=400, detail="计划编号已存在")
    return plan_service.create_plan(db, plan)


@app.put("/plans/{plan_id}", response_model=SkylightPlanOut, tags=["天窗计划"])
def update_plan(plan_id: int, plan_update: SkylightPlanUpdate, db: Session = Depends(get_db)):
    plan = plan_service.update_plan(db, plan_id, plan_update)
    if not plan:
        raise HTTPException(status_code=404, detail="天窗计划不存在")
    return plan


@app.delete("/plans/{plan_id}", tags=["天窗计划"])
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    success = plan_service.delete_plan(db, plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="天窗计划不存在")
    return {"message": "删除成功"}


@app.post("/blocks/import/json", response_model=ImportResult, tags=["临时封锁单"])
async def import_blocks_json(
    file: UploadFile = File(..., description="临时封锁单 JSON 文件"),
    batch_no: Optional[str] = Query(None, description="批次号"),
    db: Session = Depends(get_db)
):
    content = await file.read()
    result = block_service.import_blocks_from_json(db, content, file.filename, batch_no)
    return result


@app.post("/blocks/import/csv", response_model=ImportResult, tags=["临时封锁单"])
async def import_blocks_csv(
    file: UploadFile = File(..., description="临时封锁单 CSV 文件"),
    batch_no: Optional[str] = Query(None, description="批次号"),
    db: Session = Depends(get_db)
):
    content = await file.read()
    result = block_service.import_blocks_from_csv(db, content, file.filename, batch_no)
    return result


@app.get("/blocks", response_model=List[TemporaryBlockOut], tags=["临时封锁单"])
def list_blocks(
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    status: Optional[str] = None,
    batch_no: Optional[str] = None,
    plan_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return block_service.get_blocks(db, skip, limit, line_name, status, batch_no, plan_id)


@app.get("/blocks/{block_id}", response_model=TemporaryBlockOut, tags=["临时封锁单"])
def get_block(block_id: int, db: Session = Depends(get_db)):
    block = block_service.get_block(db, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="临时封锁单不存在")
    return block


@app.get("/blocks/no/{block_no}", response_model=TemporaryBlockOut, tags=["临时封锁单"])
def get_block_by_no(block_no: str, db: Session = Depends(get_db)):
    block = block_service.get_block_by_no(db, block_no)
    if not block:
        raise HTTPException(status_code=404, detail="临时封锁单不存在")
    return block


@app.post("/blocks", response_model=TemporaryBlockOut, tags=["临时封锁单"])
def create_block(block: TemporaryBlockCreate, db: Session = Depends(get_db)):
    existing = block_service.get_block_by_no(db, block.block_no)
    if existing:
        raise HTTPException(status_code=400, detail="封锁单编号已存在")
    return block_service.create_block(db, block)


@app.put("/blocks/{block_id}", response_model=TemporaryBlockOut, tags=["临时封锁单"])
def update_block(block_id: int, block_update: TemporaryBlockUpdate, db: Session = Depends(get_db)):
    block = block_service.update_block(db, block_id, block_update)
    if not block:
        raise HTTPException(status_code=404, detail="临时封锁单不存在")
    return block


@app.delete("/blocks/{block_id}", tags=["临时封锁单"])
def delete_block(block_id: int, db: Session = Depends(get_db)):
    success = block_service.delete_block(db, block_id)
    if not success:
        raise HTTPException(status_code=404, detail="临时封锁单不存在")
    return {"message": "删除成功"}


@app.post("/conflicts/detect", tags=["冲突检测"])
def detect_conflicts(
    start_date: Optional[datetime] = Query(None, description="检测开始时间"),
    end_date: Optional[datetime] = Query(None, description="检测结束时间"),
    db: Session = Depends(get_db)
):
    params = ConflictQueryParams(start_date=start_date, end_date=end_date)
    count = conflict_service.run_conflict_detection(db, params)
    return {
        "message": f"冲突检测完成，共发现 {count} 处冲突",
        "conflict_count": count
    }


@app.get("/conflicts", response_model=List[ConflictRecordOut], tags=["冲突检测"])
def list_conflicts(
    skip: int = 0,
    limit: int = 100,
    line_name: Optional[str] = None,
    conflict_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    params = ConflictQueryParams(
        line_name=line_name,
        conflict_type=conflict_type,
        severity=severity,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    return conflict_service.get_conflicts(db, skip, limit, params)


@app.get("/conflicts/{conflict_id}", response_model=ConflictRecordOut, tags=["冲突检测"])
def get_conflict(conflict_id: int, db: Session = Depends(get_db)):
    conflict = conflict_service.get_conflict(db, conflict_id)
    if not conflict:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return conflict


@app.put("/conflicts/{conflict_id}/handle", response_model=ConflictRecordOut, tags=["冲突检测"])
def handle_conflict(
    conflict_id: int,
    update: ConflictHandleUpdate,
    db: Session = Depends(get_db)
):
    conflict = conflict_service.handle_conflict(db, conflict_id, update.status, update.handle_opinion)
    if not conflict:
        raise HTTPException(status_code=404, detail="冲突记录不存在")
    return conflict


@app.get("/conflicts/statistics/summary", tags=["冲突检测"])
def get_conflict_statistics(db: Session = Depends(get_db)):
    return conflict_service.get_conflict_statistics(db)


@app.get("/reports/conflicts/csv", tags=["报告导出"])
def export_conflicts_csv(
    line_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    csv_data = report_service.generate_conflict_report_csv(db, line_name)
    filename = f"天窗冲突排程报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    encoded_filename = quote(filename)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@app.get("/reports/schedule/excel", tags=["报告导出"])
def export_schedule_excel(
    line_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    excel_data = report_service.generate_schedule_report_excel(db, line_name)
    filename = f"天窗冲突排程报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    encoded_filename = quote(filename)
    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@app.get("/reports/full/excel", tags=["报告导出"])
def export_full_report_excel(
    line_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    conflict_service.run_conflict_detection(db)
    excel_data = report_service.generate_schedule_report_excel(db, line_name)
    filename = f"天窗排程与冲突完整报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    encoded_filename = quote(filename)
    return StreamingResponse(
        io.BytesIO(excel_data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )
