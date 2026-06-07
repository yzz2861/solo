from datetime import datetime
from app.domain import (
    ReceiptItem,
    RiskLevel,
    SourceChannel,
    ActionType,
    ReceiptStatus,
)
from app.services import ReceiptService


def _make_item(
    item_id: str,
    report_no: str,
    risk_level: RiskLevel = RiskLevel.LOW,
    critical_value_desc: str = "正常",
    required_materials=None,
    provided_materials=None,
    exam_type: str = "CT",
    exam_body_part: str = "胸部",
    department: str = "内科",
) -> ReceiptItem:
    return ReceiptItem(
        item_id=item_id,
        report_no=report_no,
        patient_id=f"P{item_id}",
        patient_name=f"患者{item_id}",
        exam_type=exam_type,
        exam_body_part=exam_body_part,
        critical_value_desc=critical_value_desc,
        risk_level=risk_level,
        required_materials=required_materials or [],
        provided_materials=provided_materials or [],
        department=department,
        reporting_physician="张医生",
        report_time=datetime.now(),
    )


class TestSingleSuccess:
    """测试：单条成功提交（低风险、材料齐全）"""

    def test_single_low_risk_all_materials(self):
        service = ReceiptService()
        item = _make_item(
            item_id="item-001",
            report_no="RPT-001",
            risk_level=RiskLevel.LOW,
            critical_value_desc="肺部小结节",
            required_materials=["身份证", "检查申请单"],
            provided_materials=["身份证", "检查申请单"],
        )

        resp = service.submit_batch(
            batch_no="BATCH-SINGLE-001",
            source_channel=SourceChannel.PACS,
            items=[item],
        )

        assert resp.batch_no == "BATCH-SINGLE-001"
        assert resp.total_count == 1
        assert len(resp.results) == 1

        result = resp.results[0]
        assert result.status == ReceiptStatus.PROCESSABLE
        assert result.need_review is False
        assert len(result.failure_reasons) == 0
        assert len(result.missing_materials) == 0

        assert resp.summary["total"] == 1
        assert resp.summary["processable"] == 1
        assert resp.summary["need_supplement"] == 0
        assert resp.summary["locked"] == 0
        assert resp.summary["failed"] == 0
        assert resp.summary["high_risk"] == 0

        batch_info = service.get_batch("BATCH-SINGLE-001")
        assert batch_info is not None
        assert batch_info["summary"]["total"] == 1
        assert batch_info["logs_count"] == 1

        logs = service.get_audit_logs(batch_no="BATCH-SINGLE-001")
        assert len(logs) == 1
        assert logs[0]["action"] == ActionType.SUBMIT.value
        assert logs[0]["to_status"] == ReceiptStatus.PROCESSABLE.value
        assert logs[0]["report_no"] == "RPT-001"


