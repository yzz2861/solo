#!/usr/bin/env python3
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"


def print_separator(title=""):
    print("\n" + "=" * 60)
    if title:
        print(f"  {title}")
        print("=" * 60)


def test_inventory():
    print_separator("1. 库存查询")

    resp = requests.get(f"{BASE_URL}/blood-bags/", params={"component": "血小板"})
    bags = resp.json()
    print(f"血小板库存总数: {len(bags)} 袋")
    for bag in bags[:3]:
        print(f"  - {bag['bag_code']} | {bag['blood_type']} | 有效期: {bag['expiration_date']} | 状态: {bag['status']}")

    resp = requests.get(f"{BASE_URL}/blood-bags/available/count", params={
        "blood_type": "A+",
        "component": "血小板"
    })
    print(f"\nA型血小板可用数量: {resp.json()['available_count']} 袋")


def test_create_appointment():
    print_separator("2. 预约登记（市第一医院 - A型血小板 2袋）")

    appt_time = (datetime.now() + timedelta(hours=2)).isoformat()
    payload = {
        "hospital": "市第一人民医院",
        "department": "血液科",
        "blood_type": "A+",
        "component": "血小板",
        "quantity": 2,
        "appointment_time": appt_time,
        "cold_chain_window_start": appt_time,
        "cold_chain_window_end": (datetime.now() + timedelta(hours=4)).isoformat(),
        "urgency": "normal",
        "receiver_name": "张医生",
        "receiver_phone": "13800138001",
        "clinical_diagnosis": "白血病化疗后血小板减少",
        "created_by": "值班员小李"
    }

    resp = requests.post(f"{BASE_URL}/appointments/", json=payload)
    result = resp.json()
    appt = result["appointment"]
    print(f"预约单号: {appt['appointment_no']}")
    print(f"状态: {appt['status']}")
    print(f"锁定血袋数: {len(appt['items'])}")

    if result.get("duplicate_warning"):
        print(f"重复提示: {result['duplicate_warning']['message']}")

    return appt["id"], appt["appointment_no"]


def test_duplicate_warning():
    print_separator("3. 重复申请合并提示")

    appt_time = (datetime.now() + timedelta(hours=2, minutes=30)).isoformat()
    payload = {
        "hospital": "市第一人民医院",
        "blood_type": "A+",
        "component": "血小板",
        "quantity": 1,
        "appointment_time": appt_time,
        "urgency": "normal",
        "receiver_name": "李护士",
        "receiver_phone": "13800138002"
    }

    resp = requests.post(f"{BASE_URL}/appointments/", json=payload)
    result = resp.json()

    if result.get("duplicate_warning") and result["duplicate_warning"]["has_duplicate"]:
        print(f"✓ 检测到重复申请: {result['duplicate_warning']['message']}")
    else:
        print("未检测到重复申请")

    return result["appointment"]["id"]


def test_emergency_appointment():
    print_separator("4. 急诊加急预约（市中心医院 - B型血小板）")

    appt_time = datetime.now().isoformat()
    payload = {
        "hospital": "市中心医院",
        "department": "急诊科",
        "blood_type": "B+",
        "component": "血小板",
        "quantity": 3,
        "appointment_time": appt_time,
        "urgency": "emergency",
        "receiver_name": "王主任",
        "receiver_phone": "13900139001",
        "clinical_diagnosis": "创伤大出血",
        "created_by": "值班员小李"
    }

    resp = requests.post(f"{BASE_URL}/appointments/", json=payload)
    result = resp.json()
    appt = result["appointment"]
    print(f"预约单号: {appt['appointment_no']}")
    print(f"紧急程度: {appt['urgency']}")
    print(f"状态: {appt['status']}")
    print(f"已锁定: {len(appt['items'])} 袋 (申请 {appt['quantity']} 袋)")

    if len(appt["items"]) < appt["quantity"]:
        print(f"⚠ 库存不足，部分分配")

    return appt["id"]


def test_issue_blood(appt_id):
    print_separator("5. 取血发放（冷链交接）")

    resp = requests.get(f"{BASE_URL}/appointments/{appt_id}")
    appt = resp.json()

    bag_ids = [item["blood_bag_id"] for item in appt["items"] if item["status"] == "reserved"]
    print(f"待发放血袋: {len(bag_ids)} 个")

    issue_payload = {
        "appointment_id": appt_id,
        "blood_bag_ids": bag_ids,
        "receiver_name": "张医生",
        "receiver_phone": "13800138001",
        "cold_chain_actual_time": datetime.now().isoformat(),
        "operator": "值班员小李",
        "remark": "当面核对无误"
    }

    resp = requests.post(f"{BASE_URL}/issues/", json=issue_payload)
    if resp.status_code == 200:
        records = resp.json()
        print(f"✓ 发放成功，共 {len(records)} 袋")
        for rec in records:
            print(f"  - 血袋ID {rec['blood_bag_id']} | 发放时间: {rec['issue_time'][:19]}")
    else:
        print(f"发放失败: {resp.status_code} - {resp.text}")


