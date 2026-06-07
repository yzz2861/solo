import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from datetime import datetime
from app.main import app

client = TestClient(app)


def make_item(item_id, report_no, risk_level="low", desc="常规",
              required=None, provided=None, exam_type="CT",
              exam_body_part="胸部", department="内科"):
    return {
        "item_id": item_id,
        "report_no": report_no,
        "patient_id": f"P{item_id}",
        "patient_name": f"患者{item_id}",
        "exam_type": exam_type,
        "exam_body_part": exam_body_part,
        "critical_value_desc": desc,
        "risk_level": risk_level,
        "required_materials": required or [],
        "provided_materials": provided or [],
        "department": department,
        "reporting_physician": "张医生",
        "report_time": datetime.now().isoformat(),
    }


passed = 0
failed = 0


def assert_eq(actual, expected, msg=""):
    global passed, failed
    if actual == expected:
        passed += 1
        print(f"  ✓ PASS: {msg}")
    else:
        failed += 1
        print(f"  ✗ FAIL: {msg}")
        print(f"    expected: {expected}")
        print(f"    actual:   {actual}")


def assert_true(condition, msg=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ PASS: {msg}")
    else:
        failed += 1
        print(f"  ✗ FAIL: {msg}")


print("=" * 60)
print("API 测试 1: 单条提交成功")
print("=" * 60)
payload = {
    "batch_no": "API-BATCH-001",
    "source_channel": "pacs",
    "action": "submit",
    "items": [make_item("api-001", "API-RPT-001", "low", "常规",
                        ["身份证"], ["身份证"])],
}
resp = client.post("/api/receipts/batch", json=payload)
assert_eq(resp.status_code, 200, "状态码=200")
data = resp.json()
assert_eq(data["batch_no"], "API-BATCH-001", "批次号正确")
assert_eq(data["total_count"], 1, "total_count=1")
assert_eq(data["summary"]["total"], 1, "summary.total=1")
assert_eq(data["summary"]["processable"], 1, "summary.processable=1")
assert_eq(data["results"][0]["status"], "processable", "status=processable")
assert_eq(data["results"][0]["need_review"], False, "need_review=False")

print()
print("=" * 60)
print("API 测试 2: 批量混合场景")
print("=" * 60)
payload2 = {
    "batch_no": "API-BATCH-MIXED",
    "source_channel": "his",
    "action": "submit",
    "items": [
        make_item("api-mix-1", "API-MIX-1", "low", "常规", ["A"], ["A"]),
        make_item("api-mix-2", "API-MIX-2", "low", "常规", ["A", "B"], ["A"]),
        make_item("api-mix-3", "API-MIX-3", "high", "脑出血",
                  ["身份证"], ["身份证"], "CT", "头部", "急诊科"),
    ],
}
resp2 = client.post("/api/receipts/batch", json=payload2)
assert_eq(resp2.status_code, 200, "状态码=200")
data2 = resp2.json()
assert_eq(data2["summary"]["total"], 3, "total=3")
assert_eq(data2["summary"]["high_risk"], 1, "high_risk=1")
assert_true(data2["summary"]["processable"] >= 1, "processable>=1")
assert_true(data2["summary"]["need_supplement"] >= 1, "need_supplement>=1")
assert_true(data2["summary"]["locked"] >= 1, "locked>=1")

print()
print("=" * 60)
print("API 测试 3: 人工复核高风险回执")
print("=" * 60)
submit_payload = {
    "batch_no": "API-BATCH-REVIEW",
    "source_channel": "emergency",
    "action": "submit",
    "items": [
        make_item("api-rv-1", "API-RV-1", "high", "急性脑梗塞",
                  ["身份证"], ["身份证"], "MRI", "颅脑", "神经外科"),
    ],
}
submit_resp = client.post("/api/receipts/batch", json=submit_payload)
submit_data = submit_resp.json()
receipt_id = submit_data["results"][0]["receipt_id"]
assert_eq(submit_data["results"][0]["status"], "locked", "提交后=locked")

review_payload = {
    "batch_no": "API-BATCH-REVIEW",
    "receipt_ids": [receipt_id],
    "action": "approve",
    "review_opinion": "已复核，危急值诊断准确",
    "review_user": "李主任",
}
review_resp = client.post("/api/receipts/review", json=review_payload)
assert_eq(review_resp.status_code, 200, "复核状态码=200")
review_data = review_resp.json()
assert_eq(review_data["results"][0]["success"], True, "复核成功")
assert_eq(review_data["results"][0]["status"], "approved", "状态=approved")
assert_eq(review_data["summary"]["approved"], 1, "approved=1")

detail_resp = client.get(f"/api/receipts/{receipt_id}")
detail_data = detail_resp.json()
assert_eq(detail_data["receipt"]["status"], "approved", "详情状态=approved")
assert_eq(detail_data["receipt"]["review_opinion"], "已复核，危急值诊断准确", "复核意见正确")
assert_eq(len(detail_data["audit_logs"]), 2, "日志数=2")

print()
print("=" * 60)
print("API 测试 4: 重复提交")
print("=" * 60)
dup_payload = {
    "batch_no": "API-BATCH-DUP",
    "source_channel": "manual",
    "action": "submit",
    "items": [
        make_item("api-dup-1", "API-DUP-RPT", "low", "常规", ["身份证"], ["身份证"]),
        make_item("api-dup-2", "API-DUP-RPT", "low", "常规", ["身份证"], ["身份证"]),
    ],
}
dup_resp = client.post("/api/receipts/batch", json=dup_payload)
dup_data = dup_resp.json()
assert_eq(dup_data["summary"]["failed"], 1, "failed=1")
assert_eq(dup_data["summary"]["total"], 2, "total=2")
failed_results = [r for r in dup_data["results"] if r["status"] == "failed"]
assert_eq(len(failed_results), 1, "失败数=1")
assert_true(any("重复" in reason for reason in failed_results[0]["failure_reasons"]),
            "失败原因含'重复'")

print()
print("=" * 60)
print("API 测试 5: 批次查询与日志")
print("=" * 60)
batch_resp = client.get("/api/receipts/batch/API-BATCH-MIXED")
assert_eq(batch_resp.status_code, 200, "批次查询=200")
batch_data = batch_resp.json()
assert_eq(batch_data["batch_info"]["batch_no"], "API-BATCH-MIXED", "batch_no正确")
assert_eq(batch_data["summary"]["total"], 3, "summary.total=3")
assert_eq(len(batch_data["receipts"]), 3, "receipts数=3")
assert_eq(batch_data["logs_count"], 3, "logs_count=3")
assert_eq(len(batch_data["audit_logs"]), 3, "audit_logs数=3")

log_resp = client.get("/api/audit-logs?batch_no=API-BATCH-MIXED")
log_data = log_resp.json()
assert_eq(log_data["total"], 3, "日志总数=3")
assert_eq(log_data["logs"][0]["action"], "submit", "日志action=submit")

print()
print("=" * 60)
print("API 测试 6: 批次不存在返回404")
print("=" * 60)
nf_resp = client.get("/api/receipts/batch/NONEXISTENT")
assert_eq(nf_resp.status_code, 404, "不存在批次=404")

print()
print("=" * 60)
print(f"API 测试总结: 通过 {passed} 个, 失败 {failed} 个")
print("=" * 60)

if failed > 0:
    sys.exit(1)
else:
    print("🎉 所有 API 测试通过!")
    sys.exit(0)
