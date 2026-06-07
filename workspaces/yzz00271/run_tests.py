import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime
from app.domain import (
    ReceiptItem, RiskLevel, SourceChannel, ActionType, ReceiptStatus
)
from app.services import ReceiptService


def make_item(item_id, report_no, risk_level=RiskLevel.LOW, desc="常规",
              required=None, provided=None, exam_type="CT",
              exam_body_part="胸部", department="内科"):
    return ReceiptItem(
        item_id=item_id,
        report_no=report_no,
        patient_id=f"P{item_id}",
        patient_name=f"患者{item_id}",
        exam_type=exam_type,
        exam_body_part=exam_body_part,
        critical_value_desc=desc,
        risk_level=risk_level,
        required_materials=required or [],
        provided_materials=provided or [],
        department=department,
        reporting_physician="张医生",
        report_time=datetime.now(),
    )


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
print("测试 1: 单条成功提交（低风险、材料齐全）")
print("=" * 60)
service = ReceiptService()
item = make_item("item-001", "RPT-001", RiskLevel.LOW, "肺部小结节",
                 ["身份证", "检查申请单"], ["身份证", "检查申请单"])
resp = service.submit_batch("BATCH-SINGLE-001", SourceChannel.PACS, [item])
assert_eq(resp.batch_no, "BATCH-SINGLE-001", "批次号正确")
assert_eq(resp.total_count, 1, "总数量=1")
assert_eq(len(resp.results), 1, "结果数=1")
assert_eq(resp.results[0].status, ReceiptStatus.PROCESSABLE, "状态=可办理")
assert_eq(resp.results[0].need_review, False, "无需复核")
assert_eq(resp.summary["total"], 1, "汇总total=1")
assert_eq(resp.summary["processable"], 1, "汇总processable=1")
assert_eq(resp.summary["high_risk"], 0, "汇总high_risk=0")
batch_detail = service.get_batch("BATCH-SINGLE-001")
assert_true(batch_detail is not None, "批次详情存在")
assert_eq(batch_detail["logs_count"], 1, "日志数=1")
logs = service.get_audit_logs(batch_no="BATCH-SINGLE-001")
assert_eq(len(logs), 1, "日志条数=1")
assert_eq(logs[0]["action"], "submit", "动作为submit")

print()
print("=" * 60)
print("测试 2: 批量部分失败（混合场景）")
print("=" * 60)
service2 = ReceiptService()
items = [
    make_item("item-101", "RPT-101", RiskLevel.LOW, "常规检查",
              ["身份证"], ["身份证"]),
    make_item("item-102", "RPT-102", RiskLevel.LOW, "常规检查",
              ["身份证", "病历本"], ["身份证"]),
    make_item("item-103", "RPT-103", RiskLevel.HIGH, "脑出血",
              ["身份证"], ["身份证"], "CT", "头部", "急诊科"),
    make_item("item-104", "RPT-104", RiskLevel.MEDIUM, "骨折",
              ["身份证", "检查申请单"], ["身份证", "检查申请单"]),
]
resp2 = service2.submit_batch("BATCH-MIXED-001", SourceChannel.PACS, items)
assert_eq(resp2.total_count, 4, "总数量=4")
assert_eq(resp2.summary["total"], 4, "汇总total=4")
assert_eq(resp2.summary["high_risk"], 1, "高风险=1")
assert_true(resp2.summary["processable"] >= 1, "processable>=1")
assert_true(resp2.summary["need_supplement"] >= 1, "need_supplement>=1")
assert_true(resp2.summary["locked"] >= 1, "locked>=1")
statuses = {r.item_id: r.status for r in resp2.results}
assert_eq(statuses["item-101"], ReceiptStatus.PROCESSABLE, "item101=processable")
assert_eq(statuses["item-102"], ReceiptStatus.NEED_SUPPLEMENT, "item102=need_supplement")
assert_eq(statuses["item-103"], ReceiptStatus.LOCKED, "item103=locked")
missing = {r.item_id: r.missing_materials for r in resp2.results}
assert_true("病历本" in missing["item-102"], "item102缺少病历本")
risk_tags = {r.item_id: r.risk_tags for r in resp2.results}
assert_true(any("高风险" in t for t in risk_tags["item-103"]), "item103有高风险标签")
need_review = {r.item_id: r.need_review for r in resp2.results}
assert_eq(need_review["item-101"], False, "item101无需复核")
assert_eq(need_review["item-102"], True, "item102需复核")
assert_eq(need_review["item-103"], True, "item103需复核")

