from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.config import settings
from app.models.models import (
    User, Outlet, Publication, Issue, Inventory, Sale, Return,
    Restock, RestockItem, Delivery, DeliveryItem, Complaint,
    ReturnStatus, RestockStatus, DeliveryStatus, DeliveryStatusDetail,
    ComplaintStatus
)
from app.schemas import schemas


def _generate_restock_no() -> str:
    now = datetime.now()
    return f"RK{now.strftime('%Y%m%d%H%M%S')}{now.microsecond % 1000:03d}"


def _generate_delivery_no() -> str:
    now = datetime.now()
    return f"DV{now.strftime('%Y%m%d%H%M%S')}{now.microsecond % 1000:03d}"


def _generate_complaint_no() -> str:
    now = datetime.now()
    return f"CP{now.strftime('%Y%m%d%H%M%S')}{now.microsecond % 1000:03d}"


def is_return_deadline_passed(issue: Issue, check_date: Optional[date] = None) -> bool:
    check_date = check_date or date.today()
    return check_date > issue.return_deadline


def _get_issue_return_deadline_status(db: Session, issue_id: int) -> Tuple[bool, Optional[Issue]]:
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        return True, None
    return is_return_deadline_passed(issue), issue


def update_inventory(db: Session, outlet_id: int, issue_id: int, qty_change: int) -> Inventory:
    inv = db.query(Inventory).filter(
        Inventory.outlet_id == outlet_id,
        Inventory.issue_id == issue_id
    ).first()
    if not inv:
        inv = Inventory(outlet_id=outlet_id, issue_id=issue_id, stock_qty=0)
        db.add(inv)
    inv.stock_qty += qty_change
    if inv.stock_qty < 0:
        inv.stock_qty = 0
    inv.last_updated = datetime.utcnow()
    db.flush()
    return inv


def find_mergeable_restock(db: Session, outlet_id: int) -> Optional[Restock]:
    cutoff = datetime.utcnow() - timedelta(hours=settings.MERGE_PENDING_HOURS)
    return db.query(Restock).filter(
        Restock.outlet_id == outlet_id,
        Restock.status == RestockStatus.PENDING,
        Restock.apply_time >= cutoff,
        Restock.merged_into_id.is_(None)
    ).first()


def create_return(db: Session, data: schemas.ReturnCreate) -> dict:
    deadline_passed, issue = _get_issue_return_deadline_status(db, data.issue_id)
    if deadline_passed:
        if issue is None:
            return {"success": False, "error": "期次不存在", "data": None}
        return {
            "success": False,
            "error": f"已过退刊期，退刊截止日为 {issue.return_deadline.isoformat()}",
            "data": None
        }

    inv = db.query(Inventory).filter(
        Inventory.outlet_id == data.outlet_id,
        Inventory.issue_id == data.issue_id
    ).first()
    current_stock = inv.stock_qty if inv else 0
    if current_stock < data.qty:
        return {
            "success": False,
            "error": f"库存不足，当前库存 {current_stock} 本",
            "data": None
        }

    ret = Return(
        outlet_id=data.outlet_id,
        issue_id=data.issue_id,
        qty=data.qty,
        status=ReturnStatus.PENDING,
        apply_date=date.today()
    )
    db.add(ret)
    db.commit()
    db.refresh(ret)
    return {"success": True, "error": None, "data": ret}


def process_return(db: Session, return_id: int, data: schemas.ReturnProcess) -> dict:
    ret = db.query(Return).filter(Return.id == return_id).first()
    if not ret:
        return {"success": False, "error": "退刊记录不存在"}
    if ret.status != ReturnStatus.PENDING:
        return {"success": False, "error": f"当前状态 {ret.status.value} 不可处理"}

    ret.status = data.status
    ret.processed_by = data.processed_by
    ret.process_date = date.today()

    if data.status == ReturnStatus.REJECTED:
        if not data.reject_reason:
            return {"success": False, "error": "拒绝必须填写原因"}
        ret.reject_reason = data.reject_reason

    if data.status == ReturnStatus.APPROVED:
        pass

    if data.status == ReturnStatus.DELIVERED:
        inv = update_inventory(db, ret.outlet_id, ret.issue_id, -ret.qty)
        issue = db.query(Issue).filter(Issue.id == ret.issue_id).first()
        if issue:
            issue.warehouse_stock += ret.qty

    db.commit()
    db.refresh(ret)
    return {"success": True, "data": ret}