class TestBatchPartialFailure:
    """测试：批量部分失败（混合成功、缺材料、高风险锁定）"""

    def test_batch_mixed(self):
        service = ReceiptService()
        items = [
            _make_item(
                item_id="item-101",
                report_no="RPT-101",
                risk_level=RiskLevel.LOW,
                critical_value_desc="常规检查",
                required_materials=["身份证"],
                provided_materials=["身份证"],
            ),
            _make_item(
                item_id="item-102",
                report_no="RPT-102",
                risk_level=RiskLevel.LOW,
                critical_value_desc="常规检查",
                required_materials=["身份证", "病历本"],
                provided_materials=["身份证"],
            ),
            _make_item(
                item_id="item-103",
                report_no="RPT-103",
                risk_level=RiskLevel.HIGH,
                critical_value_desc="脑出血",
                required_materials=["身份证"],
                provided_materials=["身份证"],
                exam_body_part="头部",
                department="急诊科",
            ),
            _make_item(
                item_id="item-104",
                report_no="RPT-104",
                risk_level=RiskLevel.MEDIUM,
                critical_value_desc="骨折",
                required_materials=["身份证", "检查申请单"],
                provided_materials=["身份证", "检查申请单"],
            ),
        ]

        resp = service.submit_batch(
            batch_no="BATCH-MIXED-001",
            source_channel=SourceChannel.PACS,
            items=items,
        )

        assert resp.total_count == 4
        assert resp.summary["total"] == 4
        assert resp.summary["processable"] >= 1
        assert resp.summary["need_supplement"] >= 1
        assert resp.summary["locked"] >= 1
        assert resp.summary["high_risk"] == 1
        assert resp.summary["need_review"] >= 2

        statuses = {r.item_id: r.status for r in resp.results}
        assert statuses["item-101"] == ReceiptStatus.PROCESSABLE
        assert statuses["item-102"] == ReceiptStatus.NEED_SUPPLEMENT
        assert statuses["item-103"] == ReceiptStatus.LOCKED

        missing = {r.item_id: r.missing_materials for r in resp.results}
        assert "病历本" in missing["item-102"]
        assert len(missing["item-101"]) == 0

        risk_tags = {r.item_id: r.risk_tags for r in resp.results}
        assert any("高风险" in tag for tag in risk_tags["item-103"])
        assert any("脑出血" in tag for tag in risk_tags["item-103"])

        need_review = {r.item_id: r.need_review for r in resp.results}
        assert need_review["item-101"] is False
        assert need_review["item-102"] is True
        assert need_review["item-103"] is True

        batch_detail = service.get_batch("BATCH-MIXED-001")
        assert batch_detail["summary"]["total"] == 4
        assert batch_detail["logs_count"] == 4


class TestManualReview:
    """测试：人工复核（高风险锁定后人工通过/驳回）"""

    def test_high_risk_locked_then_approve(self):
        service = ReceiptService()
        item = _make_item(
            item_id="item-201",
            report_no="RPT-201",
            risk_level=RiskLevel.HIGH,
            critical_value_desc="急性脑梗塞",
            required_materials=["身份证"],
            provided_materials=["身份证"],
            exam_body_part="颅脑",
        )

        submit_resp = service.submit_batch(
            batch_no="BATCH-REVIEW-001",
            source_channel=SourceChannel.EMERGENCY,
            items=[item],
        )

        assert submit_resp.results[0].status == ReceiptStatus.LOCKED
        assert submit_resp.results[0].need_review is True
        assert submit_resp.summary["locked"] == 1
        assert submit_resp.summary["high_risk"] == 1

        receipt_id = submit_resp.results[0].receipt_id

        review_resp = service.review_receipts(
            batch_no="BATCH-REVIEW-001",
            receipt_ids=[receipt_id],
            action=ActionType.APPROVE,
            review_opinion="已核实，危急值准确，同意通过",
            review_user="李主任",
        )

        assert review_resp["results"][0]["success"] is True
        assert review_resp["results"][0]["status"] == ReceiptStatus.APPROVED.value
        assert review_resp["summary"]["approved"] == 1
        assert review_resp["summary"]["locked"] == 0

        receipt_detail = service.get_receipt(receipt_id)
        assert receipt_detail["receipt"]["review_opinion"] == "已核实，危急值准确，同意通过"
        assert receipt_detail["receipt"]["review_user"] == "李主任"
        assert receipt_detail["receipt"]["need_review"] is False

        logs = service.get_audit_logs(receipt_id=receipt_id)
        assert len(logs) == 2
        assert logs[-1]["action"] == ActionType.APPROVE.value
        assert logs[-1]["operator"] == "李主任"
        assert logs[-1]["review_opinion"] == "已核实，危急值准确，同意通过"

    def test_need_supplement_then_reject(self):
        service = ReceiptService()
        item = _make_item(
            item_id="item-202",
            report_no="RPT-202",
            risk_level=RiskLevel.MEDIUM,
            critical_value_desc="肺结节",
            required_materials=["身份证", "病历本", "既往检查资料"],
            provided_materials=["身份证"],
        )

        submit_resp = service.submit_batch(
            batch_no="BATCH-REVIEW-002",
            source_channel=SourceChannel.HIS,
            items=[item],
        )

        assert submit_resp.results[0].status == ReceiptStatus.NEED_SUPPLEMENT
        assert submit_resp.results[0].need_review is True

        receipt_id = submit_resp.results[0].receipt_id

        review_resp = service.review_receipts(
            batch_no="BATCH-REVIEW-002",
            receipt_ids=[receipt_id],
            action=ActionType.REJECT,
            review_opinion="材料严重缺失，驳回重报",
            review_user="王医师",
        )

        assert review_resp["results"][0]["success"] is True
        assert review_resp["results"][0]["status"] == ReceiptStatus.REJECTED.value
        assert review_resp["summary"]["rejected"] == 1

        logs = service.get_audit_logs(receipt_id=receipt_id)
        assert len(logs) == 2
        assert logs[-1]["action"] == ActionType.REJECT.value