print()
print("=" * 60)
print("测试 3: 人工复核（高风险锁定后通过）")
print("=" * 60)
service3 = ReceiptService()
item3 = make_item("item-201", "RPT-201", RiskLevel.HIGH, "急性脑梗塞",
                  ["身份证"], ["身份证"], "MRI", "颅脑")
submit3 = service3.submit_batch("BATCH-REVIEW-001", SourceChannel.EMERGENCY, [item3])
assert_eq(submit3.results[0].status, ReceiptStatus.LOCKED, "提交后=locked")
assert_eq(submit3.results[0].need_review, True, "需复核=True")
receipt_id = submit3.results[0].receipt_id
review3 = service3.review_receipts("BATCH-REVIEW-001", [receipt_id],
                                   ActionType.APPROVE,
                                   "已核实，危急值准确，同意通过", "李主任")
assert_eq(review3["results"][0]["success"], True, "复核成功")
assert_eq(review3["results"][0]["status"], "approved", "状态=approved")
assert_eq(review3["summary"]["approved"], 1, "approved=1")
receipt_detail = service3.get_receipt(receipt_id)
assert_eq(receipt_detail["receipt"]["review_opinion"], "已核实，危急值准确，同意通过", "复核意见正确")
assert_eq(receipt_detail["receipt"]["review_user"], "李主任", "复核人正确")
assert_eq(receipt_detail["receipt"]["need_review"], False, "need_review=False")
logs3 = service3.get_audit_logs(receipt_id=receipt_id)
assert_eq(len(logs3), 2, "日志数=2")
assert_eq(logs3[-1]["action"], "approve", "最后动作为approve")
assert_eq(logs3[-1]["operator"], "李主任", "操作人=李主任")

print()
print("=" * 60)
print("测试 4: 重复提交（同批次内报告号重复）")
print("=" * 60)
service4 = ReceiptService()
dup_items = [
    make_item("item-301", "RPT-DUP-001", RiskLevel.LOW, "常规", ["身份证"], ["身份证"]),
    make_item("item-302", "RPT-DUP-001", RiskLevel.LOW, "常规", ["身份证"], ["身份证"]),
]
resp4 = service4.submit_batch("BATCH-DUP-001", SourceChannel.MANUAL, dup_items)
assert_eq(resp4.summary["total"], 2, "total=2")
assert_eq(resp4.summary["failed"], 1, "failed=1")
assert_eq(resp4.summary["processable"], 1, "processable=1")
statuses4 = {r.item_id: r.status for r in resp4.results}
assert_eq(statuses4["item-301"], ReceiptStatus.PROCESSABLE, "item301=processable")
assert_eq(statuses4["item-302"], ReceiptStatus.FAILED, "item302=failed")
failed_result = next(r for r in resp4.results if r.status == ReceiptStatus.FAILED)
assert_true(any("重复" in reason for reason in failed_result.failure_reasons), "失败原因含'重复'")

print()
print("=" * 60)
print("测试 5: 需补充材料后驳回")
print("=" * 60)
service5 = ReceiptService()
item5 = make_item("item-202", "RPT-202", RiskLevel.MEDIUM, "肺结节",
                  ["身份证", "病历本", "既往检查资料"], ["身份证"])
submit5 = service5.submit_batch("BATCH-REVIEW-002", SourceChannel.HIS, [item5])
assert_eq(submit5.results[0].status, ReceiptStatus.NEED_SUPPLEMENT, "状态=需补充")
assert_eq(submit5.results[0].need_review, True, "需复核=True")
receipt_id5 = submit5.results[0].receipt_id
review5 = service5.review_receipts("BATCH-REVIEW-002", [receipt_id5],
                                   ActionType.REJECT,
                                   "材料严重缺失，驳回重报", "王医师")
