#!/usr/bin/env python3
"""
康复治疗预约冲突CLI - 综合测试场景脚本
覆盖：单条成功、批量部分失败、人工复核、重复提交
验证：汇总数量、明细合计、风险标签、日志内容、批次和来源标识
"""

import os
import sys
import csv
import json
import shutil
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "test_output")
SRC_DIR = os.path.join(BASE_DIR, "src")

sys.path.insert(0, SRC_DIR)


def run_cli(args, description=""):
    """运行 CLI 命令"""
    print(f"\n{'='*70}")
    print(f"▶  {description}")
    print(f"{'='*70}")
    cmd = [sys.executable, os.path.join(BASE_DIR, "main.py")] + args
    print(f"命令: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode


def read_csv(filepath):
    """读取 CSV 文件"""
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def read_json(filepath):
    """读取 JSON 文件"""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def assert_eq(actual, expected, msg=""):
    """断言相等"""
    if actual == expected:
        print(f"  ✅ {msg}: {actual} == {expected}")
        return True
    else:
        print(f"  ❌ {msg}: 期望 {expected}, 实际 {actual}")
        return False


def test_scenario_1_single_success():
    """
    场景一：单条成功记录
    验证：一条无冲突的记录，结果应该是成功、无风险
    """
    print("\n" + "="*70)
    print("🧪 场景一：单条成功记录")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario1_single_success")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow([
            "S001", "P001", "张三", "T001", "李医生", "物理治疗",
            "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"
        ])

    params_path = os.path.join(scenario_dir, "params.json")
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-SINGLE-001",
            "check_overlap": True,
            "check_room_conflict": True,
            "check_therapist_conflict": True,
            "check_patient_conflict": True,
            "operator": "tester"
        }, f, ensure_ascii=False)

    ret = run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params_path,
        "-o", scenario_dir
    ], "生成 - 单条成功记录")

    assert ret == 0, "命令执行失败"

    success_file = os.path.join(scenario_dir, "success_TEST-SINGLE-001.csv")
    bad_file = os.path.join(scenario_dir, "bad_rows_TEST-SINGLE-001.csv")
    summary_file = os.path.join(scenario_dir, "summary_TEST-SINGLE-001.json")
    logs_file = os.path.join(scenario_dir, "logs_TEST-SINGLE-001.csv")

    success_rows = read_csv(success_file)
    bad_rows = read_csv(bad_file)
    summary = read_json(summary_file)
    logs = read_csv(logs_file)

    all_pass = True
    all_pass &= assert_eq(summary["total_count"], 1, "总记录数")
    all_pass &= assert_eq(summary["success_count"], 1, "成功数")
    all_pass &= assert_eq(summary["failed_count"], 0, "失败数")
    all_pass &= assert_eq(summary["conflict_count"], 0, "冲突数")
    all_pass &= assert_eq(len(success_rows), 1, "成功结果明细数")
    all_pass &= assert_eq(len(bad_rows), 0, "坏行数")

    if success_rows:
        all_pass &= assert_eq(success_rows[0]["status"], "success", "记录状态")
        all_pass &= assert_eq(success_rows[0]["risk_label"], "无风险", "风险标签")
        all_pass &= assert_eq(success_rows[0]["batch_id"], "TEST-SINGLE-001", "批次号保留")

    all_pass &= assert_eq(len(logs) > 0, True, "日志非空")
    has_start_log = any("开始冲突检测" in log["action"] or "冲突检测" in log["action"] for log in logs)
    all_pass &= assert_eq(has_start_log, True, "包含冲突检测相关日志")

    if all_pass:
        print("\n✅ 场景一：单条成功 - 通过")
    else:
        print("\n❌ 场景一：单条成功 - 失败")

    return all_pass


