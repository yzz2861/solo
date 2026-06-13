#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"


def print_separator(title=""):
    print("\n" + "=" * 65)
    if title:
        print(f"  {title}")
        print("=" * 65)


def assert_status(desc, actual, expected):
    status = "✓" if actual == expected else "✗"
    print(f"  {status} {desc}: {actual} (expect {expected})")
    return actual == expected


def print_resp_status(resp):
    print(f"  HTTP {resp.status_code}")
    if resp.status_code >= 400:
        try:
            print(f"    错误: {resp.json().get('detail')}")
        except:
            print(f"    body: {resp.text[:200]}")


def test_inventory():
    print_separator("1. 库存查询（A+血小板）")
    resp = requests.get(f"{BASE_URL}/blood-bags/", params={"component": "血小板"})
    bags = resp.json()
    print(f"  血小板库存总数: {len(bags)} 袋")
    for bag in bags:
        print(f"    - {bag['bag_code']} | {bag['blood_type']} | 剩{(datetime.strptime(bag['expiration_date'],'%Y-%m-%d').date()- __import__('datetime').date.today()).days}天 | 状态:{bag['status']}")

    resp = requests.get(f"{BASE_URL}/blood-bags/available/count", params={
        "blood_type": "A+", "component": "血小板"
    })
    print(f"\n  A+ 血小板可用: {resp.json()['available_count']} 袋")


def test_issued_bag_protection():
    print_separator("2. 状态流转保护：已发放血袋不可回退")

    resp = requests.get(f"{BASE_URL}/blood-bags/", params={"component": "血小板", "blood_type": "A+"})
    available_bags = [b for b in resp.json() if b["status"] == "available"]
    if not available_bags:
        print("  无可用血袋，跳过发放测试")
        return None

    test_bag_id = available_bags[0]["id"]
    test_bag_code = available_bags[0]["bag_code"]

    print(f"  选测试血袋: {test_bag_code} (id={test_bag_id})，先通过 PATCH 标记为已发放")
    resp = requests.patch(f"{BASE_URL}/blood-bags/{test_bag_id}", json={"status": "issued"})
    print_resp_status(resp)

    print(f"\n  【保护1】PATCH: 尝试把已发放改回 available（应被拒绝）")
    resp = requests.patch(f"{BASE_URL}/blood-bags/{test_bag_id}", json={"status": "available"})
    assert_status("HTTP 状态码", resp.status_code, 400)
    assert_status("错误信息含'非法状态流转'或'终态'", "非法" in resp.json().get("detail", "") or "终态" in resp.json().get("detail", ""), True)

    print(f"\n  【保护2】PATCH: 尝试把已发放改回 reserved（应被拒绝）")
    resp = requests.patch(f"{BASE_URL}/blood-bags/{test_bag_id}", json={"status": "reserved"})
    assert_status("HTTP 状态码", resp.status_code, 400)

    print(f"\n  【保护3】可用数查询：已发放血袋不应计入 available 池")
    resp = requests.get(f"{BASE_URL}/blood-bags/available/count", params={
        "blood_type": "A+", "component": "血小板"
    })
    available_now = resp.json()["available_count"]
    print(f"    A+血小板可用: {available_now} 袋 (发放后应减少)")
    assert_status("可用数不再包含已发放", available_bags[0] is not None and available_now < len(available_bags), True)

    print(f"\n  【保护4】PATCH: available → damaged（合法流转，应通过）")
    resp2 = requests.get(f"{BASE_URL}/blood-bags/", params={"component": "血小板", "blood_type": "A+"})
    remain_avail = [b for b in resp2.json() if b["status"] == "available"]
    if remain_avail:
        resp = requests.patch(f"{BASE_URL}/blood-bags/{remain_avail[0]['id']}", json={"status": "damaged"})
        assert_status("HTTP 状态码（合法流转 damaged）", resp.status_code, 200)
        damaged_bag_code = resp.json()["bag_code"]

        print(f"    damaged 后再尝试改回 available（应被拒绝）")
        resp = requests.patch(f"{BASE_URL}/blood-bags/{remain_avail[0]['id']}", json={"status": "available"})
        assert_status("damaged→available 被拒绝", resp.status_code, 400)

    # 恢复测试环境：把刚才的损坏袋通过 db 层恢复？不，我们重新 init
    return test_bag_id