def test_issue_with_delay(appt_id):
    print_separator("6. 冷链超时交接（需填写原因）")

    resp = requests.get(f"{BASE_URL}/appointments/{appt_id}")
    appt = resp.json()

    bag_ids = [item["blood_bag_id"] for item in appt["items"] if item["status"] == "reserved"]

    issue_payload = {
        "appointment_id": appt_id,
        "blood_bag_ids": bag_ids,
        "receiver_name": "王主任",
        "receiver_phone": "13900139001",
        "cold_chain_actual_time": (datetime.now() + timedelta(hours=6)).isoformat(),
        "cold_chain_delay_reason": "交通拥堵，冷链车晚到",
        "operator": "值班员小李"
    }

    resp = requests.post(f"{BASE_URL}/issues/", json=issue_payload)
    if resp.status_code == 200:
        records = resp.json()
        print(f"✓ 发放成功（超时，已记录原因）")
        for rec in records:
            if rec.get("cold_chain_delay_reason"):
                print(f"  - 超时原因: {rec['cold_chain_delay_reason']}")
    else:
        print(f"发放结果: {resp.status_code} - {resp.text}")


def test_duty_view():
    print_separator("7. 值班员视图 - 待取清单")

    resp = requests.get(f"{BASE_URL}/duty/pending-list")
    data = resp.json()
    print(f"待取预约总数: {data['total']}")
    for appt in data["items"][:5]:
        urgency_label = "【急诊】" if appt["urgency"] == "emergency" else "【加急】" if appt["urgency"] == "urgent" else ""
        print(f"  {urgency_label}{appt['appointment_no']} | {appt['hospital']} | "
              f"{appt['blood_type']} {appt['component']} x{appt['quantity']} | "
              f"状态: {appt['status']}")


def test_director_view():
    print_separator("8. 主任视图 - 过期风险")

    resp = requests.get(f"{BASE_URL}/director/expiry-risk", params={"days_threshold": 3})
    data = resp.json()
    print(f"过期风险血袋数: {data['total']}")
    for item in data["items"]:
        bag = item["blood_bag"]
        risk_icon = "🔴" if item["risk_level"] == "high" else "🟡" if item["risk_level"] == "medium" else "🟢"
        print(f"  {risk_icon} {bag['bag_code']} | {bag['blood_type']} {bag['component']} | "
              f"还剩 {item['days_to_expiry']} 天过期 | 状态: {bag['status']}")

    print()
    resp = requests.get(f"{BASE_URL}/director/urgent-usage")
    data = resp.json()
    print(f"加急占用统计:")
    print(f"  加急/急诊预约数: {data['total_appointments']}")
    print(f"  占用血袋数: {data['total_bags']}")
    print(f"  急诊: {data['emergency_count']} 单 | 加急: {data['urgent_count']} 单")

    print()
    resp = requests.get(f"{BASE_URL}/director/rejected")
    data = resp.json()
    print(f"被驳回预约数: {data['total']}")


def test_night_shift_view():
    print_separator("9. 夜班视图 - 按医院筛未取")

    resp = requests.get(f"{BASE_URL}/night-shift/hospital-pending")
    data = resp.json()
    print(f"未取预约总数: {data['total_pending']}")
    print(f"涉及医院数: {len(data['hospitals'])}")
    for hosp_data in data["hospitals"]:
        print(f"  🏥 {hosp_data['hospital']}: {hosp_data['pending_count']} 单未取")
        for appt in hosp_data["appointments"]:
            print(f"     - {appt['appointment_no']} | {appt['blood_type']} {appt['component']} x{appt['quantity']}")

    print()
    resp = requests.get(f"{BASE_URL}/night-shift/reminders", params={"overdue_minutes": 0})
    data = resp.json()
    print(f"待催缴清单: {data['total']} 个")
    for item in data["items"][:3]:
        print(f"  📞 {item['hospital']} | {item['receiver_name']} {item['receiver_phone']} | "
              f"已超时 {item['overdue_minutes']} 分钟")


def test_issued_bag_not_returnable(appt_id):
    print_separator("10. 验证：已发放血袋不可回到可预约")

    resp = requests.get(f"{BASE_URL}/appointments/{appt_id}")
    appt = resp.json()

    for item in appt["items"]:
        bag_resp = requests.get(f"{BASE_URL}/blood-bags/{item['blood_bag_id']}")
        bag = bag_resp.json()
        print(f"  血袋 {bag['bag_code']} 状态: {bag['status']}")
        if bag["status"] == "issued":
            print(f"  ✓ 确认已发放，不可回到可预约状态")


def main():
    print("血站成分血发放预约系统 - 端到端测试")
    print("=" * 60)

    try:
        requests.get(f"{BASE_URL}/")
    except:
        print("错误: 无法连接到服务器，请先运行 uvicorn main:app --reload")
        return

    test_inventory()

    appt1_id, appt1_no = test_create_appointment()

    dup_appt_id = test_duplicate_warning()

    emergency_appt_id = test_emergency_appointment()

    test_duty_view()

    test_director_view()

    test_night_shift_view()

    test_issue_blood(appt1_id)

    test_issue_with_delay(emergency_appt_id)

    test_issued_bag_not_returnable(appt1_id)

    print_separator("测试完成")
    print(f"\n📋 预约单号记录:")
    print(f"  - 市一医院常规预约: {appt1_no}")
    print(f"\n💡 提示: 访问 http://localhost:8000/docs 查看完整 API 文档")


if __name__ == "__main__":
    main()