def test_scenario_2_batch_partial_failure():
    """
    场景二：批量部分失败
    验证：多条记录中有成功有失败，坏行文件正确，汇总数量正确
    """
    print("\n" + "="*70)
    print("🧪 场景二：批量部分失败")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario2_batch_partial")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["B001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["B002", "P002", "李四", "T001", "李医生", "物理治疗", "2024-01-15", "09:30", "10:30", "Room2", "HIS", "pending"])
        writer.writerow(["B003", "", "王五", "T002", "王医生", "作业治疗", "2024-01-15", "09:00", "10:00", "Room1", "Manual", "pending"])
        writer.writerow(["B004", "P004", "赵六", "T002", "王医生", "", "2024-01-15", "09:00", "10:00", "Room1", "Manual", "pending"])
        writer.writerow(["B005", "P005", "钱七", "T003", "赵医生", "言语治疗", "2024-01-15", "11:00", "10:00", "Room3", "HIS", "pending"])
        writer.writerow(["B006", "P006", "孙八", "T004", "孙医生", "物理治疗", "2024-01-15", "14:00", "15:00", "Room4", "HIS", "pending"])

    params_path = os.path.join(scenario_dir, "params.json")
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-BATCH-002",
            "operator": "batch_operator"
        }, f, ensure_ascii=False)

    ret = run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params_path,
        "-o", scenario_dir
    ], "生成 - 批量部分失败")

    assert ret == 0, "命令执行失败"

    success_file = os.path.join(scenario_dir, "success_TEST-BATCH-002.csv")
    bad_file = os.path.join(scenario_dir, "bad_rows_TEST-BATCH-002.csv")
    summary_file = os.path.join(scenario_dir, "summary_TEST-BATCH-002.json")
    logs_file = os.path.join(scenario_dir, "logs_TEST-BATCH-002.csv")

    success_rows = read_csv(success_file)
    bad_rows = read_csv(bad_file)
    summary = read_json(summary_file)
    logs = read_csv(logs_file)

    all_pass = True
    all_pass &= assert_eq(summary["total_count"], 6, "总记录数")
    all_pass &= assert_eq(summary["failed_count"], 3, "失败数")
    all_pass &= assert_eq(len(bad_rows), 3, "坏行文件行数")

    bad_ids = [r["source_id"] for r in bad_rows]
    all_pass &= assert_eq("B003" in bad_ids, True, "B003 在坏行中（无patient_id）")
    all_pass &= assert_eq("B004" in bad_ids, True, "B004 在坏行中（无treatment_type）")
    all_pass &= assert_eq("B005" in bad_ids, True, "B005 在坏行中（开始>结束）")

    has_source_system = any("source_system" in r for r in bad_rows)
    all_pass &= assert_eq(has_source_system, True, "坏行保留来源标识")

    has_batch = all(r.get("batch_id") == "TEST-BATCH-002" for r in bad_rows if r.get("batch_id"))
    all_pass &= assert_eq(has_batch, True, "坏行保留批次号")

    has_validate_log = any("数据校验" in log["action"] for log in logs)
    all_pass &= assert_eq(has_validate_log, True, "日志包含数据校验动作")

    if all_pass:
        print("\n✅ 场景二：批量部分失败 - 通过")
    else:
        print("\n❌ 场景二：批量部分失败 - 失败")

    return all_pass


