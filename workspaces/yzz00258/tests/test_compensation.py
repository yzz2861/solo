import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hotel_compensation import (
    CompensationAPI,
    create_default_rules,
    Conclusion,
    RiskLevel,
    NextAction,
    ObjectStatus
)


class TestSingleSuccess(unittest.TestCase):
    def setUp(self):
        rule_set = create_default_rules()
        self.api = CompensationAPI(rule_set, output_dir="./test_output", use_console=False)

    def test_single_success_low_risk_complete_materials(self):
        result = self.api.submit_single(
            business_no="HTL2026060700001",
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="一般投诉",
            compensation_amount=300.0,
            materials={"complaint_form": True}
        )

        self.assertTrue(result.success)
        self.assertEqual(result.conclusion, Conclusion.APPROVE)
        self.assertEqual(result.risk_label, RiskLevel.LOW)
        self.assertEqual(result.next_action, NextAction.AUTO_COMPENSATE)
        self.assertFalse(result.review_required)
        self.assertFalse(result.is_duplicate)
        self.assertIsNotNone(result.audit_id)
        self.assertEqual(len(result.missing_materials), 0)

    def test_single_success_record_updated(self):
        business_no = "HTL2026060700002"
        self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="一般投诉",
            compensation_amount=300.0,
            materials={"complaint_form": True}
        )

        record = self.api.get_record(business_no)
        self.assertIsNotNone(record)
        self.assertEqual(record.business_no, business_no)
        self.assertEqual(len(record.results), 1)
        self.assertEqual(record.current_status, ObjectStatus.APPROVED)
        self.assertGreater(len(record.status_logs), 0)

    def test_single_invalid_input(self):
        result = self.api.submit_single(
            business_no="",
            object_status="",
            time_window="",
            rule_version="",
            operator=""
        )

        self.assertFalse(result.success)
        self.assertEqual(result.conclusion, Conclusion.REJECT)
        self.assertIsNotNone(result.error_message)


class TestBatchPartialFailure(unittest.TestCase):
    def setUp(self):
        rule_set = create_default_rules()
        self.api = CompensationAPI(rule_set, output_dir="./test_output", use_console=False)

    def test_batch_partial_failure(self):
        objects = [
            {
                "business_no": "BATCH001",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "zhangsan",
                "complaint_type": "一般投诉",
                "compensation_amount": 200.0,
                "materials": {"complaint_form": True}
            },
            {
                "business_no": "BATCH002",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "lisi",
                "complaint_type": "重大投诉",
                "compensation_amount": 5000.0,
                "materials": {"complaint_form": True, "evidence": True, "approval_doc": True}
            },
            {
                "business_no": "",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "wangwu"
            },
            {
                "business_no": "BATCH004",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "",
                "complaint_type": "一般投诉"
            },
            {
                "business_no": "BATCH005",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "zhaoliu",
                "complaint_type": "一般投诉",
                "compensation_amount": 100.0,
                "materials": {"complaint_form": True}
            }
        ]

        results, bad_rows = self.api.submit_batch(objects)

        self.assertEqual(len(results), 3)
        self.assertEqual(len(bad_rows), 2)

        success_count = sum(1 for r in results if r.success and not r.review_required)
        review_count = sum(1 for r in results if r.review_required)
        self.assertEqual(success_count, 2)
        self.assertEqual(review_count, 1)

    def test_bad_rows_isolation(self):
        objects = [
            {
                "business_no": "GOOD001",
                "object_status": "PENDING_PROCESS",
                "time_window": "ANYTIME",
                "rule_version": "v1.0",
                "operator": "op1",
                "complaint_type": "一般投诉",
                "materials": {"complaint_form": True}
            },
            {
                "data": "corrupted",
                "invalid": True
            }
        ]

        results, bad_rows = self.api.submit_batch(objects)

        self.assertEqual(len(results), 1)
        self.assertEqual(len(bad_rows), 1)
        self.assertIn("errors", bad_rows[0])
        self.assertGreater(len(bad_rows[0]["errors"]), 0)

    def test_batch_result_file_generated(self):
        import os
        objects = [
            {
                "business_no": "FILE001",
                "object_status": "PENDING_PROCESS",
                "time_window": "WORKING_HOURS",
                "rule_version": "v1.0",
                "operator": "op1",
                "complaint_type": "一般投诉",
                "materials": {"complaint_form": True}
            }
        ]

        results, bad_rows = self.api.submit_batch(objects)
        report_path = self.api.file_handler.save_batch_report(results, bad_rows)

        self.assertTrue(os.path.exists(report_path))
        self.assertTrue(os.path.getsize(report_path) > 0)


