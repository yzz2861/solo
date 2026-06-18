import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8001/api"


def api(method, path, data=None):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if data is not None:
        req.data = json.dumps(data).encode()
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def run_tests():
    print("=== 1. 创建无重复批次样品 ===")
    r = api("POST", "/samples", {
        "sample_name": "独立批次样品",
        "batch_number": "BATCH-TEST-UNIQUE",
        "purpose": "testing",
        "applicant": "王五",
        "quantity": 1,
        "unit": "件"
    })
    print(f"  创建成功: {r['sample']['sample_no']}")
    print(f"  batch_warning: {r['batch_warning']}")
    print(f"  batch_duplicate_info: {r['batch_duplicate_info']}")
    assert r["batch_warning"] is False, "无重复批次应该返回 False"
    assert r["batch_duplicate_info"] is None, "无重复批次 info 应该为 None"
    print("  ✓ PASS")

    print()
    print("=== 2. 创建重复批次样品 ===")
    r = api("POST", "/samples", {
        "sample_name": "重复批次测试A",
        "batch_number": "BATCH-DUP-CHECK",
        "purpose": "rnd",
        "applicant": "赵六",
        "quantity": 2,
        "unit": "件"
    })
    first_id = r["sample"]["id"]
    print(f"  创建第一个: {r['sample']['sample_no']}, batch_warning={r['batch_warning']}")

    r2 = api("POST", "/samples", {
        "sample_name": "重复批次测试B",
        "batch_number": "BATCH-DUP-CHECK",
        "purpose": "customer",
        "applicant": "钱七",
        "quantity": 1,
        "unit": "件"
    })
    print(f"  创建第二个: {r2['sample']['sample_no']}, batch_warning={r2['batch_warning']}")
    print(f"  重复数量: {r2['batch_duplicate_info']['existing_count']}")
    print(f"  已有样品: {[s['sample_no'] for s in r2['batch_duplicate_info']['existing_samples']]}")
    assert r2["batch_warning"] is True, "重复批次应该返回 True"
    assert r2["batch_duplicate_info"]["existing_count"] >= 1, "应该返回重复信息"
    print("  ✓ PASS")

    print()
    print("=== 3. 审批流程 ===")
    r = api("POST", f"/samples/{first_id}/approve", {
        "approved": True,
        "approver": "合规审核员",
        "opinion": "资料齐全同意出区"
    })
    print(f"  样品: {r['sample_no']}")
    print(f"  审批状态: {r['approval_status']}")
    print(f"  当前状态: {r['status']}")
    assert r["approval_status"] == "approved"
    assert r["status"] == "approved"
    print("  ✓ PASS")

    print()
    print("=== 4. 出区流程 ===")
    r = api("POST", f"/samples/{first_id}/outbound", {})
    print(f"  样品: {r['sample_no']}")
    print(f"  当前状态: {r['status']}")
    print(f"  出区时间: {r['out_time']}")
    assert r["status"] == "out"
    assert r["out_time"] is not None
    print("  ✓ PASS")

    print()
    print("=== 5. 归还流程 ===")
    r = api("POST", f"/samples/{first_id}/return", {"remark": "完好归还"})
    print(f"  样品: {r['sample_no']}")
    print(f"  当前状态: {r['status']}")
    print(f"  归还时间: {r['actual_return_time']}")
    assert r["status"] == "returned"
    assert r["actual_return_time"] is not None
    print("  ✓ PASS")

    print()
    print("=== 6. 未审批样品不能出区（验证约束） ===")
    r = api("POST", "/samples", {
        "sample_name": "待审批样品-约束测试",
        "batch_number": "BATCH-CONSTRAINT-001",
        "purpose": "rnd",
        "applicant": "测试员",
        "quantity": 1,
        "unit": "件"
    })
    pending_id = r["sample"]["id"]
    try:
        api("POST", f"/samples/{pending_id}/outbound", {})
        assert False, "应该抛出异常"
    except urllib.error.HTTPError as e:
        print(f"  正确拒绝出区，HTTP状态码: {e.code}")
        assert e.code == 400
    print("  ✓ PASS")

    print()
    print("=== 7. 已归还样品不能销毁（验证约束） ===")
    try:
        api("POST", f"/samples/{first_id}/destroy", {
            "reason": "测试销毁",
            "operator": "测试员"
        })
        assert False, "应该抛出异常"
    except urllib.error.HTTPError as e:
        print(f"  正确拒绝销毁，HTTP状态码: {e.code}")
        assert e.code == 400
    print("  ✓ PASS")

    print()
    print("=== 8. 统计接口 ===")
    r = api("GET", "/samples/statistics")
    for k, v in r.items():
        print(f"  {k}: {v}")
    assert r["total"] > 0
    print("  ✓ PASS")

    print()
    print("=== 9. 合规摘要 ===")
    r = api("GET", "/compliance/summary")
    for k, v in r.items():
        print(f"  {k}: {v}")
    print("  ✓ PASS")

    print()
    print("=== 10. 批次重复检查接口 ===")
    r = api("GET", "/samples/batch-check/BATCH-2026-001")
    print(f"  批次号: {r['batch_number']}")
    print(f"  已有数量: {r['existing_count']}")
    assert r["existing_count"] >= 1
    print("  ✓ PASS")

    print()
    print("=" * 50)
    print("所有关键流程测试通过! ✓")
    print("=" * 50)


if __name__ == "__main__":
    run_tests()
