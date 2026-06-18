from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import models
from app.models.models import (
    User, Outlet, Publication, Issue, Inventory, Sale, Return, Restock,
    RestockItem, Delivery, DeliveryItem, Complaint, ReturnStatus,
    RestockStatus, DeliveryStatus, ComplaintStatus
)
from app.schemas import schemas
from app.services import business

router = APIRouter()


@router.post("/users", response_model=schemas.UserResponse, tags=["用户"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.phone == user.phone).first()
    if db_user:
        raise HTTPException(status_code=400, detail="手机号已存在")
    db_user = User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/users", response_model=List[schemas.UserResponse], tags=["用户"])
def list_users(role: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(User)
    if role:
        try:
            q = q.filter(User.role == models.UserRole(role))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的角色")
    return q.offset(skip).limit(limit).all()


@router.get("/users/{user_id}", response_model=schemas.UserResponse, tags=["用户"])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.post("/outlets", response_model=schemas.OutletResponse, tags=["网点"])
def create_outlet(data: schemas.OutletCreate, db: Session = Depends(get_db)):
    exist = db.query(Outlet).filter(Outlet.code == data.code).first()
    if exist:
        raise HTTPException(status_code=400, detail="网点编号已存在")
    owner = db.query(User).filter(User.id == data.owner_id).first()
    if not owner:
        raise HTTPException(status_code=400, detail="亭主不存在")
    outlet = Outlet(**data.model_dump())
    db.add(outlet)
    db.commit()
    db.refresh(outlet)
    return outlet


@router.get("/outlets", response_model=List[schemas.OutletResponse], tags=["网点"])
def list_outlets(
    district: Optional[str] = None,
    route_code: Optional[str] = None,
    owner_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Outlet)
    if district:
        q = q.filter(Outlet.district == district)
    if route_code:
        q = q.filter(Outlet.route_code == route_code)
    if owner_id:
        q = q.filter(Outlet.owner_id == owner_id)
    if is_active is not None:
        q = q.filter(Outlet.is_active == is_active)
    return q.offset(skip).limit(limit).all()


@router.get("/outlets/{outlet_id}", response_model=schemas.OutletResponse, tags=["网点"])
def get_outlet(outlet_id: int, db: Session = Depends(get_db)):
    outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="网点不存在")
    return outlet


@router.put("/outlets/{outlet_id}", response_model=schemas.OutletResponse, tags=["网点"])
def update_outlet(outlet_id: int, data: schemas.OutletUpdate, db: Session = Depends(get_db)):
    outlet = db.query(Outlet).filter(Outlet.id == outlet_id).first()
    if not outlet:
        raise HTTPException(status_code=404, detail="网点不存在")
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(outlet, key, val)
    db.commit()
    db.refresh(outlet)
    return outlet


@router.post("/publications", response_model=schemas.PublicationResponse, tags=["刊物"])
def create_publication(data: schemas.PublicationCreate, db: Session = Depends(get_db)):
    exist = db.query(Publication).filter(Publication.issn == data.issn).first()
    if exist:
        raise HTTPException(status_code=400, detail="ISSN已存在")
    pub = Publication(**data.model_dump())
    db.add(pub)
    db.commit()
    db.refresh(pub)
    return pub


@router.get("/publications", response_model=List[schemas.PublicationResponse], tags=["刊物"])
def list_publications(
    category: Optional[str] = None,
    is_hot: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Publication)
    if category:
        q = q.filter(Publication.category == category)
    if is_hot is not None:
        q = q.filter(Publication.is_hot == is_hot)
    return q.offset(skip).limit(limit).all()


@router.get("/publications/{pub_id}", response_model=schemas.PublicationResponse, tags=["刊物"])
def get_publication(pub_id: int, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="刊物不存在")
    return pub


@router.put("/publications/{pub_id}", response_model=schemas.PublicationResponse, tags=["刊物"])
def update_publication(pub_id: int, data: schemas.PublicationUpdate, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == pub_id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="刊物不存在")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(pub, k, v)
    db.commit()
    db.refresh(pub)
    return pub


@router.post("/issues", response_model=schemas.IssueResponse, tags=["刊期"])
def create_issue(data: schemas.IssueCreate, db: Session = Depends(get_db)):
    pub = db.query(Publication).filter(Publication.id == data.publication_id).first()
    if not pub:
        raise HTTPException(status_code=400, detail="刊物不存在")
    issue = Issue(**data.model_dump())
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.get("/issues", response_model=List[schemas.IssueResponse], tags=["刊期"])
def list_issues(
    publication_id: Optional[int] = None,
    publish_from: Optional[date] = None,
    publish_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Issue)
    if publication_id:
        q = q.filter(Issue.publication_id == publication_id)
    if publish_from:
        q = q.filter(Issue.publish_date >= publish_from)
    if publish_to:
        q = q.filter(Issue.publish_date <= publish_to)
    return q.order_by(Issue.publish_date.desc()).offset(skip).limit(limit).all()


@router.get("/issues/{issue_id}", response_model=schemas.IssueResponse, tags=["刊期"])
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="刊期不存在")
    return issue