assert_eq(review5["results"][0]["success"], True, "驳回成功")
assert_eq(review5["results"][0]["status"], "rejected", "状态=rejected")
assert_eq(review5["summary"]["rejected"], 1, "rejected=1")

print()
print("=" * 60)
print("测试 6: 汇总数量与明细合计一致")
print("=" * 60)
service6 = ReceiptService()
items6 = [
    make_item("s-1", "RPT-S-1", RiskLevel.HIGH, "脑出血", [], [], "CT", "头部", "急诊科"),
    make_item("s-2", "RPT-S-2", RiskLevel.HIGH, "主动脉夹层", ["身份证"], [], "CT", "胸部", "心内科"),
    make_item("s-3", "RPT-S-3", RiskLevel.MEDIUM, "肺炎", ["身份证"], ["身份证"], "DR", "胸部"),
    make_item("s-4", "RPT-S-4", RiskLevel.LOW, "常规", ["A", "B"], ["A", "B"]),
    make_item("s-5", "RPT-S-5", RiskLevel.LOW, "常规", ["A", "B"], ["A"]),
]
resp6 = service6.submit_batch("BATCH-SUMMARY-001", SourceChannel.PACS, items6)
s = resp6.summary
assert_eq(s["total"], 5, "total=5")
assert_eq(s["high_risk"], 2, "high_risk=2")
sum_statuses = s["processable"] + s["need_supplement"] + s["locked"] + s["failed"] + s["approved"] + s["rejected"]
assert_true(sum_statuses >= 5, "各状态合计>=5（含approved/rejected）")
detail6 = service6.get_batch("BATCH-SUMMARY-001")
assert_eq(detail6["summary"]["total"], 5, "详情中total=5")
assert_eq(detail6["batch_info"]["high_risk_count"], 2, "batch_info高风险=2")
assert_eq(detail6["logs_count"], 5, "日志数=5")
logs6 = detail6["audit_logs"]
for log in logs6:
    assert_true("log_id" in log, "日志含log_id")
    assert_true("receipt_id" in log, "日志含receipt_id")
    assert_true("from_status" in log, "日志含from_status")
    assert_true("to_status" in log, "日志含to_status")
    assert_true("action" in log, "日志含action")
    assert_true("timestamp" in log, "日志含timestamp")

print()
print("=" * 60)
print("测试 7: 高风险必须经过复核，不允许直接通过")
print("=" * 60)
service7 = ReceiptService()
item7 = make_item("hr-1", "RPT-HR-1", RiskLevel.HIGH, "肺栓塞",
                  ["身份证"], ["身份证"], "CT", "胸部", "急诊科")
submit7 = service7.submit_batch("BATCH-HR-001", SourceChannel.EMERGENCY, [item7])
assert_eq(submit7.results[0].status, ReceiptStatus.LOCKED, "高风险自动锁定")
assert_eq(submit7.results[0].need_review, True, "需人工复核")
receipt_id7 = submit7.results[0].receipt_id
review7 = service7.review_receipts("BATCH-HR-001", [receipt_id7],
                                   ActionType.APPROVE, "复核通过", "张主任")
assert_eq(review7["results"][0]["success"], True, "人工复核通过成功")
assert_eq(review7["results"][0]["status"], "approved", "状态=approved")

print()
print("=" * 60)
print("测试 8: 高风险 + 缺材料 → 优先进入 LOCKED 锁定复核（关键修复验证）")
print("=" * 60)
service8 = ReceiptService()
item8 = make_item(
    "hr-mat-1", "RPT-HR-MAT-1",
    RiskLevel.HIGH, "脑出血",
    ["身份证", "病历本", "既往CT片"],
    ["身份证"],
    "CT", "头部", "急诊科",
)
submit8 = service8.submit_batch("BATCH-HR-MAT-001", SourceChannel.EMERGENCY, [item8])
result8 = submit8.results[0]

