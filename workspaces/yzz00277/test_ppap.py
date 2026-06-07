#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import csv
import json
import tempfile
import shutil
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ppap_report import PPAPAnalyzer, REQUIRED_FIELDS


class PPAPTestRunner:

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []

    def test(self, name: str, condition: bool, detail: str = ""):
        if condition:
            self.passed += 1
            status = "PASS"
        else:
            self.failed += 1
            status = "FAIL"
        self.results.append((status, name, detail))
        print(f"  [{status}] {name}")
        if detail and not condition:
            print(f"         {detail}")

    def print_summary(self):
        print("\n" + "=" * 60)
        print(f"测试结果: {self.passed} 通过, {self.failed} 失败, 共 {self.passed + self.failed} 项")
        print("=" * 60)
        if self.failed > 0:
            print("\n失败用例:")
            for status, name, detail in self.results:
                if status == "FAIL":
                    print(f"  - {name}")
                    if detail:
                        print(f"    {detail}")
        return self.failed == 0


def create_test_data(path: str, rows: list):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=REQUIRED_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def create_default_mapping(path: str):
    mapping = {
        "机加工": {"department": "机加工车间", "owner": "张主任", "severity": "高"},
        "热处理": {"department": "热处理车间", "owner": "李主任", "severity": "中"},
        "default": {"department": "质量部", "owner": "待指派", "severity": "中"},
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)


def test_normal_records(runner: PPAPTestRunner):
    print("\n【测试1】正常记录处理")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        runner.test("原始记录数正确", len(analyzer.raw_records) == 2,
                    f"期望2条，实际{len(analyzer.raw_records)}条")
        runner.test("有效记录数正确", len(analyzer.valid_records) == 2,
                    f"期望2条，实际{len(analyzer.valid_records)}条")
        runner.test("坏记录数为0", len(analyzer.bad_records) == 0,
                    f"期望0条，实际{len(analyzer.bad_records)}条")
        runner.test("缺失数为0", analyzer.missing_count == 0)
        runner.test("重复数为0", analyzer.duplicate_count == 0)
        runner.test("越界数为0", analyzer.out_of_spec_count == 0)
        runner.test("规则冲突数为0", analyzer.rule_conflict_count == 0)

        runner.test("明细表文件存在", os.path.exists(outputs["detail"]))
        runner.test("汇总报告文件存在", os.path.exists(outputs["summary"]))
        runner.test("问题清单文件存在", os.path.exists(outputs["issues"]))
        runner.test("坏行隔离文件存在", os.path.exists(outputs["bad"]))
        runner.test("文本摘要文件存在", os.path.exists(outputs["text"]))

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))
        runner.test("明细表记录数正确", len(detail_rows) == 2)
        runner.test("明细表无坏行标记", all(r["是否坏行"] == "否" for r in detail_rows))
        runner.test("明细表问题类型为空", all(r["问题类型"] == "" for r in detail_rows))

        with open(outputs["issues"], "r", encoding="utf-8-sig") as f:
            issue_rows = list(csv.DictReader(f))
        runner.test("问题清单为空", len(issue_rows) == 0)

        with open(outputs["bad"], "r", encoding="utf-8-sig") as f:
            bad_rows = list(csv.DictReader(f))
        runner.test("坏行隔离文件为空", len(bad_rows) == 0)

        with open(outputs["text"], "r", encoding="utf-8") as f:
            text = f.read()
        runner.test("文本摘要包含标题", "汽车零部件 PPAP 材料复核报告" in text)
        runner.test("文本摘要包含复核入口", "复核入口" in text)


