#!/usr/bin/env python3

import sys
import os
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import (
    InspectionInput,
    InspectionOutput,
    MasterData,
    ApplicationRecord,
    EvidenceMaterial,
    ThresholdConfig,
    DefectType,
    RiskLabel,
    BusinessConclusion,
    NextAction,
    generate_audit_number,
    InspectionStatus,
)
from app.rules import (
    assess_defect_risk,
    check_evidence_completeness,
    check_application_time_validity,
    check_id_validity,
    check_config_completeness,
    determine_review_requirement,
    determine_business_conclusion,
    determine_next_action,
    calculate_risk_score,
)
from app.services import InspectionService, process_batch_inspection
from app.states import InspectionStateMachine, StateTransitionError, can_transition
from app.records import AuditRecordManager, BadRowRecord
from app.api import create_single_inspection_input, create_batch_inspection_inputs, inspection_api
from app.utils import get_logger


class TestModels(unittest.TestCase):
    def test_audit_number_generation(self):
        audit_num = generate_audit_number()
        self.assertTrue(audit_num.startswith("INS-"))
        self.assertEqual(len(audit_num.split("-")), 3)
        self.assertEqual(len(audit_num.split("-")[1]), 14)

    def test_inspection_output_to_dict(self):
        output = InspectionOutput(
            audit_number="INS-TEST-001",
            blade_id="BLD-001",
            application_id="APP-001",
            business_conclusion=BusinessConclusion.PASS,
            risk_label=RiskLabel.LOW,
            next_action=NextAction.DIRECT_PASS,
            risk_score=30.0,
        )
        d = output.to_dict()
        self.assertEqual(d["audit_number"], "INS-TEST-001")
        self.assertEqual(d["business_conclusion"], "pass")
        self.assertEqual(d["risk_label"], "low_risk")
        self.assertEqual(d["next_action"], "direct_pass")


class TestRiskAssessment(unittest.TestCase):
    def setUp(self):
        self.config = ThresholdConfig()

    def test_crack_high_risk(self):
        app = ApplicationRecord(
            application_id="APP-TEST-001",
            blade_id="BLD-TEST-001",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="测试裂纹",
            defect_size_mm=80.0,
            defect_depth_mm=10.0,
        )
        score = calculate_risk_score(app, self.config)
        self.assertGreaterEqual(score, 80)
        label, detail = assess_defect_risk(app, self.config)
        self.assertEqual(label, RiskLabel.HIGH)

    def test_crack_medium_risk(self):
        app = ApplicationRecord(
            application_id="APP-TEST-002",
            blade_id="BLD-TEST-002",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="测试裂纹",
            defect_size_mm=30.0,
            defect_depth_mm=2.0,
        )
        label, _ = assess_defect_risk(app, self.config)
        self.assertEqual(label, RiskLabel.MEDIUM)

    def test_crack_low_risk(self):
        app = ApplicationRecord(
            application_id="APP-TEST-003",
            blade_id="BLD-TEST-003",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="测试裂纹",
            defect_size_mm=10.0,
        )
        label, _ = assess_defect_risk(app, self.config)
        self.assertEqual(label, RiskLabel.LOW)

    def test_no_risk(self):
        app = ApplicationRecord(
            application_id="APP-TEST-004",
            blade_id="BLD-TEST-004",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="测试",
            defect_size_mm=0.0,
        )
        label, _ = assess_defect_risk(app, self.config)
        self.assertEqual(label, RiskLabel.NO_RISK)


class TestEvidenceCheck(unittest.TestCase):
    def setUp(self):
        self.config = ThresholdConfig()

    def test_complete_evidence(self):
        evidence = [
            EvidenceMaterial("E1", "A1", "photo", "/p1.jpg", "2026-06-01 10:00:00"),
            EvidenceMaterial("E2", "A1", "report", "/r1.pdf", "2026-06-01 10:05:00"),
        ]
        ok, missing = check_evidence_completeness(evidence, self.config)
        self.assertTrue(ok)
        self.assertEqual(missing, [])

    def test_missing_evidence(self):
        evidence = [
            EvidenceMaterial("E1", "A1", "photo", "/p1.jpg", "2026-06-01 10:00:00"),
        ]
        ok, missing = check_evidence_completeness(evidence, self.config)
        self.assertFalse(ok)
        self.assertIn("report", missing)

    def test_empty_evidence(self):
        ok, missing = check_evidence_completeness([], self.config)
        self.assertFalse(ok)
        self.assertEqual(len(missing), 2)


