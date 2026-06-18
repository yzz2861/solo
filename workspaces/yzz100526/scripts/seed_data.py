import sys
import os
from datetime import date, timedelta, datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, SessionLocal
from app.models.models import (
    User, Outlet, Publication, Issue, Inventory, Sale, Return,
    Restock, RestockItem, Delivery, DeliveryItem, Complaint,
    UserRole, ReturnStatus, RestockStatus, DeliveryStatus,
    DeliveryStatusDetail, ComplaintStatus
)
from app.schemas import schemas
from app.services import business


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = _seed_users(db)
        outlets = _seed_outlets(db, users)
        pubs, issues = _seed_publications(db)
        _seed_inventories(db, outlets, issues)
        _seed_sales(db, outlets, issues, users)
        returns = _seed_returns(db, outlets, issues)
        restocks = _seed_restocks(db, outlets, issues)
        deliveries = _seed_deliveries(db, outlets, issues, restocks, returns, users)
        _seed_complaints(db, outlets, issues, restocks, users)
        db.commit()
        print("✅ 示例数据初始化完成！")
        print(f"   用户: {len(users)}  |  网点: {len(outlets)}  |  刊物: {len(pubs)}  |  刊期: {len(issues)}")
        print(f"   退刊: {db.query(Return).count()}  |  补货申请: {db.query(Restock).count()}  |  配送单: {len(deliveries)}")
        print(f"   投诉: {db.query(Complaint).count()}  |  销量: {db.query(Sale).count()}")
    except Exception as e:
        db.rollback()
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def _seed_users(db):
    users_data = [
        {"name": "张建国", "phone": "13800000001", "role": UserRole.OWNER},
        {"name": "李秀英", "phone": "13800000002", "role": UserRole.OWNER},
        {"name": "王志强", "phone": "13800000003", "role": UserRole.OWNER},
        {"name": "赵美华", "phone": "13800000004", "role": UserRole.OWNER},
        {"name": "陈德明", "phone": "13800000005", "role": UserRole.OWNER},
        {"name": "刘发行", "phone": "13900000001", "role": UserRole.DISPATCHER},
        {"name": "周主管", "phone": "13900000002", "role": UserRole.MANAGER},
        {"name": "吴配送", "phone": "13900000003", "role": UserRole.DRIVER},
        {"name": "郑配送", "phone": "13900000004", "role": UserRole.DRIVER},
    ]
    users = []
    for u in users_data:
        user = User(**u)
        db.add(user)
        db.flush()
        users.append(user)
    return users


def _seed_outlets(db, users):
    owners = [u for u in users if u.role == UserRole.OWNER]
    outlets_data = [
        {"code": "WD-A001", "name": "朝阳门东大街亭", "address": "朝阳区朝阳门东大街12号", "district": "朝阳区", "route_code": "R-001", "owner_idx": 0},
        {"code": "WD-A002", "name": "国贸地铁站亭", "address": "朝阳区国贸地铁站B口", "district": "朝阳区", "route_code": "R-001", "owner_idx": 1},
        {"code": "WD-A003", "name": "三里屯SOHO亭", "address": "朝阳区三里屯SOHO广场南侧", "district": "朝阳区", "route_code": "R-001", "owner_idx": 2},
        {"code": "WD-B001", "name": "西单大悦城亭", "address": "西城区西单北大街131号", "district": "西城区", "route_code": "R-002", "owner_idx": 3},
        {"code": "WD-B002", "name": "金融街中心亭", "address": "西城区金融大街7号", "district": "西城区", "route_code": "R-002", "owner_idx": 4},
        {"code": "WD-C001", "name": "中关村南大街亭", "address": "海淀区中关村南大街5号", "district": "海淀区", "route_code": "R-003", "owner_idx": 0},
        {"code": "WD-C002", "name": "北京大学东门亭", "address": "海淀区颐和园路5号东门", "district": "海淀区", "route_code": "R-003", "owner_idx": 1},
    ]
    outlets = []
    for o in outlets_data:
        owner = owners[o["owner_idx"]]
        outlet = Outlet(
            code=o["code"], name=o["name"], address=o["address"],
            district=o["district"], route_code=o["route_code"],
            owner_id=owner.id, is_active=True
        )
        db.add(outlet)
        db.flush()
        outlets.append(outlet)
    return outlets