def test_scenario_3_manual_review():
    """
    场景三：人工复核 - 冲突检测与风险标签
    验证：多维度冲突（治疗师+房间+患者），风险标签正确，冲突详情可追溯
    """
    print("\n" + "="*70)
    print("🧪 场景三：人工复核 - 冲突与风险标签")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario3_manual_review")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["M001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["M002", "P002", "李四", "T001", "李医生", "作业治疗", "2024-01-15", "09:00", "10:00", "Room2", "HIS", "pending"])
        writer.writerow(["M003", "P001", "张三", "T002", "王医生", "言语治疗", "2024-01-15", "09:30", "10:30", "Room3", "HIS", "pending"])
        writer.writerow(["M004", "P003", "王五", "T003", "赵医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["M005", "P004", "赵六", "T004", "孙医生", "作业治疗", "2024-01-15", "14:00", "15:00", "Room5", "HIS", "pending"])
        writer.writerow(["M006", "P005", "钱七", "T005", "周医生", "言语治疗", "2024-01-15", "14:00", "15:00", "Room5", "Manual", "pending"])
        writer.writerow(["M007", "P006", "孙八", "T006", "吴医生", "物理治疗", "2024-01-15", "16:00", "17:00", "Room6", "HIS", "pending"])

    params_path = os.path.join(scenario_dir, "params.json")
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-MANUAL-003",
            "check_room_conflict": True,
            "check_therapist_conflict": True,
            "check_patient_conflict": True,
            "operator": "reviewer"
        }, f, ensure_ascii=False)

    ret = run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params_path,
        "-o", scenario_dir
    ], "生成 - 人工复核场景")

    assert ret == 0, "命令执行失败"

    success_file = os.path.join(scenario_dir, "success_TEST-MANUAL-003.csv")
    summary_file = os.path.join(scenario_dir, "summary_TEST-MANUAL-003.json")

    success_rows = read_csv(success_file)
    summary = read_json(summary_file)

    all_pass = True

    all_pass &= assert_eq(summary["total_count"], 7, "总记录数")
    all_pass &= assert_eq(summary["success_count"], 7, "成功数（含冲突）")
    all_pass &= assert_eq(summary["conflict_count"], 6, "冲突记录数")

    results_map = {r["source_id"]: r for r in success_rows}

    m001_conflicts = [c for c in results_map.get("M001", {}).get("conflict_with", "").split("|") if c]
    has_therapist_conflict = any(c.startswith("therapist:") for c in m001_conflicts)
    has_room_conflict = any(c.startswith("room:") for c in m001_conflicts)
    all_pass &= assert_eq(has_therapist_conflict, True, "M001 有治疗师冲突")
    all_pass &= assert_eq(has_room_conflict, True, "M001 有房间冲突")

    m003_conflicts = [c for c in results_map.get("M003", {}).get("conflict_with", "").split("|") if c]
    has_patient_conflict = any(c.startswith("patient:") for c in m003_conflicts)
    all_pass &= assert_eq(has_patient_conflict, True, "M003 有患者冲突")

    high_risk = [r for r in success_rows if r.get("risk_label") == "高风险"]
    medium_risk = [r for r in success_rows if r.get("risk_label") == "中风险"]
    low_risk = [r for r in success_rows if r.get("risk_label") == "低风险"]

    all_pass &= assert_eq(summary["high_risk_count"], len(high_risk), "汇总高风险数与明细一致")
    all_pass &= assert_eq(summary["medium_risk_count"], len(medium_risk), "汇总中风险数与明细一致")
    all_pass &= assert_eq(summary["low_risk_count"], len(low_risk), "汇总低风险数与明细一致")

    has_high = len(high_risk) > 0
    has_medium = len(medium_risk) > 0
    all_pass &= assert_eq(has_high, True, "存在高风险记录")
    all_pass &= assert_eq(has_medium, True, "存在中风险记录")

    has_row_hash = all(r.get("row_hash") for r in success_rows)
    all_pass &= assert_eq(has_row_hash, True, "所有记录有 row_hash（用于幂等）")

    if all_pass:
        print("\n✅ 场景三：人工复核 - 通过")
    else:
        print("\n❌ 场景三：人工复核 - 失败")

    return all_pass