@router.put("/issues/{issue_id}", response_model=schemas.IssueResponse, tags=["刊期"])
def update_issue(issue_id: int, data: schemas.IssueUpdate, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="刊期不存在")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(issue, k, v)
    db.commit()
    db.refresh(issue)
    return issue


@router.get("/inventories", response_model=List[schemas.InventoryResponse], tags=["库存"])
def list_inventories(
    outlet_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    low_stock: Optional[bool] = False,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(Inventory)
    if outlet_id:
        q = q.filter(Inventory.outlet_id == outlet_id)
    if issue_id:
        q = q.filter(Inventory.issue_id == issue_id)
    if low_stock:
        q = q.filter(Inventory.stock_qty <= 5)
    return q.offset(skip).limit(limit).all()


@router.post("/sales", tags=["销量"])
def create_sale(data: schemas.SaleCreate, db: Session = Depends(get_db)):
    result = business.create_sale(db, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.get("/sales", response_model=List[schemas.SaleResponse], tags=["销量"])
def list_sales(
    outlet_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    sale_from: Optional[date] = None,
    sale_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(Sale)
    if outlet_id:
        q = q.filter(Sale.outlet_id == outlet_id)
    if issue_id:
        q = q.filter(Sale.issue_id == issue_id)
    if sale_from:
        q = q.filter(Sale.sale_date >= sale_from)
    if sale_to:
        q = q.filter(Sale.sale_date <= sale_to)
    return q.order_by(Sale.sale_date.desc()).offset(skip).limit(limit).all()


@router.post("/returns", tags=["退刊"])
def create_return(data: schemas.ReturnCreate, db: Session = Depends(get_db)):
    result = business.create_return(db, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.get("/returns", response_model=List[schemas.ReturnResponse], tags=["退刊"])
def list_returns(
    outlet_id: Optional[int] = None,
    issue_id: Optional[int] = None,
    status: Optional[str] = None,
    apply_from: Optional[date] = None,
    apply_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(Return)
    if outlet_id:
        q = q.filter(Return.outlet_id == outlet_id)
    if issue_id:
        q = q.filter(Return.issue_id == issue_id)
    if status:
        try:
            q = q.filter(Return.status == ReturnStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的状态")
    if apply_from:
        q = q.filter(Return.apply_date >= apply_from)
    if apply_to:
        q = q.filter(Return.apply_date <= apply_to)
    return q.order_by(Return.apply_date.desc()).offset(skip).limit(limit).all()


@router.post("/returns/{return_id}/process", response_model=schemas.ReturnResponse, tags=["退刊"])
def process_return(return_id: int, data: schemas.ReturnProcess, db: Session = Depends(get_db)):
    result = business.process_return(db, return_id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.post("/restocks", tags=["补货"])
def create_restock(data: schemas.RestockCreate, db: Session = Depends(get_db)):
    result = business.create_restock(db, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    resp_data = schemas.RestockResponse.model_validate(result["data"]).model_dump()
    resp_data["_merged"] = result.get("merged", False)
    return resp_data


@router.get("/restocks", response_model=List[schemas.RestockResponse], tags=["补货"])
def list_restocks(
    outlet_id: Optional[int] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    apply_from: Optional[date] = None,
    apply_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(Restock)
    if outlet_id:
        q = q.filter(Restock.outlet_id == outlet_id)
    if status:
        try:
            q = q.filter(Restock.status == RestockStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的状态")
    if urgency:
        q = q.filter(Restock.urgency == urgency)
    if apply_from:
        q = q.filter(Restock.apply_date >= apply_from)
    if apply_to:
        q = q.filter(Restock.apply_date <= apply_to)
    return q.order_by(Restock.apply_time.desc()).offset(skip).limit(limit).all()


@router.get("/restocks/{restock_id}", response_model=schemas.RestockResponse, tags=["补货"])
def get_restock(restock_id: int, db: Session = Depends(get_db)):
    r = db.query(Restock).filter(Restock.id == restock_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="补货申请不存在")
    return r


@router.post("/restocks/{restock_id}/process", tags=["补货"])
def process_restock(restock_id: int, data: schemas.RestockProcess, db: Session = Depends(get_db)):
    result = business.process_restock(db, restock_id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.post("/deliveries", tags=["配送"])
def create_delivery(data: schemas.DeliveryPlanCreate, db: Session = Depends(get_db)):
    result = business.create_delivery_from_plan(db, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.get("/deliveries", response_model=List[schemas.DeliveryResponse], tags=["配送"])
def list_deliveries(
    route_code: Optional[str] = None,
    driver_id: Optional[int] = None,
    status: Optional[str] = None,
    plan_from: Optional[date] = None,
    plan_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Delivery)
    if route_code:
        q = q.filter(Delivery.route_code == route_code)
    if driver_id:
        q = q.filter(Delivery.driver_id == driver_id)
    if status:
        try:
            q = q.filter(Delivery.status == DeliveryStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的状态")
    if plan_from:
        q = q.filter(Delivery.plan_date >= plan_from)
    if plan_to:
        q = q.filter(Delivery.plan_date <= plan_to)
    return q.order_by(Delivery.plan_date.desc()).offset(skip).limit(limit).all()


@router.get("/deliveries/{delivery_id}", response_model=schemas.DeliveryResponse, tags=["配送"])
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="配送单不存在")
    return d


@router.put("/deliveries/{delivery_id}/status", tags=["配送"])
def update_delivery_status(delivery_id: int, data: schemas.DeliveryUpdateStatus, db: Session = Depends(get_db)):
    result = business.update_delivery_status(db, delivery_id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.put("/delivery-items/{item_id}", tags=["配送"])
def update_delivery_item(item_id: int, data: schemas.DeliveryItemUpdate, db: Session = Depends(get_db)):
    result = business.update_delivery_item(db, item_id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.post("/complaints", tags=["投诉"])
def create_complaint(data: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    result = business.create_complaint(db, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@router.get("/complaints", response_model=List[schemas.ComplaintResponse], tags=["投诉"])
def list_complaints(
    outlet_id: Optional[int] = None,
    status: Optional[str] = None,
    complaint_type: Optional[str] = None,
    reported_from: Optional[date] = None,
    reported_to: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(Complaint)
    if outlet_id:
        q = q.filter(Complaint.outlet_id == outlet_id)
    if status:
        try:
            q = q.filter(Complaint.status == ComplaintStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的状态")
    if complaint_type:
        q = q.filter(Complaint.complaint_type == complaint_type)
    if reported_from:
        q = q.filter(Complaint.reported_date >= reported_from)
    if reported_to:
        q = q.filter(Complaint.reported_date <= reported_to)
    return q.order_by(Complaint.reported_date.desc()).offset(skip).limit(limit).all()


@router.put("/complaints/{complaint_id}", response_model=schemas.ComplaintResponse, tags=["投诉"])
def update_complaint(complaint_id: int, data: schemas.ComplaintUpdate, db: Session = Depends(get_db)):
    result = business.update_complaint(db, complaint_id, data)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]
