#!/usr/bin/env python3
"""自习室 API 关键流程测试"""
import json
import time
import urllib.request

BASE = "http://127.0.0.1:5184"

def req(path, method="GET", data=None):
    url = BASE + path
    body = None
    headers = {}
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        resp = urllib.request.urlopen(r).read()
        return json.loads(resp)
    except urllib.error.HTTPError as e:
        return json.loads(e.read()) if e.fp else {"ok": False, "error": str(e)}

def banner(title):
    print(f"\n{'='*10} {title} {'='*10}")

banner("1. 防占座测试 - 张三重复预约")
# A03 是 seat_A_2，应该是 available
r = req("/api/reserve", "POST", {
    "seatId": "seat_A_2",
    "studentName": "张三",
    "studentPhone": "13900000002",
    "operator": "test",
})
print(f"张三预约 A03: ok={r.get('ok')}, error={r.get('error')}")
assert r.get("ok") is False, "张三已经占了 A01，不能再预约 A03"
assert "A01" in r.get("error", "") or "占用" in r.get("error", ""), "错误提示应包含占用信息"
print("✓ PASS：张三重复预约被正确拦截")

banner("2. 新用户预约测试 - 王五")
r = req("/api/reserve", "POST", {
    "seatId": "seat_A_2",
    "studentName": "王五",
    "studentPhone": "13900000003",
    "operator": "test",
})
print(f"王五预约 A03: ok={r.get('ok')}, error={r.get('error')}")
assert r.get("ok") is True, "新用户应能正常预约"
print("✓ PASS：新用户预约成功")

banner("3. 储物柜绑定验证")
lockers = req("/api/lockers")["data"]
wangwu_locker = next((l for l in lockers if l.get("studentId") and "王五" not in l.get("studentId", "") and l.get("seatId") == "seat_A_2"), None)
# 通过 studentId 派生名查找
seats = req("/api/seats")["data"]
wangwu_seat = next(s for s in seats if s["id"] == "seat_A_2")
wangwu_locker_id = wangwu_seat["lockerId"]
wangwu_locker = next(l for l in lockers if l["id"] == wangwu_locker_id)
print(f"王五绑定的储物柜: {wangwu_locker['code']} -> 状态: {wangwu_locker['status']}")
assert wangwu_locker["status"] == "in_use", "储物柜应该是 in_use 状态"
print("✓ PASS：储物柜绑定成功")

banner("4. 释放座位时储物柜同步释放验证")
r = req("/api/release", "POST", {
    "seatId": "seat_A_2",
    "operator": "test",
    "reason": "模拟未签到超时释放",
})
print(f"释放 A03: ok={r.get('ok')}, error={r.get('error')}")
assert r.get("ok") is True

lockers_after = req("/api/lockers")["data"]
locker_after = next(l for l in lockers_after if l["id"] == wangwu_locker_id)
seats_after = req("/api/seats")["data"]
seat_after = next(s for s in seats_after if s["id"] == "seat_A_2")
print(f"释放后座位 A03 状态: {seat_after['status']}")
print(f"释放后储物柜 {wangwu_locker['code']} 状态: {locker_after['status']}")

assert seat_after["status"] == "available", "座位应该已释放为 available"
assert locker_after["status"] == "available", f"储物柜应该同步释放为 available，实际是 {locker_after['status']}"
print("✓ PASS：座位和储物柜同步释放成功")

banner("5. 签到/临时离座/返回/离座 完整流程")
# 找一个 C 区 available 的座位
all_seats = req("/api/seats")["data"]
c_avail = [s for s in all_seats if s["zone"] == "C" and s["status"] == "available"]
assert c_avail, "C区应该有可用座位"
c_seat = c_avail[0]
test_seat_id = c_seat["id"]
test_seat_code = c_seat["code"]
print(f"选择测试座位: {test_seat_code} ({test_seat_id})")

r = req("/api/reserve", "POST", {
    "seatId": test_seat_id,
    "studentName": "测试七",
    "operator": "test",
})
print(f"测试七预约 {test_seat_code}: ok={r.get('ok')}, error={r.get('error')}")
assert r.get("ok")

# 签到
r = req("/api/checkin", "POST", {"seatId": test_seat_id, "operator": "test"})
print(f"签到: ok={r.get('ok')}, data={r.get('data')}")
assert r.get("ok")

# 临时离座
r = req("/api/temp-away", "POST", {"seatId": test_seat_id, "operator": "test"})
print(f"临时离座: ok={r.get('ok')}, expireAt={r.get('data', {}).get('expireAt')}")
assert r.get("ok")

# 返回座位
r = req("/api/return", "POST", {"seatId": test_seat_id, "operator": "test"})
print(f"返回座位: ok={r.get('ok')}")
assert r.get("ok")

# 正常离座
r = req("/api/checkout", "POST", {"seatId": test_seat_id, "operator": "test", "reason": "正常离座"})
print(f"正常离座: ok={r.get('ok')}, totalMinutes={r.get('data', {}).get('totalMinutes')}")
assert r.get("ok")

# 验证储物柜也释放了
lockers_final = req("/api/lockers")["data"]
seat_final = next(s for s in req("/api/seats")["data"] if s["id"] == test_seat_id)
print(f"{test_seat_code} 最终状态: {seat_final['status']} (无 lockerId = {seat_final.get('lockerId') is None})")
assert seat_final["status"] == "available"
assert seat_final.get("lockerId") is None
print("✓ PASS：签到/临时离座/返回/离座 完整流程通过")

banner("6. 违规记录持久化")
vios = req("/api/violations")["data"]
print(f"总违规记录数: {len(vios)}")
# 看一下刚强制释放的王五是否有违规
rel_v = next((v for v in vios if v.get("type") == "forced_release" and v.get("studentName") == "王五"), None)
print(f"王五的强制释放违规记录: {'存在' if rel_v else '不存在'}")
if rel_v:
    print(f"  类型: {rel_v['type']}, 座位: {rel_v['seatCode']}, 描述: {rel_v.get('description')}")
assert rel_v, "强制释放应该产生 forced_release 违规"
print("✓ PASS：违规记录持久化成功")

banner("7. 事件日志")
events = req("/api/events")["data"]
print(f"事件日志总条数: {len(events)}")
action_types = set(e.get("action") for e in events)
print(f"涉及的 action 类型: {action_types}")
assert "reserve" in action_types
assert "release" in action_types
assert "checkin" in action_types
assert "temp_away" in action_types
# sync 是前端 Zustand subscribe 触发的，这里没通过前端调用，可选
# assert "sync" in action_types
print("✓ PASS：事件日志完整记录")

banner("✓ 全部测试通过 ✓")
print(f"   - 防占座: 张三重复预约被拦截")
print(f"   - 储物柜绑定: 预约时自动占用同区柜位")
print(f"   - 同步释放: 释放座位柜位同步 available")
print(f"   - 完整流程: 预约→签到→临时离座→返回→离座")
print(f"   - 违规持久化: forced_release/no_show 等入库")
print(f"   - 事件日志: 全部动作可审计")