def create_restock(db: Session, data: schemas.RestockCreate) -> dict:
    outlet = db.query(Outlet).filter(Outlet.id == data.outlet_id).first()
    if not outlet:
        return {"success": False, "error": "网点不存在"}

    for item in data.items:
        issue = db.query(Issue).filter(Issue.id == item.issue_id).first()
        if not issue:
            return {"success": False, "error": f"刊期ID {item.issue_id} 不存在"}

    merge_target = find_mergeable_restock(db, data.outlet_id)

    if merge_target:
        existing_items = {it.issue_id: it for it in merge_target.items}
        for req_item in data.items:
            if req_item.issue_id in existing_items:
                existing_items[req_item.issue_id].request_qty += req_item.request_qty
            else:
                new_item = RestockItem(
                    restock_id=merge_target.id,
                    issue_id=req_item.issue_id,
                    request_qty=req_item.request_qty
                )
                db.add(new_item)
        if data.owner_remark:
            merge_target.owner_remark = (merge_target.owner_remark or "") + f"\n[合并补充] {data.owner_remark}"
        db.commit()
        db.refresh(merge_target)
        return {"success": True, "data": merge_target, "merged": True}

    restock = Restock(
        restock_no=_generate_restock_no(),
        outlet_id=data.outlet_id,
        status=RestockStatus.PENDING,
        urgency=data.urgency,
        apply_date=date.today(),
        apply_time=datetime.utcnow(),
        owner_remark=data.owner_remark
    )
    db.add(restock)
    db.flush()

    for req_item in data.items:
        item = RestockItem(
            restock_id=restock.id,
            issue_id=req_item.issue_id,
            request_qty=req_item.request_qty
        )
        db.add(item)

    db.commit()
    db.refresh(restock)
    return {"success": True, "data": restock, "merged": False}


def process_restock(db: Session, restock_id: int, data: schemas.RestockProcess) -> dict:
    restock = db.query(Restock).filter(Restock.id == restock_id).first()
    if not restock:
        return {"success": False, "error": "补货申请不存在"}
    if restock.status != RestockStatus.PENDING:
        return {"success": False, "error": f"当前状态 {restock.status.value} 不可处理"}

    item_map = {it.id: it for it in restock.items}
    all_rejected = True
    all_zero = True

    for proc_item in data.items:
        if proc_item.id not in item_map:
            return {"success": False, "error": f"明细ID {proc_item.id} 不存在"}
        item = item_map[proc_item.id]
        item.approved_qty = proc_item.approved_qty

        if proc_item.approved_qty < item.request_qty and proc_item.approved_qty >= 0:
            if not proc_item.shortage_reason:
                return {"success": False, "error": f"刊期 {item.issue_id} 数量不足必须填写原因"}
            item.shortage_reason = proc_item.shortage_reason

        if proc_item.approved_qty > 0:
            all_rejected = False
            all_zero = False

            issue = db.query(Issue).filter(Issue.id == item.issue_id).first()
            if issue and issue.warehouse_stock < proc_item.approved_qty:
                if not proc_item.shortage_reason:
                    return {"success": False, "error": f"刊期 {issue.issue_code} 仓库库存 {issue.warehouse_stock} 不足"}

        if proc_item.approved_qty != 0:
            all_zero = False

    if all_zero:
        restock.status = RestockStatus.REJECTED
        restock.reject_reason = data.reject_reason or "全部明细审批为0"
    else:
        restock.status = RestockStatus.PROCESSING

    restock.process_time = datetime.utcnow()
    restock.processed_by = data.processed_by

    db.commit()
    db.refresh(restock)
    return {"success": True, "data": restock}