def test_fifo_order_normal():
    print_separator("3. 普通预约：按有效期优先（FIFO，快过期先锁定）")

    appt_time = (datetime.now() + timedelta(hours=3)).isoformat()
    payload = {
        "hospital": "市一院（普通）",
        "blood_type": "A+",
        "component": "血小板",
        "quantity": 3,
        "appointment_time": appt_time,
        "urgency": "normal",
        "receiver_name": "陈医师",
        "receiver_phone": "13800000001"
    }
    resp = requests.post(f"{BASE_URL}/appointments/", json=payload)
    print_resp_status(resp)
    if resp.status_code != 200:
        return None

    result = resp.json()
    appt = result["appointment"]
    items = appt.get("items", [])
    print(f"  预约单号: {appt['appointment_no']} | 状态: {appt['status']} | 锁定 {len(items)} 袋")

    bag_codes = []
    for it in items:
        bag = requests.get(f"{BASE_URL}/blood-bags/{it['blood_bag_id']}").json()
        bag_codes.append((bag["bag_code"], bag["expiration_date"]))
        print(f"    - {bag['bag_code']} 有效期 {bag['expiration_date']}")

    sorted_check = bag_codes == sorted(bag_codes, key=lambda x: x[1])
    assert_status("锁定顺序 = 有效期从近到远（FIFO）", sorted_check, True)

    return appt["id"], appt["appointment_no"], items


def test_emergency_preemption(normal_appt_info):
    print_separator("4. 急诊抢占：可抢占普通预约锁定的快过期血袋")

    if not normal_appt_info:
        print("  无普通预约信息，跳过")
        return None

    appt_time = datetime.now().isoformat()
    payload = {
        "hospital": "省急救中心（急诊）",
        "department": "ICU",
        "blood_type": "A+",
        "component": "血小板",
        "quantity": 5,
        "appointment_time": appt_time,
        "urgency": "emergency",
        "receiver_name": "赵主任",
        "receiver_phone": "13900000099",
        "clinical_diagnosis": "急性大失血休克"
    }
    resp = requests.post(f"{BASE_URL}/appointments/", json=payload)
    print_resp_status(resp)
    result = resp.json()
    appt = result["appointment"]
    warning = result.get("duplicate_warning")
    items = appt.get("items", [])

    print(f"  急诊预约单号: {appt['appointment_no']} | 申请5袋 | 实际锁定: {len(items)} 袋")
    print(f"  急诊状态: {appt['status']}")

    if warning:
        print(f"\n  调度说明: {warning.get('message','')[:200]}")

    if appt.get("remark"):
        print(f"  预约备注: {appt['remark'][:200]}")

    preempted_codes = []
    for it in items:
        bag = requests.get(f"{BASE_URL}/blood-bags/{it['blood_bag_id']}").json()
        days = (datetime.strptime(bag["expiration_date"], "%Y-%m-%d").date() - __import__("datetime").date.today()).days
        mark = ""
        if days <= 2:
            mark = " ⚡(快过期，已被急诊锁定)"
            preempted_codes.append(bag["bag_code"])
        print(f"    - {bag['bag_code']} 剩 {days} 天 状态:{bag['status']}{mark}")

    # 验证被抢占的普通预约状态
    normal_id = normal_appt_info[0]
    normal_resp = requests.get(f"{BASE_URL}/appointments/{normal_id}").json()
    normal_status = normal_resp["status"]
    reserved_now = sum(1 for i in normal_resp["items"] if i["status"] == "reserved")
    print(f"\n  原普通预约({normal_appt_info[1]}) 当前状态: {normal_status}，剩余锁定: {reserved_now} 袋")
    if normal_resp.get("remark"):
        print(f"  原预约调整日志: {normal_resp['remark'][:200]}")

    preempt_happened = len(preempted_codes) >= 1
    assert_status("急诊成功锁定 ≥1 袋快过期库存（抢占）", preempt_happened, True)
    assert_status("原普通预约状态已调整（pending 或 partial）",
                  normal_status in ["pending", "partial_fulfilled", "partial_fulfilled"], True)

    return appt["id"]


def test_same_urgency_no_preemption():
    print_separator("5. 同等级预约不互相抢占（急诊不抢急诊）")

    appt_time = (datetime.now() + timedelta(minutes=10)).isoformat()
    resp1 = requests.post(f"{BASE_URL}/appointments/", json={
        "hospital": "急诊A院",
        "blood_type": "B+",
        "component": "血小板",
        "quantity": 2,
        "appointment_time": appt_time,
        "urgency": "emergency",
        "receiver_name": "急诊A",
        "receiver_phone": "111"
    })
    if resp1.status_code != 200:
        print("  急诊A创建失败，跳过")
        return
    appt1 = resp1.json()["appointment"]
    codes1 = [requests.get(f"{BASE_URL}/blood-bags/{i['blood_bag_id']}").json()["bag_code"] for i in appt1["items"] if i["status"] == "reserved"]
    print(f"  急诊A ({appt1['appointment_no']}) 锁定: {codes1}")

    resp2 = requests.post(f"{BASE_URL}/appointments/", json={
        "hospital": "急诊B院",
        "blood_type": "B+",
        "component": "血小板",
        "quantity": 3,
        "appointment_time": appt_time,
        "urgency": "emergency",
        "receiver_name": "急诊B",
        "receiver_phone": "222"
    })
    appt2 = resp2.json()["appointment"]
    codes2 = [requests.get(f"{BASE_URL}/blood-bags/{i['blood_bag_id']}").json()["bag_code"] for i in appt2["items"]]
    print(f"  急诊B ({appt2['appointment_no']}) 锁定: {codes2}")

    overlap = set(codes1) & set(codes2)
    assert_status("两急诊之间锁定血袋无重叠（不互相抢占）", len(overlap) == 0, True)
    if overlap:
        print(f"    ⚠ 重叠血袋: {overlap}")