def _seed_publications(db):
    today = date.today()
    pubs_data = [
        {"issn": "1002-2759", "name": "读者", "category": "文学文摘", "is_hot": True, "price": 9.0},
        {"issn": "1003-126X", "name": "青年文摘", "category": "文学文摘", "is_hot": True, "price": 8.0},
        {"issn": "1009-5241", "name": "三联生活周刊", "category": "新闻时政", "is_hot": True, "price": 18.0},
        {"issn": "1005-3603", "name": "财经", "category": "财经商业", "is_hot": True, "price": 30.0},
        {"issn": "1001-0114", "name": "时尚", "category": "时尚生活", "is_hot": False, "price": 25.0},
        {"issn": "1006-1169", "name": "计算机世界", "category": "科技数码", "is_hot": False, "price": 12.0},
        {"issn": "1000-002X", "name": "大众电影", "category": "娱乐影视", "is_hot": False, "price": 15.0},
        {"issn": "1002-4964", "name": "中国国家地理", "category": "地理旅游", "is_hot": True, "price": 28.0},
    ]
    pubs = []
    issues = []
    for idx, p in enumerate(pubs_data):
        pub = Publication(**p)
        db.add(pub)
        db.flush()
        pubs.append(pub)

        for m in range(1, 6):
            pub_date = date(today.year, m, 1)
            return_deadline = pub_date + timedelta(days=15 + (idx % 3) * 5)
            total = 500 + idx * 100
            issue = Issue(
                publication_id=pub.id,
                issue_code=f"{pub_date.year}-{m:02d}",
                publish_date=pub_date,
                return_deadline=return_deadline,
                total_printed=total,
                warehouse_stock=total // 5
            )
            db.add(issue)
            db.flush()
            issues.append(issue)
    return pubs, issues


def _seed_inventories(db, outlets, issues):
    import random
    random.seed(42)
    for outlet in outlets:
        for issue in issues[-16:]:
            if random.random() < 0.45:
                qty = random.randint(2, 35)
                inv = Inventory(outlet_id=outlet.id, issue_id=issue.id, stock_qty=qty)
                db.add(inv)


def _seed_sales(db, outlets, issues, users):
    import random
    random.seed(100)
    owners = [u for u in users if u.role == UserRole.OWNER]
    today = date.today()
    for _ in range(80):
        outlet = random.choice(outlets)
        issue = random.choice(issues[-16:])
        sdate = today - timedelta(days=random.randint(0, 12))
        qty = random.randint(1, 12)
        sale = Sale(
            outlet_id=outlet.id, issue_id=issue.id,
            sale_date=sdate, qty=qty,
            reported_at=datetime.combine(sdate, datetime.min.time()) + timedelta(hours=random.randint(8, 20)),
            reporter_id=random.choice(owners).id,
            notes=None if random.random() > 0.2 else "周末高峰"
        )
        db.add(sale)
        db.flush()
        business.update_inventory(db, outlet.id, issue.id, -qty)


def _seed_returns(db, outlets, issues):
    import random
    random.seed(200)
    today = date.today()
    returns = []
    for i, outlet in enumerate(outlets):
        for issue in issues[-16:-8]:
            if random.random() < 0.35:
                deadline_passed = business.is_return_deadline_passed(issue, today)
                if deadline_passed:
                    continue
                qty = random.randint(2, 18)
                ret = Return(
                    outlet_id=outlet.id, issue_id=issue.id, qty=qty,
                    status=random.choice([ReturnStatus.PENDING, ReturnStatus.APPROVED, ReturnStatus.DELIVERED]),
                    apply_date=today - timedelta(days=random.randint(0, 8))
                )
                if ret.status in [ReturnStatus.APPROVED, ReturnStatus.DELIVERED]:
                    ret.process_date = ret.apply_date + timedelta(days=1)
                    ret.processed_by = [u.id for u in users_ if u.role == UserRole.MANAGER][0] \
                        if (users_ := db.query(User).all()) else None
                if ret.status == ReturnStatus.DELIVERED:
                    business.update_inventory(db, outlet.id, issue.id, -qty)
                    issue.warehouse_stock += qty
                returns.append(ret)
                db.add(ret)
    return returns