def _deduct_warehouse_stock(db: Session, issue_id: int, qty: int):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if issue:
        issue.warehouse_stock -= qty
        if issue.warehouse_stock < 0:
            issue.warehouse_stock = 0


def create_delivery_from_plan(db: Session, data: schemas.DeliveryPlanCreate) -> dict:
    delivery = Delivery(
        delivery_no=_generate_delivery_no(),
        route_code=data.route_code,
        driver_id=data.driver_id,
        status=DeliveryStatus.PLANNED,
        plan_date=data.plan_date
    )
    db.add(delivery)
    db.flush()

    for outlet_item in data.outlets:
        for restock_id in (outlet_item.restock_ids or []):
            restock = db.query(Restock).filter(Restock.id == restock_id).first()
            if not restock:
                continue
            outlet = db.query(Outlet).filter(Outlet.id == restock.outlet_id).first()
            for r_item in restock.items:
                if r_item.approved_qty <= 0:
                    continue
                d_item = DeliveryItem(
                    delivery_id=delivery.id,
                    outlet_id=restock.outlet_id,
                    issue_id=r_item.issue_id,
                    qty=r_item.approved_qty,
                    item_type="restock",
                    status=DeliveryStatusDetail.PENDING
                )
                db.add(d_item)
                _deduct_warehouse_stock(db, r_item.issue_id, r_item.approved_qty)
            restock.delivery_id = delivery.id
            restock.status = RestockStatus.SHIPPED

        for return_id in (outlet_item.return_ids or []):
            ret = db.query(Return).filter(Return.id == return_id).first()
            if not ret or ret.status != ReturnStatus.APPROVED:
                continue
            d_item = DeliveryItem(
                delivery_id=delivery.id,
                outlet_id=ret.outlet_id,
                issue_id=ret.issue_id,
                qty=ret.qty,
                item_type="return",
                status=DeliveryStatusDetail.PENDING
            )
            db.add(d_item)
            ret.delivery_id = delivery.id

    db.commit()
    db.refresh(delivery)
    return {"success": True, "data": delivery}


def update_delivery_status(db: Session, delivery_id: int, data: schemas.DeliveryUpdateStatus) -> dict:
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        return {"success": False, "error": "配送单不存在"}

    old_status = delivery.status
    delivery.status = data.status

    if data.status == DeliveryStatus.IN_TRANSIT and old_status in [DeliveryStatus.PLANNED, DeliveryStatus.LOADING]:
        delivery.depart_time = datetime.utcnow()

    if data.status == DeliveryStatus.COMPLETED:
        delivery.arrive_time = datetime.utcnow()
        for d_item in delivery.items:
            if d_item.status in [DeliveryStatusDetail.PENDING, DeliveryStatusDetail.LOADED]:
                d_item.status = DeliveryStatusDetail.DELIVERED
                d_item.signoff_time = datetime.utcnow()
            if d_item.item_type == "restock":
                update_inventory(db, d_item.outlet_id, d_item.issue_id, d_item.qty)
                restock = db.query(Restock).filter(Restock.delivery_id == delivery.id, Restock.outlet_id == d_item.outlet_id).first()
                if restock:
                    restock.status = RestockStatus.DELIVERED
            elif d_item.item_type == "return":
                ret = db.query(Return).filter(Return.delivery_id == delivery.id, Return.outlet_id == d_item.outlet_id, Return.issue_id == d_item.issue_id).first()
                if ret:
                    ret.status = ReturnStatus.DELIVERED
                    update_inventory(db, ret.outlet_id, ret.issue_id, -ret.qty)
                    issue = db.query(Issue).filter(Issue.id == ret.issue_id).first()
                    if issue:
                        issue.warehouse_stock += ret.qty

    if data.status == DeliveryStatus.FAILED:
        if not data.fail_reason:
            return {"success": False, "error": "配送单失败必须填写失败原因"}
        delivery.fail_reason = data.fail_reason
        for d_item in delivery.items:
            if d_item.status in [DeliveryStatusDetail.PENDING, DeliveryStatusDetail.LOADED]:
                d_item.status = DeliveryStatusDetail.FAILED
                d_item.fail_reason = data.fail_reason

    if data.status == DeliveryStatus.PARTIAL:
        if not data.fail_reason:
            return {"success": False, "error": "部分完成必须填写失败原因"}
        delivery.fail_reason = data.fail_reason

    db.commit()
    db.refresh(delivery)
    return {"success": True, "data": delivery}


