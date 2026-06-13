#!/usr/bin/env python3
"""状态流转保护 + 加急抢占逻辑 单元测试"""
import sys
from database import SessionLocal, Base, engine
import models, schemas, crud
from models import BagStatus, BloodType, BloodComponent, UrgencyLevel
from datetime import date, timedelta, datetime

Base.metadata.create_all(bind=engine)
db = SessionLocal()

for t in [models.RejectionRecord, models.IssueRecord, models.AppointmentItem, models.Appointment, models.BloodBag]:
    db.query(t).delete()
db.commit()

today = date.today()
PASS = 0
FAIL = 0

def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  OK  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}  {detail}")

bags_data = [
    ("A-PLT-001", BloodType.A_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=1)),
    ("A-PLT-002", BloodType.A_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=2)),
    ("A-PLT-003", BloodType.A_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=3)),
    ("A-PLT-004", BloodType.A_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=5)),
    ("A-PLT-005", BloodType.A_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=7)),
    ("B-PLT-001", BloodType.B_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=1)),
    ("B-PLT-002", BloodType.B_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=2)),
    ("B-PLT-003", BloodType.B_POSITIVE, BloodComponent.PLATELETS, 200, today+timedelta(days=4)),
]
for code, bt, bc, vol, exp in bags_data:
    db.add(models.BloodBag(
        bag_code=code, blood_type=bt, component=bc, volume_ml=vol,
        donation_date=today, expiration_date=exp,
        storage_location="test", status=BagStatus.AVAILABLE
    ))
db.commit()
print(f"=== 初始化: {len(bags_data)} 袋测试血样 ===\n")

# === 1. 状态流转保护 ===
print("--- 1. PATCH 状态流转保护 ---")
bag_test = crud.get_blood_bag_by_code(db, "A-PLT-005")

bag, err = crud.update_blood_bag(db, bag_test.id, schemas.BloodBagUpdate(status=BagStatus.RESERVED))
check("available -> reserved (合法)", bag is not None)

bag, err = crud.update_blood_bag(db, bag_test.id, schemas.BloodBagUpdate(status=BagStatus.AVAILABLE))
check("reserved -> available (合法)", bag is not None)

bag, err = crud.update_blood_bag(db, bag_test.id, schemas.BloodBagUpdate(status=BagStatus.ISSUED))
check("available -> issued (合法)", bag is not None)

bag, err = crud.update_blood_bag(db, bag_test.id, schemas.BloodBagUpdate(status=BagStatus.AVAILABLE))
check("issued -> available (非法,拒绝)", bag is None and err is not None)

bag, err = crud.update_blood_bag(db, bag_test.id, schemas.BloodBagUpdate(status=BagStatus.RESERVED))
check("issued -> reserved (非法,拒绝)", bag is None and err is not None)

bag_dmg = models.BloodBag(
    bag_code="TEST-DMG", blood_type=BloodType.A_POSITIVE, component=BloodComponent.PLATELETS,
    volume_ml=200, donation_date=today, expiration_date=today+timedelta(days=10),
    storage_location="test", status=BagStatus.AVAILABLE
)
db.add(bag_dmg); db.commit(); db.refresh(bag_dmg)
crud.update_blood_bag(db, bag_dmg.id, schemas.BloodBagUpdate(status=BagStatus.DAMAGED))
bag, err = crud.update_blood_bag(db, bag_dmg.id, schemas.BloodBagUpdate(status=BagStatus.AVAILABLE))
check("damaged -> available (非法,拒绝)", bag is None and err is not None)

# === 2. 可用池排除终态 ===
print("\n--- 2. 可用池不包含终态血袋 ---")
avail = crud.get_available_bags(db, BloodType.A_POSITIVE, BloodComponent.PLATELETS)
codes = [b.bag_code for b in avail]
check("已发放 A-PLT-005 不在可用池", "A-PLT-005" not in codes)
check("已损坏 TEST-DMG 不在可用池", "TEST-DMG" not in codes)
check("正常 A-PLT-001 在可用池", "A-PLT-001" in codes)
check("正常 A-PLT-002 在可用池", "A-PLT-002" in codes)

cnt = crud.count_available_bags(db, BloodType.A_POSITIVE, BloodComponent.PLATELETS)
check(f"可用计数={cnt} (应为4)", cnt == 4)

# === 3. 普通预约 FIFO ===
print("\n--- 3. 普通预约 按有效期FIFO锁定 ---")
appt_normal = schemas.AppointmentCreate(
    hospital="市一院普通科",
    blood_type=BloodType.A_POSITIVE,
    component=BloodComponent.PLATELETS,
    quantity=3,
    appointment_time=datetime.now() + timedelta(hours=3),
    urgency=UrgencyLevel.NORMAL,
    receiver_name="陈医生",
    receiver_phone="13800000001"
)
appt1, ok, preempts = crud.create_appointment(db, appt_normal)
items = [i for i in appt1.items if i.status.value == "reserved"]
bag_codes = [crud.get_blood_bag(db, i.blood_bag_id).bag_code for i in items]
check(f"锁定 {len(items)} 袋", len(items) == 3)

expected_order = ["A-PLT-001", "A-PLT-002", "A-PLT-003"]
check("按有效期从近到远(FIFO)", bag_codes == expected_order, f"实际={bag_codes}")
print(f"    锁定顺序: {bag_codes}")

