from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List

from app.database import get_db
from app.schemas import (
    VehicleEntryCreate, VehicleRecordResponse, VehicleLoadComplete,
    VehicleWashStart, VehicleWashComplete, VehicleInspect, VehicleExit,
    VehicleQueueItem, ApiResponse, PaginatedResponse, BlockResolve,
    BlockRecordResponse, InspectionRecordResponse, WashRecordResponse,
)
from app.services import (
    vehicle_entry, vehicle_load_complete, vehicle_wash_start, vehicle_wash_complete,
    vehicle_inspect, vehicle_exit, get_queue, get_record, list_records,
    find_by_plate, resolve_block, BusinessRuleError, get_shift_flow,
)

router = APIRouter(prefix="/api/vehicles", tags=["车辆登记管理"])


def _handle_business_error(e: BusinessRuleError):
    raise HTTPException(
        status_code=400,
        detail={
            "code": e.error_code,
            "message": e.message,
            "details": e.details,
        }
    )


@router.post("/entry", response_model=VehicleRecordResponse, summary="车辆进场登记")
def api_vehicle_entry(data: VehicleEntryCreate, db: Session = Depends(get_db)):
    try:
        record = vehicle_entry(db, data)
        db.commit()
        db.refresh(record)
        return record
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/{record_id}/load-complete", response_model=VehicleRecordResponse, summary="装载完成")
def api_load_complete(record_id: int, data: VehicleLoadComplete, db: Session = Depends(get_db)):
    try:
        record = vehicle_load_complete(db, record_id, data)
        db.commit()
        db.refresh(record)
        return record
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/{record_id}/wash-start", summary="开始洗轮", response_model=ApiResponse)
def api_wash_start(record_id: int, data: VehicleWashStart, db: Session = Depends(get_db)):
    try:
        record, wash = vehicle_wash_start(db, record_id, data)
        db.commit()
        return ApiResponse(
            message="洗轮已开始",
            data={
                "record_id": record.id,
                "status": record.status,
                "wash_record_id": wash.id,
                "start_time": wash.start_time.isoformat(),
                "is_rewash": wash.is_rewash,
            }
        )
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/{record_id}/wash-complete", response_model=ApiResponse, summary="完成洗轮")
def api_wash_complete(record_id: int, data: VehicleWashComplete, db: Session = Depends(get_db)):
    try:
        record, wash = vehicle_wash_complete(db, record_id, data)
        db.commit()
        return ApiResponse(
            message="洗轮已完成",
            data={
                "record_id": record.id,
                "status": record.status,
                "wash_record_id": wash.id,
                "duration_seconds": wash.duration_seconds,
                "quality_score": wash.quality_score,
            }
        )
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/{record_id}/inspect", summary="检查放行")
def api_inspect(record_id: int, data: VehicleInspect, db: Session = Depends(get_db)):
    try:
        record, inspection, block = vehicle_inspect(db, record_id, data)
        db.commit()
        data_dict = {
            "record_id": record.id,
            "status": record.status,
            "passed": inspection.passed,
            "inspection_id": inspection.id,
            "failure_reason": inspection.failure_reason,
            "need_rewash": inspection.need_rewash,
        }
        if block:
            data_dict["block_id"] = block.id
            data_dict["block_reason"] = block.block_reason
        return ApiResponse(
            message="检查通过" if inspection.passed else f"检查不通过：{inspection.failure_reason}",
            data=data_dict,
        )
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/{record_id}/exit", response_model=VehicleRecordResponse, summary="车辆出场")
def api_exit(record_id: int, data: VehicleExit, db: Session = Depends(get_db)):
    try:
        record = vehicle_exit(db, record_id, data)
        db.commit()
        db.refresh(record)
        return record
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.post("/blocks/{block_id}/resolve", response_model=BlockRecordResponse, summary="解决拦截记录")
def api_resolve_block(block_id: int, data: BlockResolve, db: Session = Depends(get_db)):
    try:
        block = resolve_block(db, block_id, data)
        db.commit()
        db.refresh(block)
        return block
    except BusinessRuleError as e:
        db.rollback()
        _handle_business_error(e)


@router.get("/queue", response_model=List[VehicleQueueItem], summary="门岗实时排队")
def api_get_queue(db: Session = Depends(get_db)):
    return get_queue(db)


@router.get("/shift-flow", summary="门岗交班流水")
def api_shift_flow(
    shift_date: Optional[date] = Query(None, description="交班日期，默认今天"),
    shift: str = Query("all", description="班次: day日班/night夜班/all全天"),
    db: Session = Depends(get_db),
):
    flow = get_shift_flow(db, shift_date, shift)
    records_data = []
    for r in flow["records"]:
        records_data.append({
            "id": r.id,
            "plate_number": r.plate_number,
            "driver_name": r.driver_name,
            "vehicle_type": r.vehicle_type,
            "construction_site": r.construction_site,
            "entry_time": r.entry_time.isoformat() if r.entry_time else None,
            "load_complete_time": r.load_complete_time.isoformat() if r.load_complete_time else None,
            "wash_complete_time": r.wash_complete_time.isoformat() if r.wash_complete_time else None,
            "inspection_time": r.inspection_time.isoformat() if r.inspection_time else None,
            "exit_time": r.exit_time.isoformat() if r.exit_time else None,
            "status": r.status,
            "load_cargo": r.load_cargo,
            "load_weight": r.load_weight,
            "is_rewashed": r.is_rewashed,
            "rewash_count": r.rewash_count,
            "block_count": r.block_count,
            "gate_operator": r.gate_operator,
            "inspector": r.inspector,
        })
    blocks_data = []
    for b in flow["block_records"]:
        blocks_data.append({
            "id": b.id,
            "plate_number": b.plate_number,
            "block_time": b.block_time.isoformat(),
            "block_type": b.block_type,
            "block_reason": b.block_reason,
            "is_environmental_issue": b.is_environmental_issue,
            "resolved": b.resolved,
            "resolve_time": b.resolve_time.isoformat() if b.resolve_time else None,
            "resolve_method": b.resolve_method,
        })
    return {
        "shift_date": flow["shift_date"],
        "shift": flow["shift"],
        "period_start": flow["period_start"],
        "period_end": flow["period_end"],
        "summary": flow["summary"],
        "records": records_data,
        "block_records": blocks_data,
    }


@router.get("/lookup", response_model=List[VehicleRecordResponse], summary="按车牌查找记录（环保抽查）")
def api_lookup_plate(
    plate_number: str = Query(..., description="车牌号"),
    date_filter: Optional[date] = Query(None, description="指定日期（可选）"),
    db: Session = Depends(get_db),
):
    return find_by_plate(db, plate_number, date_filter)


@router.get("/{record_id}", response_model=VehicleRecordResponse, summary="获取车辆详情（环保抽查）")
def api_get_detail(record_id: int, db: Session = Depends(get_db)):
    record = get_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="车辆记录不存在")
    return record


@router.get("", response_model=PaginatedResponse, summary="车辆记录列表")
def api_list(
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    plate_number: Optional[str] = Query(None),
    construction_site: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    total, items = list_records(db, status, start_date, end_date, plate_number, construction_site, page, page_size)
    return PaginatedResponse(total=total, page=page, page_size=page_size, items=items)