class TestTimeValidity(unittest.TestCase):
    def setUp(self):
        self.config = ThresholdConfig(max_application_age_days=30)

    def test_valid_time(self):
        app = ApplicationRecord(
            application_id="APP-TEST",
            blade_id="BLD-TEST",
            applicant="test",
            application_date=(datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, err = check_application_time_validity(app, self.config)
        self.assertTrue(ok)
        self.assertEqual(err, "")

    def test_expired_application(self):
        app = ApplicationRecord(
            application_id="APP-TEST",
            blade_id="BLD-TEST",
            applicant="test",
            application_date="2020-01-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, err = check_application_time_validity(app, self.config)
        self.assertFalse(ok)
        self.assertIn("超过有效期", err)

    def test_future_date(self):
        app = ApplicationRecord(
            application_id="APP-TEST",
            blade_id="BLD-TEST",
            applicant="test",
            application_date=(datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, err = check_application_time_validity(app, self.config)
        self.assertFalse(ok)
        self.assertIn("晚于当前日期", err)

    def test_invalid_date_format(self):
        app = ApplicationRecord(
            application_id="APP-TEST",
            blade_id="BLD-TEST",
            applicant="test",
            application_date="not-a-date",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, err = check_application_time_validity(app, self.config)
        self.assertFalse(ok)
        self.assertIn("格式错误", err)

    def test_with_reference_time(self):
        app = ApplicationRecord(
            application_id="APP-TEST",
            blade_id="BLD-TEST",
            applicant="test",
            application_date="2026-05-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, _ = check_application_time_validity(app, self.config, reference_time="2026-05-15")
        self.assertTrue(ok)

        ok2, _ = check_application_time_validity(app, self.config, reference_time="2026-06-15")
        self.assertFalse(ok2)


class TestIdValidity(unittest.TestCase):
    def test_valid_ids(self):
        master = MasterData(
            blade_id="BLD-2024001",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
        )
        app = ApplicationRecord(
            application_id="APP-20260601-A001",
            blade_id="BLD-2024001",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, errors = check_id_validity(master, app)
        self.assertTrue(ok)
        self.assertEqual(errors, [])

    def test_invalid_blade_id(self):
        master = MasterData(
            blade_id="invalid_id",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
        )
        app = ApplicationRecord(
            application_id="APP-20260601-A001",
            blade_id="invalid_id",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, errors = check_id_validity(master, app)
        self.assertFalse(ok)
        self.assertTrue(any("叶片编号格式错误" in e for e in errors))

    def test_invalid_application_id(self):
        master = MasterData(
            blade_id="BLD-2024001",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
        )
        app = ApplicationRecord(
            application_id="bad_app_id",
            blade_id="BLD-2024001",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, errors = check_id_validity(master, app)
        self.assertFalse(ok)
        self.assertTrue(any("申请编号格式错误" in e for e in errors))

    def test_mismatched_blade_ids(self):
        master = MasterData(
            blade_id="BLD-2024001",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
        )
        app = ApplicationRecord(
            application_id="APP-20260601-A001",
            blade_id="BLD-2024002",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, errors = check_id_validity(master, app)
        self.assertFalse(ok)
        self.assertTrue(any("不一致" in e for e in errors))

    def test_empty_ids(self):
        master = MasterData(
            blade_id="",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
        )
        app = ApplicationRecord(
            application_id="",
            blade_id="",
            applicant="test",
            application_date="2026-06-01",
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="test",
        )
        ok, errors = check_id_validity(master, app)
        self.assertFalse(ok)
        self.assertTrue(any("叶片编号为空" in e for e in errors))
        self.assertTrue(any("申请编号为空" in e for e in errors))


class TestConfigCompleteness(unittest.TestCase):
    def test_valid_config(self):
        config = ThresholdConfig()
        ok, errors = check_config_completeness(config)
        self.assertTrue(ok)
        self.assertEqual(errors, [])

    def test_missing_threshold(self):
        config = ThresholdConfig(crack_size_high_mm=0)
        ok, errors = check_config_completeness(config)
        self.assertFalse(ok)
        self.assertTrue(any("裂纹高风险阈值" in e for e in errors))

    def test_invalid_threshold_relation(self):
        config = ThresholdConfig(
            crack_size_high_mm=20.0,
            crack_size_medium_mm=50.0,
        )
        ok, errors = check_config_completeness(config)
        self.assertFalse(ok)
        self.assertTrue(any("必须大于" in e for e in errors))

    def test_missing_evidence_types(self):
        config = ThresholdConfig(required_evidence_types=[])
        ok, errors = check_config_completeness(config)
        self.assertFalse(ok)
        self.assertTrue(any("佐证材料类型" in e for e in errors))

    def test_missing_review_levels(self):
        config = ThresholdConfig(review_required_risk_levels=[])
        ok, errors = check_config_completeness(config)
        self.assertFalse(ok)
        self.assertTrue(any("复核风险等级" in e for e in errors))


class TestReviewRequirement(unittest.TestCase):
    def setUp(self):
        self.config = ThresholdConfig()

    def test_high_risk_requires_review(self):
        self.assertTrue(
            determine_review_requirement(RiskLabel.HIGH, True, self.config)
        )

    def test_missing_material_requires_review(self):
        self.assertTrue(
            determine_review_requirement(RiskLabel.MISSING_MATERIAL, False, self.config)
        )

    def test_low_risk_with_complete_evidence_no_review(self):
        self.assertFalse(
            determine_review_requirement(RiskLabel.LOW, True, self.config)
        )


class TestBusinessConclusion(unittest.TestCase):
    def test_pass_low_risk_complete(self):
        conclusion = determine_business_conclusion(
            RiskLabel.LOW, False, True, True, True, True
        )
        self.assertEqual(conclusion, BusinessConclusion.PASS)

    def test_review_required_high_risk(self):
        conclusion = determine_business_conclusion(
            RiskLabel.HIGH, True, True, True, True, True
        )
        self.assertEqual(conclusion, BusinessConclusion.REVIEW_REQUIRED)

    def test_reject_invalid_id(self):
        conclusion = determine_business_conclusion(
            RiskLabel.NO_RISK, False, True, False, True, True
        )
        self.assertEqual(conclusion, BusinessConclusion.REJECT)

    def test_reject_invalid_time(self):
        conclusion = determine_business_conclusion(
            RiskLabel.NO_RISK, False, True, True, False, True
        )
        self.assertEqual(conclusion, BusinessConclusion.REJECT)

    def test_pending_incomplete_config(self):
        conclusion = determine_business_conclusion(
            RiskLabel.LOW, False, True, True, True, False
        )
        self.assertEqual(conclusion, BusinessConclusion.PENDING)

    def test_review_required_missing_material(self):
        conclusion = determine_business_conclusion(
            RiskLabel.MISSING_MATERIAL, True, False, True, True, True
        )
        self.assertEqual(conclusion, BusinessConclusion.REVIEW_REQUIRED)


class TestNextAction(unittest.TestCase):
    def test_direct_pass(self):
        action = determine_next_action(
            BusinessConclusion.PASS, RiskLabel.LOW, []
        )
        self.assertEqual(action, NextAction.DIRECT_PASS)

    def test_routine_inspection(self):
        action = determine_next_action(
            BusinessConclusion.PASS, RiskLabel.NO_RISK, []
        )
        self.assertEqual(action, NextAction.ROUTINE_INSPECTION)

    def test_enter_review(self):
        action = determine_next_action(
            BusinessConclusion.REVIEW_REQUIRED, RiskLabel.MEDIUM, []
        )
        self.assertEqual(action, NextAction.ENTER_REVIEW)

    def test_schedule_repair_for_high_risk(self):
        action = determine_next_action(
            BusinessConclusion.REVIEW_REQUIRED, RiskLabel.HIGH, []
        )
        self.assertEqual(action, NextAction.SCHEDULE_REPAIR)

    def test_supplement_material(self):
        action = determine_next_action(
            BusinessConclusion.REVIEW_REQUIRED, RiskLabel.MISSING_MATERIAL, ["report"]
        )
        self.assertEqual(action, NextAction.SUPPLEMENT_MATERIAL)

    def test_reject_and_archive(self):
        action = determine_next_action(
            BusinessConclusion.REJECT, RiskLabel.NO_RISK, []
        )
        self.assertEqual(action, NextAction.REJECT_AND_ARCHIVE)


class TestStateMachine(unittest.TestCase):
    def test_initial_state(self):
        sm = InspectionStateMachine()
        self.assertEqual(sm.current_status, InspectionStatus.DRAFT)

    def test_valid_transition(self):
        sm = InspectionStateMachine()
        record = sm.transition_to(
            InspectionStatus.SUBMITTED, operator="test", blade_id="BLD-001"
        )
        self.assertEqual(sm.current_status, InspectionStatus.SUBMITTED)
        self.assertEqual(record.status, InspectionStatus.SUBMITTED)
        self.assertEqual(len(sm.history), 1)

    def test_invalid_transition(self):
        sm = InspectionStateMachine()
        with self.assertRaises(StateTransitionError):
            sm.transition_to(
                InspectionStatus.COMPLETED, operator="test", blade_id="BLD-001"
            )

    def test_review_entry(self):
        sm = InspectionStateMachine()
        self.assertFalse(sm.can_enter_review())

        sm.transition_to(InspectionStatus.SUBMITTED, "test", blade_id="BLD-001")
        sm.transition_to(InspectionStatus.AUTO_INSPECTION, "system", blade_id="BLD-001")
        self.assertTrue(sm.can_enter_review())

    def test_review_entry_point_info(self):
        sm = InspectionStateMachine()
        info = sm.get_review_entry_point()
        self.assertEqual(info["entry_status"], "pending_review")
        self.assertIn("review_pass", info["review_actions"])
        self.assertIn("review_reject", info["review_actions"])
        self.assertIn("supplement_material", info["review_actions"])

    def test_can_transition_function(self):
        self.assertTrue(can_transition(
            InspectionStatus.DRAFT, InspectionStatus.SUBMITTED
        ))
        self.assertFalse(can_transition(
            InspectionStatus.DRAFT, InspectionStatus.COMPLETED
        ))


class TestInspectionService(unittest.TestCase):
    def setUp(self):
        self.config = ThresholdConfig()
        self.service = InspectionService(config=self.config)

    def _make_input(self, **kwargs):
        defaults = dict(
            blade_id="BLD-2024001",
            turbine_id="WT-001",
            wind_farm_id="WF-A",
            blade_model="BM-59.5",
            manufacture_date="2020-01-01",
            install_date="2020-03-01",
            application_id="APP-20260601-A001",
            applicant="张工",
            application_date=(datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            inspection_type="routine",
            defect_type=DefectType.CRACK,
            defect_description="测试裂纹",
            defect_size_mm=10.0,
            defect_depth_mm=1.0,
            evidence_types=["photo", "report"],
            row_number=1,
        )
        defaults.update(kwargs)

        master = MasterData(
            blade_id=defaults["blade_id"],
            turbine_id=defaults["turbine_id"],
            wind_farm_id=defaults["wind_farm_id"],
            blade_model=defaults["blade_model"],
            manufacture_date=defaults["manufacture_date"],
            install_date=defaults["install_date"],
        )
        app = ApplicationRecord(
            application_id=defaults["application_id"],
            blade_id=defaults["blade_id"],
            applicant=defaults["applicant"],
            application_date=defaults["application_date"],
            inspection_type=defaults["inspection_type"],
            defect_type=defaults["defect_type"],
            defect_description=defaults["defect_description"],
            defect_size_mm=defaults["defect_size_mm"],
            defect_depth_mm=defaults["defect_depth_mm"],
        )
        evidences = []
        for i, et in enumerate(defaults["evidence_types"]):
            evidences.append(
                EvidenceMaterial(
                    evidence_id=f"EVD-{i:03d}",
                    application_id=defaults["application_id"],
                    material_type=et,
                    file_path=f"/data/{et}_{i:03d}.jpg",
                    upload_time="2026-06-01 10:00:00",
                )
            )

        return InspectionInput(
            master_data=master,
            application=app,
            evidence_list=evidences,
            history_list=[],
            threshold_config=self.config,
            row_number=defaults["row_number"],
        )

    def test_complete_data_pass(self):
        input_data = self._make_input(
            defect_size_mm=5.0,
            evidence_types=["photo", "report"],
        )
        output = self.service.process_single(input_data)
        self.assertEqual(output.business_conclusion, BusinessConclusion.PASS)
        self.assertEqual(output.risk_label, RiskLabel.LOW)
        self.assertEqual(output.next_action, NextAction.DIRECT_PASS)
        self.assertFalse(output.review_required)
        self.assertTrue(output.audit_number.startswith("INS-"))
        self.assertEqual(output.missing_evidence_types, [])

    def test_high_risk_enters_review(self):
        input_data = self._make_input(
            defect_size_mm=100.0,
            defect_depth_mm=10.0,
        )
        output = self.service.process_single(input_data)
        self.assertEqual(output.business_conclusion, BusinessConclusion.REVIEW_REQUIRED)
        self.assertEqual(output.risk_label, RiskLabel.HIGH)
        self.assertTrue(output.review_required)
        self.assertEqual(output.next_action, NextAction.SCHEDULE_REPAIR)

    def test_missing_material_enters_review(self):
        input_data = self._make_input(
            evidence_types=["photo"],
        )
        output = self.service.process_single(input_data)
        self.assertEqual(output.business_conclusion, BusinessConclusion.REVIEW_REQUIRED)
        self.assertEqual(output.risk_label, RiskLabel.MISSING_MATERIAL)
        self.assertTrue(output.review_required)
        self.assertIn("report", output.missing_evidence_types)
        self.assertEqual(output.next_action, NextAction.SUPPLEMENT_MATERIAL)

    def test_time_expired_rejected(self):
        input_data = self._make_input(
            application_date="2020-01-01",
        )
        output = self.service.process_single(input_data)
        self.assertEqual(output.business_conclusion, BusinessConclusion.REJECT)
        self.assertEqual(output.next_action, NextAction.REJECT_AND_ARCHIVE)
        self.assertIn("超过有效期", output.error_message)

    def test_invalid_id_rejected(self):
        input_data = self._make_input(
            blade_id="BAD_ID",
            application_id="BAD_APP",
        )
        output = self.service.process_single(input_data)
        self.assertEqual(output.business_conclusion, BusinessConclusion.REJECT)
        self.assertEqual(output.next_action, NextAction.REJECT_AND_ARCHIVE)
        self.assertTrue(len(output.error_message) > 0)

    def test_audit_number_unique(self):
        input1 = self._make_input(row_number=1)
        input2 = self._make_input(row_number=2)
        out1 = self.service.process_single(input1)
        out2 = self.service.process_single(input2)
        self.assertNotEqual(out1.audit_number, out2.audit_number)

    def test_batch_processing(self):
        inputs = [
            self._make_input(row_number=1, defect_size_mm=5.0),
            self._make_input(row_number=2, defect_size_mm=100.0),
            self._make_input(row_number=3, evidence_types=["photo"]),
        ]
        results, bad_rows = self.service.process_batch(inputs)
        self.assertEqual(len(results), 3)
        self.assertEqual(len(bad_rows), 0)

        pass_count = sum(
            1 for r in results if r.business_conclusion == BusinessConclusion.PASS
        )
        review_count = sum(
            1 for r in results if r.business_conclusion == BusinessConclusion.REVIEW_REQUIRED
        )
        self.assertEqual(pass_count, 1)
        self.assertEqual(review_count, 2)


class TestBadRowIsolation(unittest.TestCase):
    def test_bad_row_record(self):
        bad = BadRowRecord(
            row_number=5,
            raw_data={"test": "data"},
            error_type="parse_error",
            error_message="无法解析数据",
        )
        d = bad.to_dict()
        self.assertEqual(d["row_number"], 5)
        self.assertEqual(d["error_type"], "parse_error")
        self.assertEqual(d["error_message"], "无法解析数据")

    def test_audit_record_manager(self):
        manager = AuditRecordManager()
        self.assertEqual(len(manager.results), 0)
        self.assertEqual(len(manager.bad_rows), 0)

        bad_row = BadRowRecord(
            row_number=1,
            raw_data={},
            error_type="test",
            error_message="test error",
        )
        manager.add_bad_row(bad_row)
        self.assertEqual(manager.bad_rows_count if hasattr(manager, 'bad_rows_count') else len(manager.bad_rows), 1)

        summary = manager.get_summary()
        self.assertEqual(summary["bad_rows_count"], 1)
        self.assertEqual(summary["total_records"], 1)


class TestAPIEndpoints(unittest.TestCase):
    def test_create_single_input(self):
        master_dict = {
            "blade_id": "BLD-2024001",
            "turbine_id": "WT-001",
            "wind_farm_id": "WF-A",
            "blade_model": "BM-59.5",
            "manufacture_date": "2020-01-01",
            "install_date": "2020-03-01",
        }
        app_dict = {
            "application_id": "APP-20260601-A001",
            "blade_id": "BLD-2024001",
            "applicant": "张工",
            "application_date": "2026-06-01",
            "inspection_type": "routine",
            "defect_type": "crack",
            "defect_description": "测试",
            "defect_size_mm": 10.0,
        }
        evidence_list = [
            {
                "evidence_id": "EVD-001",
                "application_id": "APP-20260601-A001",
                "material_type": "photo",
                "file_path": "/test.jpg",
                "upload_time": "2026-06-01 10:00:00",
            }
        ]
        input_data = create_single_inspection_input(
            master_dict, app_dict, evidence_list
        )
        self.assertEqual(input_data.master_data.blade_id, "BLD-2024001")
        self.assertEqual(input_data.application.defect_type, DefectType.CRACK)
        self.assertEqual(len(input_data.evidence_list), 1)

    def test_api_single_inspection(self):
        input_data = create_single_inspection_input(
            {
                "blade_id": "BLD-2024001",
                "turbine_id": "WT-001",
                "wind_farm_id": "WF-A",
                "blade_model": "BM-59.5",
                "manufacture_date": "2020-01-01",
                "install_date": "2020-03-01",
            },
            {
                "application_id": "APP-20260601-A001",
                "blade_id": "BLD-2024001",
                "applicant": "张工",
                "application_date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
                "inspection_type": "routine",
                "defect_type": "crack",
                "defect_description": "小裂纹",
                "defect_size_mm": 5.0,
            },
            [
                {
                    "evidence_id": "EVD-001",
                    "application_id": "APP-20260601-A001",
                    "material_type": "photo",
                    "file_path": "/test.jpg",
                    "upload_time": "2026-06-01 10:00:00",
                },
                {
                    "evidence_id": "EVD-002",
                    "application_id": "APP-20260601-A001",
                    "material_type": "report",
                    "file_path": "/test.pdf",
                    "upload_time": "2026-06-01 10:05:00",
                },
            ],
        )
        result = inspection_api.inspect_single(input_data)
        self.assertEqual(result["code"], 0)
        self.assertIn("data", result)
        self.assertIn("audit_number", result["data"])
        self.assertIn("business_conclusion", result["data"])
        self.assertIn("risk_label", result["data"])
        self.assertIn("next_action", result["data"])

    def test_api_review_entry(self):
        result = inspection_api.get_review_entry()
        self.assertEqual(result["code"], 0)
        self.assertEqual(result["data"]["entry_status"], "pending_review")
        self.assertIn("review_actions", result["data"])


class TestConsoleLogger(unittest.TestCase):
    def test_logger_creation(self):
        logger = get_logger("test-logger")
        self.assertIsNotNone(logger)

    def test_logger_singleton(self):
        l1 = get_logger("test-singleton")
        l2 = get_logger("test-singleton")
        self.assertIs(l1, l2)


class TestResultFiles(unittest.TestCase):
    def setUp(self):
        self.output_dir = "/tmp/test_inspection_output"
        self.bad_dir = "/tmp/test_inspection_bad"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.bad_dir, exist_ok=True)

    def tearDown(self):
        import shutil
        if os.path.exists(self.output_dir):
            shutil.rmtree(self.output_dir)
        if os.path.exists(self.bad_dir):
            shutil.rmtree(self.bad_dir)

    def test_save_results(self):
        from app.records import save_result_to_file, save_bad_rows_to_file, save_audit_summary

        outputs = [
            InspectionOutput(
                audit_number="INS-TEST-001",
                blade_id="BLD-001",
                application_id="APP-001",
                business_conclusion=BusinessConclusion.PASS,
                risk_label=RiskLabel.LOW,
                next_action=NextAction.DIRECT_PASS,
                risk_score=20.0,
                review_required=False,
                process_time="2026-06-06 12:00:00",
                row_number=1,
            ),
            InspectionOutput(
                audit_number="INS-TEST-002",
                blade_id="BLD-002",
                application_id="APP-002",
                business_conclusion=BusinessConclusion.REVIEW_REQUIRED,
                risk_label=RiskLabel.HIGH,
                next_action=NextAction.SCHEDULE_REPAIR,
                risk_score=90.0,
                review_required=True,
                process_time="2026-06-06 12:00:01",
                row_number=2,
            ),
        ]

        result_file = save_result_to_file(outputs, output_dir=self.output_dir, batch_id="test001")
        self.assertTrue(os.path.exists(result_file))

        import json
        with open(result_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["business_conclusion"], "pass")
        self.assertEqual(data[1]["risk_label"], "high_risk")

        csv_file = result_file.replace(".json", ".csv")
        self.assertTrue(os.path.exists(csv_file))

    def test_save_bad_rows(self):
        from app.records import save_bad_rows_to_file

        bad_rows = [
            BadRowRecord(
                row_number=3,
                raw_data={"raw": "data"},
                error_type="parse_error",
                error_message="无法解析",
                process_time="2026-06-06 12:00:00",
            )
        ]
        bad_file = save_bad_rows_to_file(bad_rows, bad_dir=self.bad_dir, batch_id="test001")
        self.assertTrue(os.path.exists(bad_file))

        import json
        with open(bad_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["row_number"], 3)

    def test_save_summary(self):
        from app.records import save_audit_summary

        summary = {
            "batch_id": "test001",
            "total_records": 5,
            "successful_processed": 3,
            "bad_rows_count": 2,
            "conclusion_counts": {
                "pass": 1,
                "review_required": 1,
                "reject": 1,
                "pending": 0,
            },
            "risk_counts": {"low_risk": 1, "high_risk": 1, "missing_material": 1},
            "process_time": "2026-06-06 12:00:00",
        }
        summary_file = save_audit_summary(summary, output_dir=self.output_dir, batch_id="test001")
        self.assertTrue(os.path.exists(summary_file))


def run_all_tests():
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("  风机叶片缺陷巡检API - 测试套件")
    print("=" * 60)
    print()
    print("测试覆盖场景:")
    print("  1. 完整数据测试 (通过/高风险/材料缺失)")
    print("  2. 时间越界测试 (有效期内/过期/未来日期)")
    print("  3. 编号错误测试 (格式错误/不一致/为空)")
    print("  4. 配置缺失测试 (阈值/材料类型/复核等级)")
    print("  5. 复核入口测试 (状态机/入口信息)")
    print("  6. 坏行隔离测试")
    print("  7. 结果文件测试")
    print("  8. 控制台日志测试")
    print()

    result = run_all_tests()

    print()
    print("=" * 60)
    print("  测试结果汇总")
    print("=" * 60)
    print(f"  运行测试: {result.testsRun}")
    print(f"  通过:     {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"  失败:     {len(result.failures)}")
    print(f"  错误:     {len(result.errors)}")
    print("=" * 60)

    if result.wasSuccessful():
        print("\n所有测试通过！✓")
    else:
        print("\n存在失败的测试，请检查！")
        sys.exit(1)