def update_delivery_item(db: Session, item_id: int, data: schemas.DeliveryItemUpdate) -> dict:
    d_item = db.query(DeliveryItem).filter(DeliveryItem.id == item_id).first()
    if not d_item:
        return {"success": False, "error": "配送明细不存在"}

    d_item.status = data.status
    if data.status == DeliveryStatusDetail.FAILED:
        if not data.fail_reason:
            return {"success": False, "error": "配送失败必须填写原因"}
        d_item.fail_reason = data.fail_reason
    if data.status == DeliveryStatusDetail.DELIVERED:
        d_item.signoff_by = data.signoff_by
        d_item.signoff_time = datetime.utcnow()
        if d_item.item_type == "restock":
            update_inventory(db, d_item.outlet_id, d_item.issue_id, d_item.qty)
            restock = db.query(Restock).filter(
                Restock.delivery_id == d_item.delivery_id,
                Restock.outlet_id == d_item.outlet_id
            ).first()
            if restock:
                all_done = all(
                    di.status == DeliveryStatusDetail.DELIVERED
                    for di in db.query(DeliveryItem).filter(
                        DeliveryItem.delivery_id == d_item.delivery_id,
                        DeliveryItem.outlet_id == d_item.outlet_id,
                        DeliveryItem.item_type == "restock"
                    ).all()
                )
                if all_done:
                    restock.status = RestockStatus.DELIVERED
        elif d_item.item_type == "return":
            ret = db.query(Return).filter(
                Return.delivery_id == d_item.delivery_id,
                Return.outlet_id == d_item.outlet_id,
                Return.issue_id == d_item.issue_id
            ).first()
            if ret:
                ret.status = ReturnStatus.DELIVERED
                update_inventory(db, ret.outlet_id, ret.issue_id, -ret.qty)
                issue = db.query(Issue).filter(Issue.id == ret.issue_id).first()
                if issue:
                    issue.warehouse_stock += ret.qty

    db.commit()
    db.refresh(d_item)
    return {"success": True, "data": d_item}


def create_sale(db: Session, data: schemas.SaleCreate) -> dict:
    inv = db.query(Inventory).filter(
        Inventory.outlet_id == data.outlet_id,
        Inventory.issue_id == data.issue_id
    ).first()
    if not inv or inv.stock_qty < data.qty:
        return {
            "success": False,
            "error": f"库存不足，当前库存 {inv.stock_qty if inv else 0} 本"
        }
    sale = Sale(**data.model_dump())
    db.add(sale)
    update_inventory(db, data.outlet_id, data.issue_id, -data.qty)
    db.commit()
    db.refresh(sale)
    return {"success": True, "data": sale}