def test_issue_and_protection(appt_id):
    print_separator("6. 发放取血 + 发放后状态不可逆二次验证")

    resp = requests.get(f"{BASE_URL}/appointments/{appt_id}")
    if resp.status_code != 200:
        print("  预约不存在，跳过")
        return
    appt = resp.json()
    bag_ids = [i["blood_bag_id"] for i in appt["items"] if i["status"] == "reserved"]
    if not bag_ids:
        print("  无已锁定血袋可发放（可能被抢占），跳过发放")
        return

    payload = {
        "appointment_id": appt_id,
        "blood_bag_ids": bag_ids,
        "receiver_name": "赵主任",
        "receiver_phone": "13900000099",
        "cold_chain_actual_time": datetime.now().isoformat(),
        "operator": "值班员测试"
    }
    resp = requests.post(f"{BASE_URL}/issues/", json=payload)
    print_resp_status(resp)
    if resp.status_code != 200:
        return
    records = resp.json()
    print(f"  发放成功: {len(records)} 袋")

    issued_ids = [r["blood_bag_id"] for r in records]

    for bid in issued_ids:
        resp = requests.patch(f"{BASE_URL}/blood-bags/{bid}", json={"status": "available"})
        if resp.status_code == 400:
            print(f"  ✓ 血袋 {bid} 改回 available 被拒绝")
        else:
            print(f"  ✗ 血袋 {bid} 改回 available 未被拒绝! HTTP {resp.status_code}")

    resp = requests.get(f"{BASE_URL}/blood-bags/available/count",
                        params={"blood_type": appt["blood_type"], "component": appt["component"]})
    print(f"  {appt['blood_type']} {appt['component']} 当前可用: {resp.json()['available_count']} 袋 (发放后应不包含已发放袋)")


def test_views():
    print_separator("7. 各角色视图查询")

    resp = requests.get(f"{BASE_URL}/duty/pending-list")
    data = resp.json()
    print(f"  值班员待取清单: {data['total']} 单")
    for a in data["items"][:4]:
        tag = "【急诊】" if a["urgency"] == "emergency" else "【加急】" if a["urgency"] == "urgent" else ""
        print(f"    {tag}{a['appointment_no']} | {a['hospital']} | {a['status']}")

    resp = requests.get(f"{BASE_URL}/director/expiry-risk")
    data = resp.json()
    print(f"\n  主任过期风险: {data['total']} 袋")
    for it in data["items"][:5]:
        bag = it["blood_bag"]
        icon = "🔴" if it["risk_level"] == "high" else "🟡" if it["risk_level"] == "medium" else "🟢"
        print(f"    {icon} {bag['bag_code']} 剩{it['days_to_expiry']}天 状态:{bag['status']}")

    resp = requests.get(f"{BASE_URL}/director/urgent-usage")
    data = resp.json()
    print(f"\n  主任加急占用: 急诊{data['emergency_count']} 加急{data['urgent_count']} 共{data['total_bags']}袋")

    resp = requests.get(f"{BASE_URL}/night-shift/hospital-pending")
    data = resp.json()
    print(f"\n  夜班按医院汇总: 共{data['total_pending']}单，{len(data['hospitals'])}家医院")
    for h in data["hospitals"]:
        print(f"    🏥 {h['hospital']}: {h['pending_count']}单")

    resp = requests.get(f"{BASE_URL}/night-shift/reminders", params={"overdue_minutes": 0})
    data = resp.json()
    print(f"\n  夜班催缴清单: {data['total']} 个")
    for r in data["items"][:3]:
        print(f"    📞 {r['hospital']} {r['receiver_name']} 超时{r['overdue_minutes']}分")


def main():
    print("血站成分血发放预约系统 — 修正验证测试")
    print(f"服务: {BASE_URL}")
    print(f"日期: {datetime.now()}")

    try:
        requests.get(f"{BASE_URL}/")
    except Exception as e:
        print(f"连接失败: {e}\n请先运行: python -m uvicorn main:app --reload")
        return

    test_inventory()

    test_issued_bag_protection()

    normal_info = test_fifo_order_normal()

    emergency_id = test_emergency_preemption(normal_info) if normal_info else None

    test_same_urgency_no_preemption()

    if emergency_id:
        test_issue_and_protection(emergency_id)
    elif normal_info:
        test_issue_and_protection(normal_info[0])

    test_views()

    print_separator("全部验证场景完成")
    print(f"\n交互式文档: http://localhost:8000/docs")


if __name__ == "__main__":
    main()
