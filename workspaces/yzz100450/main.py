from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date

from database import engine, get_db, Base
import models, schemas, crud
from models import (
    BloodType, BloodComponent, BagStatus, UrgencyLevel,
    AppointmentStatus
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="血站成分血发放预约 API",
    description="管理血站成分血的库存、预约、发放全流程",
    version="1.0.0"
)


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    crud.update_expired_bags(db)


@app.get("/")
def root():
    return {"message": "血站成分血发放预约系统 API", "version": "1.0.0"}


# ==================== 库存血袋管理 ====================

@app.post("/blood-bags/", response_model=schemas.BloodBag, tags=["库存管理"])
def create_blood_bag(bag: schemas.BloodBagCreate, db: Session = Depends(get_db)):
    """新增入库血袋"""
    existing = crud.get_blood_bag_by_code(db, bag.bag_code)
    if existing:
        raise HTTPException(status_code=400, detail="血袋编号已存在")
    return crud.create_blood_bag(db, bag)


@app.get("/blood-bags/", response_model=List[schemas.BloodBag], tags=["库存管理"])
def list_blood_bags(
    blood_type: Optional[BloodType] = None,
    component: Optional[BloodComponent] = None,
    status: Optional[BagStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """查询血袋列表"""
    return crud.list_blood_bags(db, blood_type, component, status, skip, limit)


@app.get("/blood-bags/{bag_id}", response_model=schemas.BloodBag, tags=["库存管理"])
def get_blood_bag(bag_id: int, db: Session = Depends(get_db)):
    """查询单个血袋详情"""
    bag = crud.get_blood_bag(db, bag_id)
    if not bag:
        raise HTTPException(status_code=404, detail="血袋不存在")
    return bag


@app.patch("/blood-bags/{bag_id}", response_model=schemas.BloodBag, tags=["库存管理"])
def update_blood_bag(
    bag_id: int,
    bag_update: schemas.BloodBagUpdate,
    db: Session = Depends(get_db)
):
    """更新血袋信息"""
    bag = crud.update_blood_bag(db, bag_id, bag_update)
    if not bag:
        raise HTTPException(status_code=404, detail="血袋不存在")
    return bag


@app.get("/blood-bags/available/count", tags=["库存管理"])
def count_available(
    blood_type: BloodType,
    component: BloodComponent,
    db: Session = Depends(get_db)
):
    """查询可用血袋数量"""
    count = crud.count_available_bags(db, blood_type, component)
    return {"blood_type": blood_type, "component": component, "available_count": count}


# ==================== 预约管理 ====================

@app.post("/appointments/", response_model=schemas.AppointmentCreateResponse, tags=["预约管理"])
def create_appointment(appt: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    """
    登记预约
    - 按有效期优先锁定库存（先进先出，快过期的先发）
    - 加急单优先分配
    - 重复申请（同医院、同血型成分、2小时内）会提示合并
    - 库存不足时自动驳回或部分分配
    """
    duplicate = crud.check_duplicate_appointment(
        db, appt.hospital, appt.blood_type, appt.component, appt.appointment_time
    )

    warning = None
    if duplicate:
        warning = schemas.DuplicateAppointmentWarning(
            has_duplicate=True,
            existing_appointment_no=duplicate.appointment_no,
            existing_hospital=duplicate.hospital,
            existing_quantity=duplicate.quantity,
            message=f"检测到该院在相近时间已有同类预约（单号：{duplicate.appointment_no}，数量：{duplicate.quantity}），建议合并处理"
        )

    db_appt, fully_allocated = crud.create_appointment(db, appt)
    return schemas.AppointmentCreateResponse(
        appointment=db_appt,
        duplicate_warning=warning
    )


@app.get("/appointments/", response_model=List[schemas.Appointment], tags=["预约管理"])
def list_appointments(
    status: Optional[AppointmentStatus] = None,
    hospital: Optional[str] = None,
    blood_type: Optional[BloodType] = None,
    component: Optional[BloodComponent] = None,
    urgency: Optional[UrgencyLevel] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """查询预约列表"""
    return crud.list_appointments(db, status, hospital, blood_type, component, urgency, skip, limit)


@app.get("/appointments/{appt_id}", response_model=schemas.AppointmentDetail, tags=["预约管理"])
def get_appointment(appt_id: int, db: Session = Depends(get_db)):
    """查询预约详情"""
    appt = crud.get_appointment(db, appt_id)
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return appt


@app.get("/appointments/no/{appointment_no}", response_model=schemas.AppointmentDetail, tags=["预约管理"])
def get_appointment_by_no(appointment_no: str, db: Session = Depends(get_db)):
    """按预约单号查询"""
    appt = crud.get_appointment_by_no(db, appointment_no)
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return appt


@app.patch("/appointments/{appt_id}/status", response_model=schemas.Appointment, tags=["预约管理"])
def update_appointment_status(
    appt_id: int,
    status: AppointmentStatus,
    rejection_reason: Optional[str] = None,
    rejected_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    更新预约状态
    - 驳回时需要填写原因，已锁定的库存会自动释放
    - 已发放的血袋不可回到可预约状态
    """
    appt = crud.update_appointment_status(db, appt_id, status, rejection_reason, rejected_by)
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return appt


@app.post("/appointments/{appt_id}/cancel", response_model=schemas.Appointment, tags=["预约管理"])
def cancel_appointment(appt_id: int, db: Session = Depends(get_db)):
    """取消预约，释放已锁定库存"""
    appt = crud.cancel_appointment(db, appt_id)
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return appt


# ==================== 取血发放 ====================

@app.post("/issues/", response_model=List[schemas.IssueRecord], tags=["取血发放"])
def issue_blood(issue_data: schemas.IssueCreate, db: Session = Depends(get_db)):
    """
    发放取血
    - 确认取血人信息
    - 记录冷链交接时间
    - 超出冷链窗口需填写原因
    - 已发放的血袋状态变为 issued，不可回到可预约
    """
    appt = crud.get_appointment(db, issue_data.appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="预约不存在")

    if appt.status not in [AppointmentStatus.APPROVED, AppointmentStatus.PARTIAL_FULFILLED]:
        raise HTTPException(status_code=400, detail=f"预约状态为 {appt.status.value}，不可发放")

    if appt.cold_chain_window_end and issue_data.cold_chain_actual_time:
        if issue_data.cold_chain_actual_time > appt.cold_chain_window_end:
            if not issue_data.cold_chain_delay_reason:
                raise HTTPException(
                    status_code=400,
                    detail="实际交接时间超出冷链窗口，必须填写超时原因"
                )

    records = crud.issue_blood_bags(db, issue_data.appointment_id, issue_data.blood_bag_ids, issue_data)
    if not records:
        raise HTTPException(status_code=400, detail="没有可发放的血袋（可能已发放或未锁定）")
    return records


@app.get("/issues/", response_model=List[schemas.IssueRecord], tags=["取血发放"])
def list_issues(
    appointment_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """查询发放记录"""
    return crud.list_issue_records(db, appointment_id, skip, limit)


# ==================== 值班员视图 ====================

@app.get("/duty/pending-list", response_model=schemas.PendingListResponse, tags=["值班员视图"])
def get_pending_list(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    值班员：待取清单
    显示所有待取血的预约（已批准、部分完成）
    """
    crud.update_expired_bags(db)
    appts = crud.list_appointments(
        db,
        status=None,
        skip=skip,
        limit=limit
    )
    pending_appts = [
        a for a in appts
        if a.status in [AppointmentStatus.APPROVED, AppointmentStatus.PARTIAL_FULFILLED, AppointmentStatus.PENDING]
    ]
    pending_appts.sort(key=lambda x: (
        0 if x.urgency == UrgencyLevel.EMERGENCY else 1 if x.urgency == UrgencyLevel.URGENT else 2,
        x.appointment_time
    ))
    return schemas.PendingListResponse(
        total=len(pending_appts),
        items=pending_appts
    )


# ==================== 主任视图 ====================

@app.get("/director/expiry-risk", response_model=schemas.ExpiryRiskResponse, tags=["主任视图"])
def get_expiry_risk(
    days_threshold: int = Query(3, description="多少天内过期算风险"),
    db: Session = Depends(get_db)
):
    """
    主任：过期风险报表
    - 按风险等级（高/中/低）排序
    - 显示距离过期的天数
    """
    crud.update_expired_bags(db)
    items = crud.get_expiry_risk_bags(db, days_threshold)
    return schemas.ExpiryRiskResponse(
        total=len(items),
        items=items
    )


@app.get("/director/urgent-usage", response_model=schemas.UrgentUsageResponse, tags=["主任视图"])
def get_urgent_usage(db: Session = Depends(get_db)):
    """
    主任：加急占用情况
    - 统计急诊和加急单数量
    - 统计占用血袋数
    """
    data = crud.get_urgent_usage(db)
    return schemas.UrgentUsageResponse(**data)


@app.get("/director/rejected", response_model=schemas.RejectedListResponse, tags=["主任视图"])
def get_rejected_appointments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    主任：被驳回预约列表
    """
    items = crud.get_rejected_appointments(db, skip, limit)
    return schemas.RejectedListResponse(
        total=len(items),
        items=items
    )


# ==================== 夜班视图 ====================

@app.get("/night-shift/hospital-pending", response_model=schemas.HospitalPendingResponse, tags=["夜班视图"])
def get_hospital_pending(
    hospital: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    夜班：按医院筛选未取血袋
    - 按医院分组显示未取预约
    - 可按医院名称模糊筛选
    """
    data = crud.get_pending_by_hospital(db, hospital)
    return schemas.HospitalPendingResponse(**data)


@app.get("/night-shift/reminders", response_model=schemas.ReminderListResponse, tags=["夜班视图"])
def get_reminders(
    overdue_minutes: int = Query(30, description="超时多少分钟需要催缴"),
    db: Session = Depends(get_db)
):
    """
    夜班：待催缴清单
    - 超过预约时间未取血的预约
    - 按超时时间从长到短排序
    - 交接时可据此电话催取
    """
    data = crud.get_reminder_list(db, overdue_minutes)
    return schemas.ReminderListResponse(**data)


# ==================== 系统维护 ====================

@app.post("/system/refresh-expiry", tags=["系统维护"])
def refresh_expiry_status(db: Session = Depends(get_db)):
    """手动刷新过期血袋状态"""
    count = crud.update_expired_bags(db)
    return {"updated_count": count, "message": f"已标记 {count} 袋过期"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
