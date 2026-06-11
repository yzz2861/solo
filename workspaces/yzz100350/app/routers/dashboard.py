from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DashboardResponse, FilterResult, AppointmentOut, InventoryCreate, InventoryOut
from app import crud
from app.models import ContainerInventory

router = APIRouter(tags=["看板与筛选"])


@router.get("/dashboard", response_model=DashboardResponse, summary="经理看板（未放行/已占箱/被退回/超时签到）")
def get_dashboard(db: Session = Depends(get_db)):
    return crud.get_dashboard(db)


@router.get("/filter/ship", response_model=FilterResult, summary="按船名筛选预约")
def filter_by_ship_name(
    ship_name: str = Query(..., min_length=1, description="船名关键词"),
    db: Session = Depends(get_db),
):
    items = crud.filter_by_ship_name(db, ship_name)
    return {"total": len(items), "items": items}


@router.post("/inventory", response_model=InventoryOut, summary="录入库存")
def create_inventory(data: InventoryCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(ContainerInventory)
        .filter(
            ContainerInventory.shipping_company == data.shipping_company,
            ContainerInventory.container_type == data.container_type,
        )
        .first()
    )
    if existing:
        existing.total_qty = data.total_qty
        from datetime import datetime
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    inv = ContainerInventory(
        shipping_company=data.shipping_company,
        ship_name=data.ship_name,
        container_type=data.container_type,
        total_qty=data.total_qty,
        occupied_qty=0,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/inventory", response_model=List[InventoryOut], summary="查询库存列表")
def list_inventory(db: Session = Depends(get_db)):
    return db.query(ContainerInventory).all()


@router.post("/inventory/recalculate", summary="重算库存占用（保证明细与汇总一致）")
def recalculate_inventory(db: Session = Depends(get_db)):
    crud.recalculate_inventory(db)
    return {"message": "库存占用已重新计算，明细与汇总已对齐"}