def test_scenario_4_duplicate_submission():
    """
    场景四：重复提交 - 幂等性验证
    验证：相同数据重复执行，不产生新增差异
    """
    print("\n" + "="*70)
    print("🧪 场景四：重复提交 - 幂等性验证")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario4_duplicate")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["D001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["D002", "P002", "李四", "T001", "李医生", "作业治疗", "2024-01-15", "09:30", "10:30", "Room2", "HIS", "pending"])
        writer.writerow(["D003", "P003", "王五", "T002", "王医生", "言语治疗", "2024-01-15", "14:00", "15:00", "Room3", "HIS", "pending"])

    params1_path = os.path.join(scenario_dir, "params1.json")
    with open(params1_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-DUP-FIRST",
            "operator": "first_run"
        }, f, ensure_ascii=False)

    run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params1_path,
        "-o", scenario_dir
    ], "第一次执行")

    first_success = os.path.join(scenario_dir, "success_TEST-DUP-FIRST.csv")
    first_summary = read_json(os.path.join(scenario_dir, "summary_TEST-DUP-FIRST.json"))

    params2_path = os.path.join(scenario_dir, "params2.json")
    with open(params2_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-DUP-SECOND",
            "operator": "second_run"
        }, f, ensure_ascii=False)

    run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params2_path,
        "-r", first_success,
        "-o", scenario_dir
    ], "第二次执行（带上次结果，验证幂等）")

    second_success = os.path.join(scenario_dir, "success_TEST-DUP-SECOND.csv")
    second_summary = read_json(os.path.join(scenario_dir, "summary_TEST-DUP-SECOND.json"))
    diff_file = os.path.join(scenario_dir, "diff_TEST-DUP-SECOND.csv")
    logs_file = os.path.join(scenario_dir, "logs_TEST-DUP-SECOND.csv")

    second_rows = read_csv(second_success)
    diff_rows = read_csv(diff_file) if os.path.exists(diff_file) else []
    logs = read_csv(logs_file)

    all_pass = True

    all_pass &= assert_eq(first_summary["total_count"], second_summary["total_count"],
                          "两次执行总记录数相同")
    all_pass &= assert_eq(first_summary["success_count"], second_summary["success_count"],
                          "两次执行成功数相同")
    all_pass &= assert_eq(first_summary["conflict_count"], second_summary["conflict_count"],
                          "两次执行冲突数相同")

    all_pass &= assert_eq(len(diff_rows), 0, "差异表为空（无新增差异）")

    first_data = read_csv(first_success)
    first_map = {r["source_id"]: r for r in first_data}
    second_map = {r["source_id"]: r for r in second_rows}

    same_status = all(
        first_map.get(sid, {}).get("status") == second_map.get(sid, {}).get("status")
        for sid in first_map
    )
    all_pass &= assert_eq(same_status, True, "所有记录状态与上次一致")

    same_risk = all(
        first_map.get(sid, {}).get("risk_label") == second_map.get(sid, {}).get("risk_label")
        for sid in first_map
    )
    all_pass &= assert_eq(same_risk, True, "所有记录风险标签与上次一致")

    has_idempotent_log = any("幂等性校验" in log["action"] or "数据未变" in log["message"]
                             for log in logs)
    all_pass &= assert_eq(has_idempotent_log, True, "日志包含幂等性校验相关记录")

    has_new_batch = all(r.get("batch_id") == "TEST-DUP-SECOND" for r in second_rows if r.get("batch_id"))
    all_pass &= assert_eq(has_new_batch, True, "结果保留新批次号")

    if all_pass:
        print("\n✅ 场景四：重复提交 - 通过")
    else:
        print("\n❌ 场景四：重复提交 - 失败")

    return all_pass