class TestManualReview(unittest.TestCase):
    def setUp(self):
        rule_set = create_default_rules()
        self.api = CompensationAPI(rule_set, output_dir="./test_output", use_console=False)

    def test_high_risk_requires_review(self):
        result = self.api.submit_single(
            business_no="REVIEW001",
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="重大投诉",
            compensation_amount=5000.0,
            materials={"complaint_form": True, "evidence": True, "approval_doc": True}
        )

        self.assertTrue(result.success)
        self.assertTrue(result.review_required)
        self.assertEqual(result.risk_label, RiskLevel.HIGH)
        self.assertEqual(result.conclusion, Conclusion.REVIEW)
        self.assertEqual(result.next_action, NextAction.MANUAL_REVIEW)
        self.assertIsNotNone(result.review_reason)

    def test_missing_materials_requires_review(self):
        result = self.api.submit_single(
            business_no="REVIEW002",
            object_status="PENDING_PROCESS",
            time_window=" " * 0 + "WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="服务投诉",
            compensation_amount=1000.0,
            materials={"complaint_form": True, "evidence": False}
        )

        self.assertTrue(result.success)
        self.assertTrue(result.review_required)
        self.assertGreater(len(result.missing_materials), 0)
        self.assertIn("evidence", result.missing_materials)
        self.assertEqual(result.next_action, NextAction.SUPPLEMENT_MATERIALS)

    def test_review_approve(self):
        business_no = "REVIEW003"
        submit_result = self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="重大投诉",
            compensation_amount=3000.0,
            materials={"complaint_form": True, "evidence": True, "approval_doc": True}
        )

        self.assertTrue(submit_result.review_required)

        review_result = self.api.review_approval(
            business_no=business_no,
            audit_id=submit_result.audit_id,
            reviewer="manager01",
            approve=True,
            review_comment="情况属实，同意补偿"
        )

        self.assertIsNotNone(review_result)
        self.assertTrue(review_result.success)
        self.assertEqual(review_result.conclusion, Conclusion.APPROVE)
        self.assertEqual(review_result.next_action, NextAction.AUTO_COMPENSATE)
        self.assertFalse(review_result.review_required)

        record = self.api.get_record(business_no)
        self.assertEqual(record.current_status, ObjectStatus.APPROVED)

    def test_review_reject(self):
        business_no = "REVIEW004"
        submit_result = self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="重大投诉",
            compensation_amount=8000.0,
            materials={"complaint_form": True, "evidence": True, "approval_doc": True}
        )

        review_result = self.api.review_approval(
            business_no=business_no,
            audit_id=submit_result.audit_id,
            reviewer="manager02",
            approve=False,
            review_comment="证据不足，予以驳回"
        )

        self.assertIsNotNone(review_result)
        self.assertEqual(review_result.conclusion, Conclusion.REJECT)
        self.assertEqual(review_result.next_action, NextAction.REJECT_AND_NOTIFY)

        record = self.api.get_record(business_no)
        self.assertEqual(record.current_status, ObjectStatus.REJECTED)

    def test_review_entries_list(self):
        self.api.submit_single(
            business_no="ENTRY001",
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="op1",
            complaint_type="重大投诉",
            materials={"complaint_form": True, "evidence": True, "approval_doc": True}
        )
        self.api.submit_single(
            business_no="ENTRY002",
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="op1",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        review_entries = self.api.get_review_entries()

        self.assertEqual(len(review_entries), 1)
        self.assertEqual(review_entries[0].business_no, "ENTRY001")


class TestDuplicateSubmission(unittest.TestCase):
    def setUp(self):
        rule_set = create_default_rules()
        self.api = CompensationAPI(rule_set, output_dir="./test_output", use_console=False)

    def test_duplicate_submission_detected(self):
        business_no = "DUP001"
        self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="zhangsan",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        dup_result = self.api.submit_single(
            business_no=business_no,
            object_status="PROCESSING",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="lisi",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        self.assertTrue(dup_result.is_duplicate)
        self.assertTrue(dup_result.review_required)

        record = self.api.get_record(business_no)
        self.assertEqual(len(record.results), 2)

    def test_duplicate_requires_manual_confirmation(self):
        business_no = "DUP002"
        self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="op1",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        dup_result = self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="op2",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        self.assertEqual(dup_result.next_action, NextAction.MANUAL_REVIEW)
        self.assertIn("重复提交", dup_result.review_reason)

    def test_different_rule_version_not_duplicate(self):
        business_no = "DUP003"
        r1 = self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WORKING_HOURS",
            rule_version="v1.0",
            operator="op1",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        r2 = self.api.submit_single(
            business_no=business_no,
            object_status="PENDING_PROCESS",
            time_window="WEEKEND",
            rule_version="v2.0",
            operator="op2",
            complaint_type="一般投诉",
            materials={"complaint_form": True}
        )

        self.assertFalse(r2.is_duplicate)


class TestConsoleOutput(unittest.TestCase):
    def setUp(self):
        rule_set = create_default_rules()
        self.api = CompensationAPI(rule_set, output_dir="./test_output", use_console=True)

    def test_console_output_format(self):
        import io
        import contextlib

        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            result = self.api.submit_single(
                business_no="CONSOLE001",
                object_status="PENDING_PROCESS",
                time_window="WORKING_HOURS",
                rule_version="v1.0",
                operator="tester",
                complaint_type="一般投诉",
                materials={"complaint_form": True}
            )

        output = f.getvalue()
        self.assertIn("CONSOLE001", output)
        self.assertIn("APPROVE", output)
        self.assertIn("审计编号", output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