assert_eq(result8.status, ReceiptStatus.LOCKED,
          "高风险+缺材料 → 状态=LOCKED（优先锁定，而非需补充）")
assert_eq(result8.need_review, True, "需人工复核=True")
assert_true(len(result8.missing_materials) > 0, "缺失材料信息仍被保留")
assert_true("病历本" in result8.missing_materials, "缺失材料含'病历本'")
assert_true(any("高风险" in tag for tag in result8.risk_tags), "风险标签含'高风险'")
assert_eq(submit8.summary["locked"], 1, "汇总locked=1")
assert_eq(submit8.summary["high_risk"], 1, "汇总high_risk=1")
assert_eq(submit8.summary["need_review"], 1, "汇总need_review=1")

receipt_id8 = result8.receipt_id
detail8 = service8.get_receipt(receipt_id8)
assert_eq(detail8["receipt"]["status"], "locked", "详情状态=locked")
assert_true(len(detail8["receipt"]["missing_materials"]) > 0, "详情中缺失材料仍存在")
assert_eq(len(detail8["audit_logs"]), 1, "日志数=1")
assert_eq(detail8["audit_logs"][0]["to_status"], "locked", "日志to_status=locked")

review8 = service8.review_receipts(
    "BATCH-HR-MAT-001", [receipt_id8],
    ActionType.APPROVE,
    "危急值确认，材料后续补交，先通过",
    "李主任",
)
assert_eq(review8["results"][0]["success"], True, "复核通过成功")
assert_eq(review8["results"][0]["status"], "approved", "复核后状态=approved")
assert_eq(review8["summary"]["approved"], 1, "汇总approved=1")

print()
print("=" * 60)
print("测试 9: 状态优先级验证（FAILED > LOCKED > NEED_SUPPLEMENT）")
print("=" * 60)
from app.rules.engine import RuleResult, _status_priority
from app.domain import ReceiptStatus

assert_true(_status_priority(ReceiptStatus.FAILED) > _status_priority(ReceiptStatus.LOCKED),
           "FAILED 优先级 > LOCKED")
assert_true(_status_priority(ReceiptStatus.LOCKED) > _status_priority(ReceiptStatus.NEED_SUPPLEMENT),
           "LOCKED 优先级 > NEED_SUPPLEMENT")
assert_true(_status_priority(ReceiptStatus.NEED_SUPPLEMENT) > _status_priority(ReceiptStatus.PROCESSABLE),
           "NEED_SUPPLEMENT 优先级 > PROCESSABLE")

rr1 = RuleResult()
rr1.target_status = ReceiptStatus.NEED_SUPPLEMENT
rr2 = RuleResult()
rr2.target_status = ReceiptStatus.LOCKED
rr1.merge(rr2)
assert_eq(rr1.target_status, ReceiptStatus.LOCKED,
          "NEED_SUPPLEMENT 与 LOCKED 合并后 → LOCKED")

rr3 = RuleResult()
rr3.target_status = ReceiptStatus.LOCKED
rr4 = RuleResult()
rr4.target_status = ReceiptStatus.NEED_SUPPLEMENT
rr3.merge(rr4)
assert_eq(rr3.target_status, ReceiptStatus.LOCKED,
          "LOCKED 与 NEED_SUPPLEMENT 合并后 → 保持 LOCKED")

rr5 = RuleResult()
rr5.target_status = ReceiptStatus.FAILED
rr6 = RuleResult()
rr6.target_status = ReceiptStatus.LOCKED
rr5.merge(rr6)
assert_eq(rr5.target_status, ReceiptStatus.FAILED,
          "FAILED 与 LOCKED 合并后 → 保持 FAILED")

print()
print("=" * 60)
print(f"测试总结: 通过 {passed} 个, 失败 {failed} 个")
print("=" * 60)

if failed > 0:
    sys.exit(1)
else:
    print("🎉 所有测试通过!")
    sys.exit(0)