def create_complaint(db: Session, data: schemas.ComplaintCreate) -> dict:
    complaint = Complaint(
        complaint_no=_generate_complaint_no(),
        **data.model_dump(),
        status=ComplaintStatus.OPEN
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return {"success": True, "data": complaint}


def update_complaint(db: Session, complaint_id: int, data: schemas.ComplaintUpdate) -> dict:
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        return {"success": False, "error": "投诉不存在"}
    complaint.status = data.status
    if data.handler_id:
        complaint.handler_id = data.handler_id
    if data.resolution:
        complaint.resolution = data.resolution
    if data.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
        complaint.close_date = date.today()
    db.commit()
    db.refresh(complaint)
    return {"success": True, "data": complaint}


def get_route_today(db: Session, route_code: str, plan_date: Optional[date] = None) -> dict:
    plan_date = plan_date or date.today()
    delivery = db.query(Delivery).filter(
        Delivery.route_code == route_code,
        Delivery.plan_date == plan_date
    ).first()

    outlets = db.query(Outlet).filter(
        Outlet.route_code == route_code,
        Outlet.is_active == True
    ).all()

    if delivery:
        outlet_data = []
        seen_outlets = {}
        for d_item in delivery.items:
            oid = d_item.outlet_id
            if oid not in seen_outlets:
                o = db.query(Outlet).filter(Outlet.id == oid).first()
                seen_outlets[oid] = {
                    "outlet_id": oid,
                    "code": o.code if o else "",
                    "name": o.name if o else "",
                    "address": o.address if o else "",
                    "restock_items": [],
                    "return_items": []
                }
            item_info = {
                "item_id": d_item.id,
                "issn": d_item.issue.publication.issn if d_item.issue and d_item.issue.publication else "",
                "pub_name": d_item.issue.publication.name if d_item.issue and d_item.issue.publication else "",
                "issue_code": d_item.issue.issue_code if d_item.issue else "",
                "qty": d_item.qty,
                "status": d_item.status.value
            }
            if d_item.item_type == "restock":
                seen_outlets[oid]["restock_items"].append(item_info)
            else:
                seen_outlets[oid]["return_items"].append(item_info)
        outlet_data = list(seen_outlets.values())
    else:
        pending_restocks = db.query(Restock).filter(
            Restock.status.in_([RestockStatus.PROCESSING, RestockStatus.SHIPPED]),
            Restock.apply_date == plan_date
        ).all()
        pending_returns = db.query(Return).filter(
            Return.status == ReturnStatus.APPROVED,
            Return.apply_date == plan_date
        ).all()
        outlet_data = []
        for o in outlets:
            o_restocks = [r for r in pending_restocks if r.outlet_id == o.id]
            o_returns = [r for r in pending_returns if r.outlet_id == o.id]
            if not o_restocks and not o_returns:
                continue
            entry = {
                "outlet_id": o.id,
                "code": o.code,
                "name": o.name,
                "address": o.address,
                "restock_items": [],
                "return_items": []
            }
            for rk in o_restocks:
                for it in rk.items:
                    if it.approved_qty > 0:
                        entry["restock_items"].append({
                            "restock_id": rk.id,
                            "issn": it.issue.publication.issn if it.issue and it.issue.publication else "",
                            "pub_name": it.issue.publication.name if it.issue and it.issue.publication else "",
                            "issue_code": it.issue.issue_code if it.issue else "",
                            "qty": it.approved_qty
                        })
            for rt in o_returns:
                entry["return_items"].append({
                    "return_id": rt.id,
                    "issn": rt.issue.publication.issn if rt.issue and rt.issue.publication else "",
                    "pub_name": rt.issue.publication.name if rt.issue and rt.issue.publication else "",
                    "issue_code": rt.issue.issue_code if rt.issue else "",
                    "qty": rt.qty
                })
            outlet_data.append(entry)

    return {
        "route_code": route_code,
        "plan_date": plan_date,
        "outlet_count": len(outlet_data),
        "delivery_id": delivery.id if delivery else None,
        "delivery_status": delivery.status.value if delivery else None,
        "outlets": outlet_data
    }


def report_complaints(db: Session, start_date: date, end_date: date) -> List[dict]:
    rows = db.query(Complaint, Outlet).join(
        Outlet, Complaint.outlet_id == Outlet.id
    ).filter(
        Complaint.reported_date >= start_date,
        Complaint.reported_date <= end_date
    ).all()

    result = []
    for c, o in rows:
        days_open = (date.today() - c.reported_date).days
        if c.close_date:
            days_open = (c.close_date - c.reported_date).days
        result.append({
            "complaint_no": c.complaint_no,
            "outlet_code": o.code,
            "outlet_name": o.name,
            "complaint_type": c.complaint_type,
            "description": c.description,
            "status": c.status.value,
            "reported_date": c.reported_date.isoformat(),
            "days_open": days_open
        })
    return result


def report_return_rate(db: Session, start_date: date, end_date: date) -> List[dict]:
    issues = db.query(Issue).filter(
        Issue.publish_date >= start_date,
        Issue.publish_date <= end_date
    ).all()

    result = []
    for issue in issues:
        pub = issue.publication
        total_sold = db.query(func.coalesce(func.sum(Sale.qty), 0)).filter(Sale.issue_id == issue.id).scalar()
        total_returned = db.query(func.coalesce(func.sum(Return.qty), 0)).filter(
            Return.issue_id == issue.id,
            Return.status == ReturnStatus.DELIVERED
        ).scalar()
        total_distributed = issue.total_printed - issue.warehouse_stock if issue.total_printed else (total_sold + total_returned)
        return_rate = (total_returned / total_distributed * 100) if total_distributed > 0 else 0.0
        result.append({
            "publication_issn": pub.issn if pub else "",
            "publication_name": pub.name if pub else "",
            "issue_code": issue.issue_code,
            "publish_date": issue.publish_date.isoformat(),
            "total_sold": total_sold,
            "total_returned": total_returned,
            "total_distributed": total_distributed,
            "return_rate": round(return_rate, 2)
        })
    return result


def report_response_time(db: Session, start_date: date, end_date: date) -> List[dict]:
    restocks = db.query(Restock).filter(
        Restock.apply_date >= start_date,
        Restock.apply_date <= end_date
    ).all()

    result = []
    for r in restocks:
        outlet = r.outlet
        response_minutes = None
        if r.process_time and r.apply_time:
            delta = r.process_time - r.apply_time
            response_minutes = round(delta.total_seconds() / 60, 1)
        result.append({
            "restock_no": r.restock_no,
            "outlet_code": outlet.code if outlet else "",
            "outlet_name": outlet.name if outlet else "",
            "apply_time": r.apply_time.isoformat() if r.apply_time else None,
            "process_time": r.process_time.isoformat() if r.process_time else None,
            "response_minutes": response_minutes,
            "status": r.status.value
        })
    return result


def monthly_unsold(db: Session, year: int, month: int) -> List[dict]:
    from datetime import date as d
    start_date = d(year, month, 1)
    if month == 12:
        end_date = d(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = d(year, month + 1, 1) - timedelta(days=1)

    issues = db.query(Issue).filter(
        Issue.publish_date >= start_date,
        Issue.publish_date <= end_date
    ).all()

    result = []
    for issue in issues:
        pub = issue.publication
        total_sold = db.query(func.coalesce(func.sum(Sale.qty), 0)).filter(Sale.issue_id == issue.id).scalar()
        total_returned = db.query(func.coalesce(func.sum(Return.qty), 0)).filter(
            Return.issue_id == issue.id,
            Return.status == ReturnStatus.DELIVERED
        ).scalar()
        unsold_qty = issue.total_printed - total_sold if issue.total_printed else total_returned
        unsold_amount = unsold_qty * (pub.price if pub else 0)
        result.append({
            "publication_issn": pub.issn if pub else "",
            "publication_name": pub.name if pub else "",
            "issue_code": issue.issue_code,
            "publish_date": issue.publish_date.isoformat(),
            "total_printed": issue.total_printed,
            "total_sold": total_sold,
            "total_returned": total_returned,
            "unsold_qty": unsold_qty,
            "unsold_amount": round(unsold_amount, 2),
            "category": pub.category if pub else ""
        })
    return result


def get_print_data(db: Session, delivery_id: int) -> dict:
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        return {"success": False, "error": "配送单不存在"}

    groups = {}
    for d_item in delivery.items:
        key = d_item.outlet_id
        if key not in groups:
            o = db.query(Outlet).filter(Outlet.id == key).first()
            groups[key] = {
                "outlet_id": key,
                "code": o.code if o else "",
                "name": o.name if o else "",
                "address": o.address if o else "",
                "owner": o.owner.name if o and o.owner else "",
                "owner_phone": o.owner.phone if o and o.owner else "",
                "restocks": [],
                "returns": [],
                "restock_total": 0,
                "return_total": 0
            }
        pub_name = d_item.issue.publication.name if d_item.issue and d_item.issue.publication else ""
        issn = d_item.issue.publication.issn if d_item.issue and d_item.issue.publication else ""
        entry = {
            "id": d_item.id,
            "issn": issn,
            "publication_name": pub_name,
            "issue_code": d_item.issue.issue_code if d_item.issue else "",
            "qty": d_item.qty,
            "signoff": ""
        }
        if d_item.item_type == "restock":
            groups[key]["restocks"].append(entry)
            groups[key]["restock_total"] += d_item.qty
        else:
            groups[key]["returns"].append(entry)
            groups[key]["return_total"] += d_item.qty

    outlet_list = sorted(groups.values(), key=lambda x: x["code"])
    total_restock = sum(o["restock_total"] for o in outlet_list)
    total_return = sum(o["return_total"] for o in outlet_list)

    return {
        "success": True,
        "data": {
            "delivery_no": delivery.delivery_no,
            "route_code": delivery.route_code,
            "plan_date": delivery.plan_date.isoformat(),
            "driver": delivery.driver.name if delivery.driver else "",
            "driver_phone": delivery.driver.phone if delivery.driver else "",
            "outlet_count": len(outlet_list),
            "total_restock": total_restock,
            "total_return": total_return,
            "outlets": outlet_list
        }
    }


def get_owner_progress(db: Session, owner_id: int) -> dict:
    outlets = db.query(Outlet).filter(Outlet.owner_id == owner_id).all()
    outlet_ids = [o.id for o in outlets]

    if not outlet_ids:
        return {"outlets": [], "restocks": [], "returns": [], "complaints": []}

    restocks = db.query(Restock).filter(Restock.outlet_id.in_(outlet_ids)).order_by(
        Restock.apply_time.desc()
    ).limit(50).all()

    returns = db.query(Return).filter(Return.outlet_id.in_(outlet_ids)).order_by(
        Return.apply_date.desc()
    ).limit(50).all()

    complaints = db.query(Complaint).filter(Complaint.outlet_id.in_(outlet_ids)).order_by(
        Complaint.reported_date.desc()
    ).limit(50).all()

    return {
        "outlets": [{"id": o.id, "code": o.code, "name": o.name, "address": o.address} for o in outlets],
        "restocks": [{
            "id": r.id,
            "restock_no": r.restock_no,
            "status": r.status.value,
            "apply_date": r.apply_date.isoformat(),
            "apply_time": r.apply_time.isoformat() if r.apply_time else None,
            "process_time": r.process_time.isoformat() if r.process_time else None,
            "delivery_id": r.delivery_id,
            "outlet_name": r.outlet.name if r.outlet else "",
            "item_count": len(r.items),
            "total_qty": sum(it.request_qty for it in r.items),
            "approved_qty": sum(it.approved_qty for it in r.items)
        } for r in restocks],
        "returns": [{
            "id": r.id,
            "status": r.status.value,
            "apply_date": r.apply_date.isoformat(),
            "qty": r.qty,
            "process_date": r.process_date.isoformat() if r.process_date else None,
            "reject_reason": r.reject_reason,
            "outlet_name": r.outlet.name if r.outlet else "",
            "issn": r.issue.publication.issn if r.issue and r.issue.publication else "",
            "publication_name": r.issue.publication.name if r.issue and r.issue.publication else "",
            "issue_code": r.issue.issue_code if r.issue else ""
        } for r in returns],
        "complaints": [{
            "id": c.id,
            "complaint_no": c.complaint_no,
            "complaint_type": c.complaint_type,
            "status": c.status.value,
            "reported_date": c.reported_date.isoformat(),
            "description": c.description,
            "resolution": c.resolution,
            "close_date": c.close_date.isoformat() if c.close_date else None,
            "outlet_name": c.outlet.name if c.outlet else ""
        } for c in complaints]
    }