class TestDuplicateSubmission:
    """测试：重复提交（同批次内报告号/明细项ID重复）"""

    def test_duplicate_report_no_in_same_batch(self):
        service = ReceiptService()
        items = [
            _make_item(
                item_id="item-301",
                report_no="RPT-DUP-001",
                risk_level=RiskLevel.LOW,
                required_materials=["身份证"],
                provided_materials=["身份证"],
            ),
            _make_item(
                item_id="item-302",
                report_no="RPT-DUP-001",
                risk_level=RiskLevel.LOW,
                required_materials=["身份证"],
                provided_materials=["身份证"],
            ),
        ]

        resp = service.submit_batch(
            batch_no="BATCH-DUP-001",
            source_channel=SourceChannel.MANUAL,
            items=items,
        )

        assert resp.summary["total"] == 2
        assert resp.summary["failed"] == 1
        assert resp.summary["processable"] == 1

        statuses = {r.item_id: r.status for r in resp.results}
        assert statuses["item-301"] == ReceiptStatus.PROCESSABLE
        assert statuses["item-302"] == ReceiptStatus.FAILED

        failed_result = next(r for r in resp.results if r.item_id == "item-302")
        assert any("重复" in reason for reason in failed_result.failure_reasons)

    def test_duplicate_item_id_in_same_batch(self):
        service = ReceiptService()
        items = [
            _make_item(
                item_id="item-303",
                report_no="RPT-DUP-003",
                risk_level=RiskLevel.LOW,
                required_materials=["身份证"],
                provided_materials=["身份证"],
            ),
            _make_item(
                item_id="item-303",
                report_no="RPT-DUP-004",
                risk_level=RiskLevel.LOW,
                required_materials=["身份证"],
                provided_materials=["身份证"],
            ),
        ]

        resp = service.submit_batch(
            batch_no="BATCH-DUP-002",
            source_channel=SourceChannel.MANUAL,
            items=items,
        )

        assert resp.summary["failed"] == 1
        failed = [r for r in resp.results if r.status == ReceiptStatus.FAILED]
        assert len(failed) == 1
        assert any("重复" in reason for reason in failed[0].failure_reasons)

    def test_duplicate_across_batches_not_blocked(self):
        service = ReceiptService()
        item1 = _make_item(
            item_id="item-305",
            report_no="RPT-DUP-CROSS",
            risk_level=RiskLevel.LOW,
            required_materials=["身份证"],
            provided_materials=["身份证"],
        )
        resp1 = service.submit_batch("BATCH-DUP-CROSS-1", SourceChannel.PACS, [item1])
        assert resp1.summary["failed"] == 0
        assert resp1.summary["processable"] == 1

        item2 = _make_item(
            item_id="item-306",
            report_no="RPT-DUP-CROSS",
            risk_level=RiskLevel.LOW,
            required_materials=["身份证"],
            provided_materials=["身份证"],
        )
        resp2 = service.submit_batch("BATCH-DUP-CROSS-2", SourceChannel.PACS, [item2])
        assert resp2.summary["failed"] == 0
        assert resp2.summary["processable"] == 1