def _seed_restocks(db, outlets, issues):
    import random
    random.seed(300)
    today = date.today()
    restocks = []
    for i, outlet in enumerate(outlets):
        n = random.randint(1, 3)
        for j in range(n):
            statuses = [
                RestockStatus.PENDING, RestockStatus.PROCESSING,
                RestockStatus.SHIPPED, RestockStatus.DELIVERED, RestockStatus.REJECTED
            ]
            status = random.choice(statuses)
            items = random.sample(issues[-10:], random.randint(2, 5))
            restock = Restock(
                restock_no=business._generate_restock_no(),
                outlet_id=outlet.id, status=status,
                urgency=random.choice(["normal", "normal", "urgent"]),
                apply_date=today - timedelta(days=random.randint(0, 5)),
                apply_time=datetime.utcnow() - timedelta(days=random.randint(0, 5), hours=random.randint(1, 10)),
                owner_remark=None if random.random() > 0.3 else "杂志快卖完了，麻烦尽快送"
            )
            db.add(restock)
            db.flush()

            for issue in items:
                req = random.randint(5, 25)
                item = RestockItem(restock_id=restock.id, issue_id=issue.id, request_qty=req)
                if status != RestockStatus.PENDING:
                    if status == RestockStatus.REJECTED:
                        item.approved_qty = 0
                    else:
                        approved = req if random.random() > 0.2 else req - random.randint(2, 8)
                        item.approved_qty = max(approved, 0)
                        if approved < req:
                            item.shortage_reason = "仓库库存紧张，部分分配"
                db.add(item)

            if status in [RestockStatus.PROCESSING, RestockStatus.SHIPPED, RestockStatus.DELIVERED, RestockStatus.REJECTED]:
                restock.process_time = restock.apply_time + timedelta(hours=random.randint(1, 8))
                managers = [u for u in db.query(User).all() if u.role == UserRole.MANAGER]
                restock.processed_by = managers[0].id if managers else None
                if status == RestockStatus.REJECTED:
                    restock.reject_reason = "当期刊已售罄，请申请下期"

            restocks.append(restock)
    return restocks