def test_missing_fields(runner: PPAPTestRunner):
    print("\n【测试2】缺失字段检测")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
            {"record_id": "", "part_number": "P002", "part_name": "零件B",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "55", "unit": "HRC",
             "spec_min": "50", "spec_max": "60",
             "inspector": "王工", "inspection_date": "2025-03-11",
             "shift": "白班", "equipment_id": "EQ003", "batch_number": "B002"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        runner.test("原始记录数正确", len(analyzer.raw_records) == 3)
        runner.test("坏记录数正确", len(analyzer.bad_records) == 2,
                    f"期望2条，实际{len(analyzer.bad_records)}条")
        runner.test("缺失计数正确", analyzer.missing_count == 2,
                    f"期望2条，实际{analyzer.missing_count}条")

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r002 = [r for r in detail_rows if r["record_id"] == "R002"][0]
        runner.test("缺失process_step被标注", "缺失" in r002["问题类型"])
        runner.test("缺失字段描述正确", "process_step" in r002["问题描述"])
        runner.test("缺失记录标记为坏行", r002["是否坏行"] == "是")

        no_id = [r for r in detail_rows if r["record_id"] == ""][0]
        runner.test("缺失record_id被标注", "缺失" in no_id["问题类型"])
        runner.test("缺失记录标记为坏行", no_id["是否坏行"] == "是")

        with open(outputs["bad"], "r", encoding="utf-8-sig") as f:
            bad_rows = list(csv.DictReader(f))
        runner.test("坏行隔离文件记录数正确", len(bad_rows) == 2)

        with open(outputs["issues"], "r", encoding="utf-8-sig") as f:
            issue_rows = list(csv.DictReader(f))
        missing_issues = [r for r in issue_rows if r["问题类型"] == "缺失"]
        runner.test("问题清单包含缺失问题", len(missing_issues) == 2)


def test_rule_conflict(runner: PPAPTestRunner):
    print("\n【测试3】规则冲突检测")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "长度",
             "measurement_value": "50", "unit": "mm",
             "spec_min": "60", "spec_max": "40",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        runner.test("规则冲突计数正确", analyzer.rule_conflict_count == 1,
                    f"期望1条，实际{analyzer.rule_conflict_count}条")
        runner.test("坏记录数正确", len(analyzer.bad_records) == 1,
                    f"期望1条，实际{len(analyzer.bad_records)}条")

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r002 = [r for r in detail_rows if r["record_id"] == "R002"][0]
        runner.test("规则冲突被标注", "规则冲突" in r002["问题类型"])
        runner.test("规则冲突描述正确", "下限" in r002["问题描述"] and "上限" in r002["问题描述"])
        runner.test("规则冲突记录标记为坏行", r002["是否坏行"] == "是")

        with open(outputs["issues"], "r", encoding="utf-8-sig") as f:
            issue_rows = list(csv.DictReader(f))
        conflict_issues = [r for r in issue_rows if r["问题类型"] == "规则冲突"]
        runner.test("问题清单包含规则冲突", len(conflict_issues) == 1)


def test_duplicate_records(runner: PPAPTestRunner):
    print("\n【测试4】重复记录处理")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P002", "part_name": "零件B",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        runner.test("原始记录数正确", len(analyzer.raw_records) == 3)
        runner.test("重复计数正确", analyzer.duplicate_count == 2,
                    f"期望2条，实际{analyzer.duplicate_count}条")

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r001_rows = [r for r in detail_rows if r["record_id"] == "R001"]
        runner.test("两条R001都被标注为重复",
                    all("重复" in r["问题类型"] for r in r001_rows),
                    f"期望2条重复标注，实际{sum(1 for r in r001_rows if '重复' in r['问题类型'])}条")

        runner.test("重复记录不自动标记为坏行",
                    all(r["是否坏行"] == "否" for r in r001_rows))

        with open(outputs["issues"], "r", encoding="utf-8-sig") as f:
            issue_rows = list(csv.DictReader(f))
        dup_issues = [r for r in issue_rows if r["问题类型"] == "重复"]
        runner.test("问题清单包含重复问题", len(dup_issues) == 2)


def test_out_of_spec(runner: PPAPTestRunner):
    print("\n【测试5】越界数据检测")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "高度",
             "measurement_value": "10.10", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
            {"record_id": "R003", "part_number": "P002", "part_name": "零件B",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "50", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "王工", "inspection_date": "2025-03-11",
             "shift": "白班", "equipment_id": "EQ003", "batch_number": "B002"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        runner.test("越界计数正确", analyzer.out_of_spec_count == 2,
                    f"期望2条，实际{analyzer.out_of_spec_count}条")

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r002 = [r for r in detail_rows if r["record_id"] == "R002"][0]
        runner.test("高于上限被标注", "越界" in r002["问题类型"])
        runner.test("越界描述正确", "高于上限" in r002["问题描述"])
        runner.test("越界记录不标记为坏行", r002["是否坏行"] == "否")

        r003 = [r for r in detail_rows if r["record_id"] == "R003"][0]
        runner.test("低于下限被标注", "越界" in r003["问题类型"])
        runner.test("越界描述正确", "低于下限" in r003["问题描述"])

        with open(outputs["issues"], "r", encoding="utf-8-sig") as f:
            issue_rows = list(csv.DictReader(f))
        oos_issues = [r for r in issue_rows if r["问题类型"] == "越界"]
        runner.test("问题清单包含越界问题", len(oos_issues) == 2)


def test_date_range_filter(runner: PPAPTestRunner):
    print("\n【测试6】时间范围筛选")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "高度",
             "measurement_value": "10.03", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "李工", "inspection_date": "2025-03-15",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
            {"record_id": "R003", "part_number": "P002", "part_name": "零件B",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "王工", "inspection_date": "2025-03-20",
             "shift": "白班", "equipment_id": "EQ003", "batch_number": "B002"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(
            data_path, mapping_path,
            start_date="2025-03-12", end_date="2025-03-18"
        )
        outputs = analyzer.run(output_dir)

        runner.test("原始记录数正确", len(analyzer.raw_records) == 3)
        runner.test("坏记录数正确(时间越界)", len(analyzer.bad_records) == 2,
                    f"期望2条，实际{len(analyzer.bad_records)}条")

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r001 = [r for r in detail_rows if r["record_id"] == "R001"][0]
        runner.test("范围前的记录被标记时间越界", "时间越界" in r001["问题类型"])
        runner.test("范围前的记录是坏行", r001["是否坏行"] == "是")

        r002 = [r for r in detail_rows if r["record_id"] == "R002"][0]
        runner.test("范围内的记录有效", r002["是否坏行"] == "否")
        runner.test("范围内的记录无时间越界", "时间越界" not in r002["问题类型"])

        r003 = [r for r in detail_rows if r["record_id"] == "R003"][0]
        runner.test("范围后的记录被标记时间越界", "时间越界" in r003["问题类型"])


def test_group_by(runner: PPAPTestRunner):
    print("\n【测试7】分组维度汇总")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "热处理", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
            {"record_id": "R003", "part_number": "P002", "part_name": "零件B",
             "process_step": "机加工", "inspection_item": "长度",
             "measurement_value": "20.01", "unit": "mm",
             "spec_min": "20.00", "spec_max": "20.05",
             "inspector": "王工", "inspection_date": "2025-03-11",
             "shift": "白班", "equipment_id": "EQ003", "batch_number": "B002"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path, group_by="process_step")
        outputs = analyzer.run(output_dir)

        with open(outputs["summary"], "r", encoding="utf-8-sig") as f:
            summary_rows = list(csv.DictReader(f))

        data_rows = [r for r in summary_rows if r["process_step"] and r["process_step"] != "合计"]
        runner.test("汇总报告按工序分组正确", len(data_rows) == 2,
                    f"期望2组，实际{len(data_rows)}组")

        mach = [r for r in data_rows if r["process_step"] == "机加工"][0]
        runner.test("机组记录数正确", mach["总记录数"] == "2")
        runner.test("机组合格率正确", float(mach["合格率(%)"]) == 100.0)

        total_row = [r for r in summary_rows if r.get("process_step") == "合计"]
        runner.test("汇总报告包含合计行", len(total_row) == 1)
        runner.test("合计总记录数正确", total_row[0]["总记录数"] == "3")

        analyzer2 = PPAPAnalyzer(data_path, mapping_path, group_by="part_number")
        outputs2 = analyzer2.run(output_dir + "_pnum")

        with open(outputs2["summary"], "r", encoding="utf-8-sig") as f:
            summary2 = list(csv.DictReader(f))

        p_rows = [r for r in summary2 if r["part_number"] and r["part_number"] != "合计"]
        runner.test("按零件号分组正确", len(p_rows) == 2)


def test_responsibility_mapping(runner: PPAPTestRunner):
    print("\n【测试8】责任映射应用")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P002", "part_name": "零件B",
             "process_step": "未知工序", "inspection_item": "长度",
             "measurement_value": "20.01", "unit": "mm",
             "spec_min": "20.00", "spec_max": "20.05",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ002", "batch_number": "B002"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail_rows = list(csv.DictReader(f))

        r001 = [r for r in detail_rows if r["record_id"] == "R001"][0]
        runner.test("已知工序映射正确部门", r001["责任部门"] == "机加工车间")
        runner.test("已知工序映射正确责任人", r001["责任人"] == "张主任")
        runner.test("已知工序映射正确严重等级", r001["严重等级"] == "高")

        r002 = [r for r in detail_rows if r["record_id"] == "R002"][0]
        runner.test("未知工序使用默认映射", r002["责任部门"] == "质量部")


def test_console_output(runner: PPAPTestRunner):
    print("\n【测试9】控制台输出验证")
    import subprocess
    import io
    import contextlib

    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            analyzer = PPAPAnalyzer(data_path, mapping_path)
            analyzer.run(output_dir)
        output = f.getvalue()

        runner.test("控制台输出包含加载信息", "已加载原始记录" in output)
        runner.test("控制台输出包含有效记录数", "有效记录" in output)
        runner.test("控制台输出包含坏记录数", "坏记录" in output)
        runner.test("控制台输出包含问题分类统计", "缺失" in output and "越界" in output)
        runner.test("控制台输出包含文件生成信息", "明细表已生成" in output)
        runner.test("控制台输出包含完成提示", "处理完成" in output)


def test_output_files_integrity(runner: PPAPTestRunner):
    print("\n【测试10】结果文件完整性")
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = os.path.join(tmpdir, "data.csv")
        mapping_path = os.path.join(tmpdir, "mapping.json")
        output_dir = os.path.join(tmpdir, "output")

        rows = [
            {"record_id": "R001", "part_number": "P001", "part_name": "零件A",
             "process_step": "机加工", "inspection_item": "直径",
             "measurement_value": "10.02", "unit": "mm",
             "spec_min": "10.00", "spec_max": "10.05",
             "inspector": "张工", "inspection_date": "2025-03-10",
             "shift": "白班", "equipment_id": "EQ001", "batch_number": "B001"},
            {"record_id": "R002", "part_number": "P001", "part_name": "零件A",
             "process_step": "", "inspection_item": "硬度",
             "measurement_value": "58", "unit": "HRC",
             "spec_min": "55", "spec_max": "62",
             "inspector": "李工", "inspection_date": "2025-03-10",
             "shift": "夜班", "equipment_id": "EQ002", "batch_number": "B001"},
        ]
        create_test_data(data_path, rows)
        create_default_mapping(mapping_path)

        analyzer = PPAPAnalyzer(data_path, mapping_path)
        outputs = analyzer.run(output_dir)

        for name, path in outputs.items():
            runner.test(f"{name} 文件存在", os.path.exists(path))
            runner.test(f"{name} 文件非空", os.path.getsize(path) > 0)

        with open(outputs["detail"], "r", encoding="utf-8-sig") as f:
            detail = list(csv.DictReader(f))
        runner.test("明细表包含所有必填列",
                    all(col in detail[0] for col in REQUIRED_FIELDS))
        runner.test("明细表包含问题标注列",
                    all(col in detail[0] for col in ["问题类型", "问题描述", "是否坏行"]))
        runner.test("明细表包含责任信息列",
                    all(col in detail[0] for col in ["责任部门", "责任人", "严重等级"]))

        with open(outputs["summary"], "r", encoding="utf-8-sig") as f:
            summary = list(csv.DictReader(f))
        runner.test("汇总报告包含统计列",
                    "总记录数" in summary[0] and "合格率(%)" in summary[0])

        with open(outputs["text"], "r", encoding="utf-8") as f:
            text = f.read()
        runner.test("文本摘要包含总体情况", "总体情况" in text)
        runner.test("文本摘要包含问题分类统计", "问题分类统计" in text)
        runner.test("文本摘要包含输出文件说明", "输出文件说明" in text)


def main():
    print("=" * 60)
    print("汽车零部件 PPAP 材料脚本 验收测试")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    runner = PPAPTestRunner()

    test_normal_records(runner)
    test_missing_fields(runner)
    test_rule_conflict(runner)
    test_duplicate_records(runner)
    test_out_of_spec(runner)
    test_date_range_filter(runner)
    test_group_by(runner)
    test_responsibility_mapping(runner)
    test_console_output(runner)
    test_output_files_integrity(runner)

    success = runner.print_summary()

    print("\n验收覆盖清单:")
    print("  ✓ 正常记录处理")
    print("  ✓ 缺字段检测")
    print("  ✓ 规则冲突检测")
    print("  ✓ 重复记录处理")
    print("  ✓ 越界数据检测")
    print("  ✓ 时间范围筛选")
    print("  ✓ 分组维度汇总")
    print("  ✓ 责任映射应用")
    print("  ✓ 控制台输出")
    print("  ✓ 结果文件完整性")
    print("  ✓ 坏行隔离")
    print("  ✓ 复核入口")

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