def test_scenario_5_incremental_with_changes():
    """
    场景五：增量数据有变化
    验证：数据变化时能正确检测差异
    """
    print("\n" + "="*70)
    print("🧪 场景五：增量数据有变化")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario5_incremental")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger1_path = os.path.join(scenario_dir, "ledger_v1.csv")
    with open(ledger1_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["I001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["I002", "P002", "李四", "T002", "王医生", "作业治疗", "2024-01-15", "09:00", "10:00", "Room2", "HIS", "pending"])
        writer.writerow(["I003", "P003", "王五", "T003", "赵医生", "言语治疗", "2024-01-15", "09:00", "10:00", "Room3", "HIS", "pending"])

    params1_path = os.path.join(scenario_dir, "params1.json")
    with open(params1_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-INC-FIRST",
            "operator": "first"
        }, f, ensure_ascii=False)

    run_cli([
        "generate",
        "-l", ledger1_path,
        "-p", params1_path,
        "-o", scenario_dir
    ], "第一次执行（初始数据）")

    first_success = os.path.join(scenario_dir, "success_TEST-INC-FIRST.csv")

    ledger2_path = os.path.join(scenario_dir, "ledger_v2.csv")
    with open(ledger2_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["I001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["I002", "P002", "李四", "T001", "李医生", "作业治疗", "2024-01-15", "09:00", "10:00", "Room2", "HIS", "pending"])
        writer.writerow(["I004", "P004", "赵六", "T004", "孙医生", "物理治疗", "2024-01-15", "14:00", "15:00", "Room4", "Manual", "pending"])

    params2_path = os.path.join(scenario_dir, "params2.json")
    with open(params2_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-INC-SECOND",
            "operator": "second"
        }, f, ensure_ascii=False)

    run_cli([
        "generate",
        "-l", ledger2_path,
        "-p", params2_path,
        "-r", first_success,
        "-o", scenario_dir
    ], "第二次执行（数据有变化）")

    diff_file = os.path.join(scenario_dir, "diff_TEST-INC-SECOND.csv")
    diff_rows = read_csv(diff_file)

    all_pass = True
    all_pass &= assert_eq(len(diff_rows) >= 3, True, "差异记录数 >= 3（新增1+删除1+修改至少1）")

    diff_types = [r["diff_type"] for r in diff_rows]
    all_pass &= assert_eq("新增" in diff_types, True, "有新增差异")
    all_pass &= assert_eq("删除" in diff_types, True, "有删除差异")
    all_pass &= assert_eq("修改" in diff_types, True, "有修改差异")

    has_source_batch = all(r.get("batch_id") == "TEST-INC-SECOND" for r in diff_rows)
    all_pass &= assert_eq(has_source_batch, True, "差异表保留批次号")

    if all_pass:
        print("\n✅ 场景五：增量数据有变化 - 通过")
    else:
        print("\n❌ 场景五：增量数据有变化 - 失败")

    return all_pass


def test_scenario_6_validate_command():
    """
    场景六：校验命令
    验证：validate 命令只做数据校验，不输出冲突结果
    """
    print("\n" + "="*70)
    print("🧪 场景六：校验命令")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario6_validate")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["V001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["V002", "", "李四", "T001", "李医生", "作业治疗", "2024-01-15", "09:00", "10:00", "Room2", "Manual", "pending"])
        writer.writerow(["V003", "P003", "王五", "T002", "王医生", "", "2024-01-15", "09:00", "10:00", "Room3", "HIS", "pending"])

    params_path = os.path.join(scenario_dir, "params.json")
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-VAL-006",
            "operator": "validator"
        }, f, ensure_ascii=False)

    ret = run_cli([
        "validate",
        "-l", ledger_path,
        "-p", params_path,
        "-o", scenario_dir
    ], "校验命令")

    assert ret == 0, "命令执行失败"

    bad_file = os.path.join(scenario_dir, "bad_rows_TEST-VAL-006.csv")
    summary_file = os.path.join(scenario_dir, "summary_TEST-VAL-006.json")
    logs_file = os.path.join(scenario_dir, "logs_TEST-VAL-006.csv")

    bad_rows = read_csv(bad_file)
    summary = read_json(summary_file)
    logs = read_csv(logs_file)

    all_pass = True
    all_pass &= assert_eq(summary.get("total_count"), 3, "总记录数")
    all_pass &= assert_eq(summary.get("valid_count"), 1, "有效记录数")
    all_pass &= assert_eq(summary.get("failed_count"), 2, "失败记录数")
    all_pass &= assert_eq(len(bad_rows), 2, "坏行数量")

    has_source = all(r.get("source_system") for r in bad_rows)
    all_pass &= assert_eq(has_source, True, "坏行保留来源标识")

    success_file = os.path.join(scenario_dir, "success_TEST-VAL-006.csv")
    all_pass &= assert_eq(os.path.exists(success_file), False,
                          "validate 命令不输出成功结果文件")

    if all_pass:
        print("\n✅ 场景六：校验命令 - 通过")
    else:
        print("\n❌ 场景六：校验命令 - 失败")

    return all_pass


