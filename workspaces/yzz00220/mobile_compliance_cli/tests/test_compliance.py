#!/usr/bin/env python3
import unittest
import sys
import os
import csv
import json
import tempfile
import shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from rules import RuleEngine
from processor import ComplianceProcessor, read_csv, load_last_result
from logger import ComplianceLogger


class TestComplianceCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample_dir = Path(__file__).parent.parent / "samples"
        cls.rules_file = cls.sample_dir / "rules.yaml"
        cls.devices_file = cls.sample_dir / "devices.csv"
        cls.last_file = cls.sample_dir / "last_result.csv"

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_rule_engine_load(self):
        engine = RuleEngine(self.rules_file)
        self.assertGreater(len(engine.rules), 0)
        self.assertIn("device_id", engine.required_fields)
        self.assertEqual(engine.duplicate_keys, ["device_id"])

    def test_missing_field_detection(self):
        engine = RuleEngine(self.rules_file)
        record = {
            "device_id": "DEV001",
            "device_type": "iPhone",
            "os_version": "",
            "owner": "",
            "department": "研发部",
        }
        missing = engine.check_missing_fields(record)
        self.assertIn("os_version", missing)
        self.assertIn("owner", missing)

    def test_rule_match_normal(self):
        engine = RuleEngine(self.rules_file)
        record = {
            "device_id": "DEV001",
            "device_type": "iPhone",
            "os_version": "iOS 17",
            "owner": "张三",
            "department": "研发部",
            "security_level": "high",
            "install_apps": "企业微信",
            "storage_usage": "65",
        }
        matched = engine.apply_rules(record)
        labels = [m["label"] for m in matched]
        self.assertIn("安全等级高", labels)
        classification = engine.classify(matched)
        self.assertEqual(classification, "review")

    def test_rule_match_abnormal(self):
        engine = RuleEngine(self.rules_file)
        record = {
            "device_id": "DEV004",
            "device_type": "iPhone",
            "os_version": "iOS 15",
            "owner": "赵六",
            "department": "财务部",
            "security_level": "low",
            "install_apps": "微信|QQ",
            "storage_usage": "90",
        }
        matched = engine.apply_rules(record)
        labels = [m["label"] for m in matched]
        self.assertIn("系统版本过旧", labels)
        self.assertIn("安全等级不足", labels)
        self.assertIn("存在违规应用", labels)
        self.assertIn("存储使用率过高", labels)
        classification = engine.classify(matched)
        self.assertEqual(classification, "abnormal")

    def test_duplicate_detection(self):
        engine = RuleEngine(self.rules_file)
        seen = set()
        record1 = {"device_id": "DEV001", "device_type": "iPhone"}
        record2 = {"device_id": "DEV001", "device_type": "iPhone"}

        is_dup1, key1 = engine.is_duplicate(record1, seen)
        is_dup2, key2 = engine.is_duplicate(record2, seen)

        self.assertFalse(is_dup1)
        self.assertTrue(is_dup2)
        self.assertEqual(key1, key2)

    def test_full_processing(self):
        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(rule_engine=engine, logger=logger)
        processor.process(records)

        total = len(processor.normal_records) + len(processor.abnormal_records) + len(processor.review_records)

        self.assertEqual(logger.stats["total"], 15)
        self.assertEqual(total, 15)
        self.assertEqual(logger.stats["missing_field"], 2)
        self.assertEqual(logger.stats["duplicate"], 1)
        self.assertGreater(logger.stats["abnormal"], 0)
        self.assertGreater(len(logger.stats["risk_labels"]), 0)

    def test_output_files(self):
        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(rule_engine=engine, logger=logger)
        processor.process(records)

        out_dir = Path(self.test_dir) / "output"
        result_paths = processor.write_results(out_dir, fieldnames)

        self.assertTrue(Path(result_paths["normal"]).exists())
        self.assertTrue(Path(result_paths["abnormal"]).exists())
        self.assertTrue(Path(result_paths["review"]).exists())

        with open(result_paths["abnormal"], "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            for row in rows:
                self.assertIn("_source_line", row)
                self.assertIn("_reason", row)
                self.assertIn("_risk_labels", row)

    def test_filter_function(self):
        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(
            rule_engine=engine,
            logger=logger,
            filters={"department": "研发部"},
        )
        processor.process(records)

        self.assertEqual(logger.stats["total"], 7)

    def test_last_result_integration(self):
        last_map = load_last_result(self.last_file)
        self.assertEqual(len(last_map), 2)
        self.assertIn("DEV004", last_map)
        self.assertIn("DEV005", last_map)

        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(
            rule_engine=engine,
            logger=logger,
            last_result_map=last_map,
        )
        processor.process(records)

        out_dir = Path(self.test_dir) / "output"
        processor.write_results(out_dir, fieldnames)

        with open(out_dir / "abnormal.csv", "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            has_last_status = False
            for row in reader:
                if row.get("_last_status"):
                    has_last_status = True
                    break
            self.assertTrue(has_last_status)

    def test_summary_counts_consistency(self):
        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(rule_engine=engine, logger=logger)
        processor.process(records)

        total_detail = (
            len(processor.normal_records)
            + len(processor.abnormal_records)
            + len(processor.review_records)
        )
        self.assertEqual(total_detail, logger.stats["total"])

        normal_count = sum(
            1 for r in processor.normal_records
        )
        self.assertEqual(normal_count, len(processor.normal_records))

    def test_risk_labels_in_output(self):
        engine = RuleEngine(self.rules_file)
        logger = ComplianceLogger(verbose=False)
        records, fieldnames = read_csv(self.devices_file)

        processor = ComplianceProcessor(rule_engine=engine, logger=logger)
        processor.process(records)

        out_dir = Path(self.test_dir) / "output"
        processor.write_results(out_dir, fieldnames)

        for fname in ["abnormal.csv", "review.csv"]:
            fpath = out_dir / fname
            if fpath.exists():
                with open(fpath, "r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        self.assertIn("_risk_labels", row)
                        self.assertIn("_reason", row)

    def test_log_output(self):
        log_dir = Path(self.test_dir) / "logs"
        logger = ComplianceLogger(log_dir=log_dir, verbose=True)
        logger.info("测试日志信息")
        logger.warn("测试警告")
        logger.error("测试错误")

        self.assertIsNotNone(logger.log_file)
        self.assertTrue(logger.log_file.exists())

        with open(logger.log_file, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("测试日志信息", content)
            self.assertIn("测试警告", content)
            self.assertIn("测试错误", content)

    def test_rule_conflict_scenario(self):
        engine = RuleEngine(self.rules_file)
        record = {
            "device_id": "DEV000",
            "device_type": "iPhone",
            "os_version": "iOS 17",
            "owner": "测试",
            "department": "测试部",
            "security_level": "low",
            "install_apps": "微信",
            "storage_usage": "90",
        }
        matched = engine.apply_rules(record)
        labels = [m["label"] for m in matched]

        self.assertIn("安全等级不足", labels)
        self.assertIn("存在违规应用", labels)
        self.assertIn("存储使用率过高", labels)

        severities = [m["severity"] for m in matched]
        self.assertIn("error", severities)
        self.assertIn("warning", severities)

        classification = engine.classify(matched)
        self.assertEqual(classification, "abnormal")


if __name__ == "__main__":
    unittest.main(verbosity=2)