class TestSummaryAndLogs:
    """测试：汇总数量、明细合计、风险标签、日志内容"""

    def test_summary_counts_match(self):
        service = ReceiptService()
        items = [
            _make_item("s-1", "RPT-S-1", RiskLevel.HIGH, "脑出血", [], [], "CT", "头部", "急诊科"),
            _make_item("s-2", "RPT-S-2", RiskLevel.HIGH, "主动脉夹层", ["身份证"], [], "CT", "胸部", "心内科"),
            _make_item("s-3", "RPT-S-3", RiskLevel.MEDIUM, "肺炎", ["身份证"], ["身份证"], "DR", "胸部"),
            _make_item("s-4", "RPT-S-4", RiskLevel.LOW, "常规", ["A", "B"], ["A", "B"]),
            _make_item("s-5", "RPT-S-5", RiskLevel.LOW, "常规", ["A", "B"], ["A"]),
        ]

        resp = service.submit_batch(
            batch_no="BATCH-SUMMARY-001",
            source_channel=SourceChannel.PACS,
            items=items,
        )

        summary = resp.summary
        assert summary["total"] == 5
        assert summary["high_risk"] == 2
        assert summary["need_review"] >= 3

        processable = summary["processable"]
        need_supp = summary["need_supplement"]
        locked = summary["locked"]
        failed = summary["failed"]
        assert processable + need_supp + locked + failed == 5

        detail = service.get_batch("BATCH-SUMMARY-001")
        assert detail["summary"]["total"] == 5
        assert detail["batch_info"]["total_count"] == 5
        assert detail["batch_info"]["high_risk_count"] == 2

        assert detail["logs_count"] == 5
        logs = detail["audit_logs"]
        risk_tag_logs = [log for log in logs if log["risk_tags"]]
        assert len(risk_tag_logs) >= 2

        for log in logs:
            assert "log_id" in log
            assert "receipt_id" in log
            assert "batch_no" in log
            assert "from_status" in log
            assert "to_status" in log
            assert "action" in log
            assert "timestamp" in log

        high_risk_logs = [log for log in logs if any("高风险" in tag for tag in log["risk_tags"])]
        assert len(high_risk_logs) >= 2

    def test_receipt_detail_complete(self):
        service = ReceiptService()
        item = _make_item(
            "d-1", "RPT-D-1", RiskLevel.HIGH, "脑疝",
            ["身份证", "病历"], ["身份证"],
            "MRI", "颅脑", "神经外科",
        )

        submit_resp = service.submit_batch("BATCH-DETAIL-001", SourceChannel.EMERGENCY, [item])
        receipt_id = submit_resp.results[0].receipt_id

        detail = service.get_receipt(receipt_id)
        assert detail is not None
        assert detail["receipt"]["receipt_id"] == receipt_id
        assert detail["receipt"]["batch_no"] == "BATCH-DETAIL-001"
        assert detail["receipt"]["status"] == ReceiptStatus.LOCKED.value
        assert len(detail["receipt"]["risk_tags"]) > 0
        assert len(detail["audit_logs"]) == 1

        service.review_receipts(
            "BATCH-DETAIL-001", [receipt_id],
            ActionType.APPROVE, "符合条件，通过", "赵主任",
        )

        detail_after = service.get_receipt(receipt_id)
        assert len(detail_after["audit_logs"]) == 2
        assert detail_after["receipt"]["review_opinion"] == "符合条件，通过"
        assert detail_after["receipt"]["review_user"] == "赵主任"


class TestHighRiskCannotDirectApprove:
    """测试：高风险不允许直接通过（必须经过锁定/复核流程）"""

    def test_locked_direct_approve_works_via_review(self):
        service = ReceiptService()
        item = _make_item(
            "hr-1", "RPT-HR-1", RiskLevel.HIGH, "肺栓塞",
            ["身份证"], ["身份证"],
            "CT", "胸部", "急诊科",
        )

        submit_resp = service.submit_batch("BATCH-HR-001", SourceChannel.EMERGENCY, [item])
        assert submit_resp.results[0].status == ReceiptStatus.LOCKED
        assert submit_resp.results[0].need_review is True

        receipt_id = submit_resp.results[0].receipt_id
        review_resp = service.review_receipts(
            "BATCH-HR-001", [receipt_id],
            ActionType.APPROVE, "复核通过", "张主任",
        )
        assert review_resp["results"][0]["success"] is True
        assert review_resp["results"][0]["status"] == ReceiptStatus.APPROVED.value