def test_scenario_7_export_and_summary():
    """
    场景七：导出和摘要命令
    验证：export 和 summary 命令正常工作
    """
    print("\n" + "="*70)
    print("🧪 场景七：导出和摘要命令")
    print("="*70)

    scenario_dir = os.path.join(OUTPUT_DIR, "scenario7_export")
    os.makedirs(scenario_dir, exist_ok=True)

    ledger_path = os.path.join(scenario_dir, "ledger.csv")
    with open(ledger_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "source_id", "patient_id", "patient_name", "therapist_id",
            "therapist_name", "treatment_type", "appointment_date",
            "start_time", "end_time", "room", "source_system", "status"
        ])
        writer.writerow(["E001", "P001", "张三", "T001", "李医生", "物理治疗", "2024-01-15", "09:00", "10:00", "Room1", "HIS", "pending"])
        writer.writerow(["E002", "P002", "李四", "T001", "李医生", "作业治疗", "2024-01-15", "09:30", "10:30", "Room2", "HIS", "pending"])
        writer.writerow(["E003", "", "王五", "T002", "王医生", "言语治疗", "2024-01-15", "14:00", "15:00", "Room3", "Manual", "pending"])

    params_path = os.path.join(scenario_dir, "params.json")
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump({
            "batch_id": "TEST-EXP-007",
            "operator": "exporter"
        }, f, ensure_ascii=False)

    run_cli([
        "generate",
        "-l", ledger_path,
        "-p", params_path,
        "-o", scenario_dir
    ], "先生成数据")

    success_file = os.path.join(scenario_dir, "success_TEST-EXP-007.csv")
    bad_file = os.path.join(scenario_dir, "bad_rows_TEST-EXP-007.csv")
    summary_file = os.path.join(scenario_dir, "summary_TEST-EXP-007.json")
    logs_file = os.path.join(scenario_dir, "logs_TEST-EXP-007.csv")

    all_pass = True

    ret = run_cli([
        "summary",
        "-s", summary_file,
        "-r", success_file,
        "-b", bad_file,
        "-l", logs_file
    ], "summary 命令查看摘要")
    all_pass &= assert_eq(ret, 0, "summary 命令执行成功")

    export_json = os.path.join(scenario_dir, "export.json")
    ret = run_cli([
        "export",
        "-r", success_file,
        "-b", bad_file,
        "-f", "json",
        "-o", export_json
    ], "export 命令导出 JSON")
    all_pass &= assert_eq(ret, 0, "export JSON 命令执行成功")
    all_pass &= assert_eq(os.path.exists(export_json), True, "JSON 导出文件存在")

    export_csv_dir = os.path.join(scenario_dir, "export_csv")
    ret = run_cli([
        "export",
        "-r", success_file,
        "-b", bad_file,
        "-f", "csv",
        "-o", export_csv_dir
    ], "export 命令导出 CSV")
    all_pass &= assert_eq(ret, 0, "export CSV 命令执行成功")

    if all_pass:
        print("\n✅ 场景七：导出和摘要命令 - 通过")
    else:
        print("\n❌ 场景七：导出和摘要命令 - 失败")

    return all_pass


def main():
    """主函数"""
    print("\n" + "="*70)
    print("🧪 康复治疗预约冲突CLI - 综合测试")
    print("="*70)

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = {}

    results["场景一：单条成功"] = test_scenario_1_single_success()
    results["场景二：批量部分失败"] = test_scenario_2_batch_partial_failure()
    results["场景三：人工复核"] = test_scenario_3_manual_review()
    results["场景四：重复提交"] = test_scenario_4_duplicate_submission()
    results["场景五：增量数据有变化"] = test_scenario_5_incremental_with_changes()
    results["场景六：校验命令"] = test_scenario_6_validate_command()
    results["场景七：导出和摘要"] = test_scenario_7_export_and_summary()

    print("\n" + "="*70)
    print("📊 测试结果汇总")
    print("="*70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {status} - {name}")

    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