def _seed_deliveries(db, outlets, issues, restocks, returns, users):
    import random
    random.seed(400)
    today = date.today()
    drivers = [u for u in users if u.role == UserRole.DRIVER]
    deliveries = []

    routes = {}
    for r in restocks:
        if r.status in [RestockStatus.SHIPPED, RestockStatus.DELIVERED]:
            outlet = db.query(Outlet).filter(Outlet.id == r.outlet_id).first()
            rc = outlet.route_code
            routes.setdefault((rc, r.apply_date), {"restocks": [], "returns": []})
            routes[(rc, r.apply_date)]["restocks"].append(r)

    for (rc, pdate), payload in list(routes.items())[:4]:
        driver = random.choice(drivers)
        status = random.choice([DeliveryStatus.PLANNED, DeliveryStatus.IN_TRANSIT, DeliveryStatus.COMPLETED, DeliveryStatus.FAILED])
        delivery = Delivery(
            delivery_no=business._generate_delivery_no(),
            route_code=rc, driver_id=driver.id,
            status=status, plan_date=pdate or today
        )
        if status == DeliveryStatus.IN_TRANSIT:
            delivery.depart_time = datetime.utcnow() - timedelta(hours=random.randint(1, 3))
        if status == DeliveryStatus.COMPLETED:
            delivery.depart_time = datetime.utcnow() - timedelta(hours=random.randint(3, 6))
            delivery.arrive_time = datetime.utcnow() - timedelta(hours=random.randint(0, 2))
        if status == DeliveryStatus.FAILED:
            delivery.fail_reason = "恶劣天气影响配送"
        db.add(delivery)
        db.flush()

        restock_list = payload["restocks"]
        for r in restock_list:
            r.delivery_id = delivery.id
            outlet = db.query(Outlet).filter(Outlet.id == r.outlet_id).first()
            for ritem in r.items:
                if ritem.approved_qty <= 0:
                    continue
                ditem = DeliveryItem(
                    delivery_id=delivery.id, outlet_id=r.outlet_id,
                    issue_id=ritem.issue_id, qty=ritem.approved_qty,
                    item_type="restock"
                )
                if status == DeliveryStatus.COMPLETED:
                    ditem.status = DeliveryStatusDetail.DELIVERED
                    ditem.signoff_by = outlet.owner.name if outlet.owner else "签收"
                    ditem.signoff_time = delivery.arrive_time
                    business.update_inventory(db, r.outlet_id, ritem.issue_id, ritem.approved_qty)
                    issue = db.query(Issue).filter(Issue.id == ritem.issue_id).first()
                    if issue:
                        issue.warehouse_stock -= ritem.approved_qty
                elif status == DeliveryStatus.FAILED:
                    ditem.status = DeliveryStatusDetail.FAILED
                    ditem.fail_reason = "恶劣天气影响配送"
                elif status == DeliveryStatus.IN_TRANSIT:
                    ditem.status = DeliveryStatusDetail.LOADED
                db.add(ditem)
            if status == DeliveryStatus.COMPLETED:
                r.status = RestockStatus.DELIVERED

        approved_returns = [r for r in returns if r.status == ReturnStatus.APPROVED and
                            db.query(Outlet).filter(Outlet.id == r.outlet_id).first().route_code == rc]
        for r in approved_returns[:3]:
            ditem = DeliveryItem(
                delivery_id=delivery.id, outlet_id=r.outlet_id,
                issue_id=r.issue_id, qty=r.qty, item_type="return"
            )
            if status == DeliveryStatus.COMPLETED:
                ditem.status = DeliveryStatusDetail.DELIVERED
                ditem.signoff_time = delivery.arrive_time
                r.status = ReturnStatus.DELIVERED
                business.update_inventory(db, r.outlet_id, r.issue_id, -r.qty)
                issue = db.query(Issue).filter(Issue.id == r.issue_id).first()
                if issue:
                    issue.warehouse_stock += r.qty
            elif status == DeliveryStatus.FAILED:
                ditem.status = DeliveryStatusDetail.FAILED
                ditem.fail_reason = "恶劣天气影响配送"
            db.add(ditem)
            r.delivery_id = delivery.id

        deliveries.append(delivery)
    return deliveries


def _seed_complaints(db, outlets, issues, restocks, users):
    import random
    random.seed(500)
    today = date.today()
    managers = [u for u in users if u.role == UserRole.MANAGER]
    owners = [u for u in users if u.role == UserRole.OWNER]
    types = ["缺刊投诉", "漏送投诉", "配送延迟", "退刊被拒", "其他"]
    for i in range(8):
        outlet = random.choice(outlets)
        rstock = random.choice(restocks) if restocks and random.random() > 0.3 else None
        status = random.choice([ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
        complaint = Complaint(
            complaint_no=business._generate_complaint_no(),
            outlet_id=outlet.id,
            complaint_type=random.choice(types),
            description="亭主反馈：" + random.choice([
                "上周订的杂志到现在还没送到，已经断货3天了",
                "补货单上写15本只送到8本，其余7本没着落",
                "周三申请的补刊，今天周六了还没消息",
                "退刊申请被拒绝，距离退刊截止还有5天呢"
            ]),
            status=status,
            issue_id=random.choice(issues).id if random.random() > 0.3 else None,
            restock_id=rstock.id if rstock else None,
            reported_date=today - timedelta(days=random.randint(0, 10)),
            reported_by=random.choice(owners).id
        )
        if status != ComplaintStatus.OPEN:
            complaint.handler_id = managers[0].id
        if status in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            complaint.resolution = random.choice([
                "已安排加急配送，预计明天送达",
                "退刊申请已重新审核通过，请等待下次配送收回",
                "仓库已查到漏发，随今日配送补送"
            ])
            complaint.close_date = complaint.reported_date + timedelta(days=random.randint(1, 3))
        db.add(complaint)


if __name__ == "__main__":
    seed()
