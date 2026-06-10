from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import csv
import io
from datetime import datetime

from database import engine, get_db, Base
import models
import schemas
import crud

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="光伏电站巡检缺陷闭环管理 API",
    description="组件台账、缺陷识别、维修反馈全流程闭环管理系统",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "name": "光伏电站巡检缺陷闭环管理系统",
        "version": "1.0.0",
        "endpoints": {
            "导入相关": [
                "POST /api/import/components - 导入组件台账CSV",
                "POST /api/import/defects - 导入缺陷识别JSON",
                "POST /api/import/repairs - 导入维修反馈CSV"
            ],
            "查询相关": [
                "GET /api/components/{component_code} - 组件详情（含缺陷全生命周期）",
                "GET /api/defects - 缺陷列表",
                "GET /api/defects/{defect_code} - 缺陷详情",
                "GET /api/abnormal/severity-changed - 严重等级变化列表",
                "GET /api/abnormal/recheck-failed - 复查未通过列表",
                "GET /api/abnormal/spare-parts - 备件用量异常列表"
            ],
            "操作相关": [
                "PUT /api/defects/{defect_code}/review - 修改复核意见",
                "PUT /api/defects/{defect_code} - 修改缺陷信息",
                "GET /api/reports/closed-loop - 缺陷闭环报告"
            ]
        }
    }


@app.post("/api/import/components", response_model=schemas.ImportResult)
async def import_components(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        csv_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_content = content.decode("gbk")

    result = crud.import_components_from_csv(db, csv_content, file.filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/import/defects", response_model=schemas.ImportResult)
async def import_defects(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    json_content = content.decode("utf-8-sig")

    result = crud.import_defects_from_json(db, json_content, file.filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/import/repairs", response_model=schemas.ImportResult)
async def import_repairs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        csv_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_content = content.decode("gbk")

    result = crud.import_repairs_from_csv(db, csv_content, file.filename)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.get("/api/components/{component_code}", response_model=schemas.ComponentDetail)
def get_component_detail(component_code: str, db: Session = Depends(get_db)):
    component = crud.get_component(db, component_code)
    if not component:
        raise HTTPException(status_code=404, detail="组件不存在")
    return component


@app.get("/api/components", response_model=List[schemas.Component])
def list_components(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_components(db, skip=skip, limit=limit)


@app.get("/api/defects", response_model=List[schemas.Defect])
def list_defects(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    component_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_defects(db, skip=skip, limit=limit, status=status, severity=severity, component_code=component_code)


@app.get("/api/defects/{defect_code}", response_model=schemas.Defect)
def get_defect_detail(defect_code: str, db: Session = Depends(get_db)):
    defect = crud.get_defect(db, defect_code)
    if not defect:
        raise HTTPException(status_code=404, detail="缺陷不存在")
    return defect


@app.get("/api/abnormal/severity-changed", response_model=List[schemas.Defect])
def get_severity_changed(db: Session = Depends(get_db)):
    return crud.get_severity_changed_defects(db)


@app.get("/api/abnormal/recheck-failed", response_model=List[schemas.Defect])
def get_recheck_failed(db: Session = Depends(get_db)):
    return crud.get_recheck_failed_defects(db)


@app.get("/api/abnormal/spare-parts", response_model=List[schemas.Defect])
def get_abnormal_spare_parts(threshold: float = 1000.0, db: Session = Depends(get_db)):
    return crud.get_abnormal_spare_parts(db, threshold=threshold)


@app.put("/api/defects/{defect_code}/review", response_model=schemas.Defect)
def update_review(defect_code: str, review_data: schemas.RecheckUpdate, db: Session = Depends(get_db)):
    defect = crud.update_defect_review(db, defect_code, review_data)
    if not defect:
        raise HTTPException(status_code=404, detail="缺陷不存在")
    return defect


@app.put("/api/defects/{defect_code}", response_model=schemas.Defect)
def update_defect(defect_code: str, update_data: schemas.DefectUpdate, db: Session = Depends(get_db)):
    defect = crud.update_defect(db, defect_code, update_data)
    if not defect:
        raise HTTPException(status_code=404, detail="缺陷不存在")
    return defect


@app.get("/api/reports/closed-loop")
def get_closed_loop_report(db: Session = Depends(get_db)):
    return crud.get_closed_loop_report(db)


@app.get("/api/reports/closed-loop/export")
def export_closed_loop_report(db: Session = Depends(get_db)):
    report = crud.get_closed_loop_report(db)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["缺陷闭环管理报告"])
    writer.writerow([])
    writer.writerow(["统计概览"])
    writer.writerow(["缺陷总数", report["total_defects"]])
    writer.writerow(["已关闭数", report["closed_count"]])
    writer.writerow(["进行中数", report["in_progress_count"]])
    writer.writerow(["关闭率(%)", report["closed_rate"]])
    writer.writerow(["平均闭环周期(天)", report["average_cycle_days"]])
    writer.writerow([])
    writer.writerow(["明细数据"])
    writer.writerow([
        "缺陷编号", "组件编号", "缺陷类型", "严重等级", "状态",
        "发现时间", "维修时间", "复查时间", "关闭时间",
        "复查结果", "复查意见", "备件名称", "备件费用",
        "闭环周期(天)"
    ])

    for item in report["items"]:
        writer.writerow([
            item["defect_code"],
            item["component_code"],
            item["defect_type"],
            item["severity"],
            item["status"],
            item["discovery_time"].strftime("%Y-%m-%d %H:%M:%S") if item["discovery_time"] else "",
            item["repair_time"].strftime("%Y-%m-%d %H:%M:%S") if item["repair_time"] else "",
            item["recheck_time"].strftime("%Y-%m-%d %H:%M:%S") if item["recheck_time"] else "",
            item["close_time"].strftime("%Y-%m-%d %H:%M:%S") if item["close_time"] else "",
            item["recheck_result"],
            item["recheck_opinion"],
            item["spare_parts"],
            item["spare_parts_cost"],
            item["cycle_days"] if item["cycle_days"] else ""
        ])

    csv_content = output.getvalue()

    return JSONResponse(
        content={
            "filename": f"closed_loop_report_{datetime.now().strftime('%Y%m%d')}.csv",
            "content_type": "text/csv; charset=utf-8-sig",
            "content": "\ufeff" + csv_content
        }
    )