# === 4. 急诊抢占普通预约快过期血袋 ===
print("\n--- 4. 急诊抢占普通预约的快过期血袋 ---")
appt_emergency = schemas.AppointmentCreate(
    hospital="省急救中心ICU",
    blood_type=BloodType.A_POSITIVE,
    component=BloodComponent.PLATELETS,
    quantity=3,
    appointment_time=datetime.now(),
    urgency=UrgencyLevel.EMERGENCY,
    receiver_name="赵主任",
    receiver_phone="13900000099"
)
appt2, ok2, preempts2 = crud.create_appointment(db, appt_emergency)
items2 = [i for i in appt2.items if i.status.value == "reserved"]
bag_codes2 = [crud.get_blood_bag(db, i.blood_bag_id).bag_code for i in items2]
print(f"    急诊申请3袋，实际锁定 {len(items2)} 袋: {bag_codes2}")
print(f"    抢占记录数: {len(preempts2)}")

db.refresh(appt1)
items1_now = [i for i in appt1.items if i.status.value == "reserved"]
print(f"    原普通预约现剩锁定: {len(items1_now)} 袋, 状态: {appt1.status.value}")

check("急诊锁定了血袋", len(items2) >= 1)
check("急诊抢占了普通预约的快过期血袋", len(preempts2) >= 1, f"抢占数={len(preempts2)}")

if preempts2:
    days = [p["days_to_expiry"] for p in preempts2]
    check("仅抢占 <=2天 快过期血袋", all(d <= 2 for d in days), f"days={days}")

check("原普通预约状态已调整",
      appt1.status.value in ("partial_fulfilled", "pending"))

# === 5. 同等级不互相抢占 ===
print("\n--- 5. 同等级预约不互相抢占 ---")
e1, _, _ = crud.create_appointment(db, schemas.AppointmentCreate(
    hospital="急诊A院", blood_type=BloodType.B_POSITIVE, component=BloodComponent.PLATELETS,
    quantity=2, appointment_time=datetime.now(), urgency=UrgencyLevel.EMERGENCY,
    receiver_name="EA", receiver_phone="1"
))
e1_codes = [crud.get_blood_bag(db, i.blood_bag_id).bag_code for i in e1.items if i.status.value == "reserved"]
print(f"    急诊A锁定: {e1_codes}")

e2, _, _ = crud.create_appointment(db, schemas.AppointmentCreate(
    hospital="急诊B院", blood_type=BloodType.B_POSITIVE, component=BloodComponent.PLATELETS,
    quantity=2, appointment_time=datetime.now(), urgency=UrgencyLevel.EMERGENCY,
    receiver_name="EB", receiver_phone="2"
))
e2_codes = [crud.get_blood_bag(db, i.blood_bag_id).bag_code for i in e2.items if i.status.value == "reserved"]
print(f"    急诊B锁定: {e2_codes}")

overlap = set(e1_codes) & set(e2_codes)
check("两急诊无重叠血袋 (不互相抢占)", len(overlap) == 0)

# === 6. 发放后状态不可逆 ===
print("\n--- 6. 发放后血袋不可逆 + 不进预约池 ---")
issue_bag_id = e1.items[0].blood_bag_id
records = crud.issue_blood_bags(db, e1.id, [issue_bag_id], schemas.IssueCreate(
    appointment_id=e1.id, blood_bag_ids=[issue_bag_id],
    receiver_name="张", receiver_phone="111",
    cold_chain_actual_time=datetime.now(),
    operator="测试"
))
check("发放成功", len(records) == 1)

issued_bag = crud.get_blood_bag(db, issue_bag_id)
check("发放后状态=issued", issued_bag.status == BagStatus.ISSUED)

bag, err = crud.update_blood_bag(db, issue_bag_id, schemas.BloodBagUpdate(status=BagStatus.AVAILABLE))
check("已发放->available 被拒绝", bag is None and err is not None)

avail_b = crud.get_available_bags(db, BloodType.B_POSITIVE, BloodComponent.PLATELETS)
avail_b_codes = [b.bag_code for b in avail_b]
check("已发放血袋不在可用池", issued_bag.bag_code not in avail_b_codes)

# === 7. 视图接口冒烟 ===
print("\n--- 7. 各角色视图冒烟测试 ---")
expiry_risk = crud.get_expiry_risk_bags(db, days_threshold=3)
check("过期风险列表可用", len(expiry_risk) >= 0)

urgent_data = crud.get_urgent_usage(db)
check("加急占用统计可用", "emergency_count" in urgent_data)
check(f"急诊单 {urgent_data['emergency_count']} 个 (>=2)", urgent_data["emergency_count"] >= 2)

rejected = crud.get_rejected_appointments(db)
check("被驳回列表可用", isinstance(rejected, list))

hp = crud.get_pending_by_hospital(db)
check("按医院待取可用", hp["total_pending"] >= 0)

rem = crud.get_reminder_list(db, overdue_minutes=0)
check("催缴清单可用", rem["total"] >= 0)

issue_records = crud.list_issue_records(db)
check("发放记录列表可用", len(issue_records) >= 1)

# === 总结 ===
print(f"\n{'='*55}")
print(f"结果: {PASS} 通过 / {FAIL} 失败 / 共 {PASS+FAIL} 项")
print(f"{'='*55}")

db.close()
sys.exit(0 if FAIL == 0 else 1)
