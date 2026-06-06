#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
煤矿瓦斯巡检CLI - 验收测试脚本

验收场景：
1. 完整数据正常处理
2. 时间越界数据隔离
3. 编号错误数据隔离
4. 配置缺失错误提示
5. dry-run 预览模式
6. 坏行复核入口验证
7. 批次与来源标识验证
8. 多源文件合并
"""

import os
import sys
import json
import csv
import subprocess
import shutil
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
TEST_DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

sys.path.insert(0, PROJECT_DIR)


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_section(title):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}  {title}{Colors.RESET}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'='*60}{Colors.RESET}")


def print_pass(msg):
    print(f"  {Colors.GREEN}✓ PASS{Colors.RESET} - {msg}")


def print_fail(msg):
    print(f"  {Colors.RED}✗ FAIL{Colors.RESET} - {msg}")


def print_info(msg):
    print(f"  {Colors.YELLOW}ℹ INFO{Colors.RESET} - {msg}")


def run_cli(args, expect_fail=False):
    cmd = [sys.executable, os.path.join(PROJECT_DIR, "gas_inspect.py")] + args
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=PROJECT_DIR,
    )
    return result


def clean_output():
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def read_csv(filepath):
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    return rows


def read_json(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def test_1_complete_data():
    """场景1：完整数据正常处理"""
    print_section("场景1：完整数据正常处理")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    if result.returncode != 0:
        print_fail(f"命令执行失败: {result.stderr}")
        return False

    print_pass("命令执行成功")
    print_info(f"stdout: {result.stdout.strip()[:200]}...")

    summary_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("summary_") and f.endswith(".json")]
    if not summary_files:
        print_fail("未找到 summary 文件")
        return False

    summary = read_json(os.path.join(OUTPUT_DIR, summary_files[0]))
    stats = summary["stats"]

    all_passed = True

    if stats["total"] == 10:
        print_pass(f"总记录数正确: {stats['total']}")
    else:
        print_fail(f"总记录数错误: 期望 10, 实际 {stats['total']}")
        all_passed = False

    if stats["valid"] == 10:
        print_pass(f"有效记录数正确: {stats['valid']}")
    else:
        print_fail(f"有效记录数错误: 期望 10, 实际 {stats['valid']}")
        all_passed = False

    if stats["bad"] == 0:
        print_pass(f"坏行数正确: {stats['bad']}")
    else:
        print_fail(f"坏行数错误: 期望 0, 实际 {stats['bad']}")
        all_passed = False

    success_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("success_")]
    bad_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("bad_rows_")]
    diff_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("diff_")]
    log_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("operation_")]

    for name, files in [("success", success_files), ("bad_rows", bad_files),
                        ("diff", diff_files), ("operation log", log_files)]:
        if files:
            print_pass(f"{name} 文件已生成")
        else:
            print_fail(f"{name} 文件未生成")
            all_passed = False

    if success_files:
        success_rows = read_csv(os.path.join(OUTPUT_DIR, success_files[0]))
        has_source = all("_source_file" in r for r in success_rows)
        has_batch = all("_batch_id" in r for r in success_rows)
        if has_source and has_batch:
            print_pass("成功结果包含来源文件和批次标识")
        else:
            print_fail("成功结果缺少来源/批次标识")
            all_passed = False

    return all_passed


def test_2_time_out_of_bounds():
    """场景2：时间越界数据隔离"""
    print_section("场景2：时间越界数据隔离")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_with_errors.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    if result.returncode != 0:
        print_fail(f"命令执行失败: {result.stderr}")
        return False

    print_pass("命令执行成功")

    bad_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("bad_rows_")]
    if not bad_files:
        print_fail("未找到坏行文件")
        return False

    bad_rows = read_csv(os.path.join(OUTPUT_DIR, bad_files[0]))
    bad_ids = [r.get("巡检编号", "") for r in bad_rows]
    bad_reasons = [r.get("_bad_reason", "") for r in bad_rows]

    all_passed = True

    early_bound = any("时间早于起始日期" in r for r in bad_reasons)
    late_bound = any("时间晚于结束日期" in r for r in bad_reasons)

    if early_bound:
        print_pass("早于起始日期的记录被正确隔离")
    else:
        print_fail("未检测到早于起始日期的记录")
        all_passed = False

    if late_bound:
        print_pass("晚于结束日期的记录被正确隔离")
    else:
        print_fail("未检测到晚于结束日期的记录")
        all_passed = False

    return all_passed


def test_3_invalid_id():
    """场景3：编号错误数据隔离"""
    print_section("场景3：编号错误/数据错误隔离")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_with_errors.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    if result.returncode != 0:
        print_fail(f"命令执行失败: {result.stderr}")
        return False

    bad_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("bad_rows_")]
    bad_rows = read_csv(os.path.join(OUTPUT_DIR, bad_files[0]))
    bad_reasons = [r.get("_bad_reason", "") for r in bad_rows]

    all_passed = True

    id_error = any("巡检编号格式错误" in r for r in bad_reasons)
    has_empty_id = any(r.get("巡检编号", "").strip() == "" for r in bad_rows)
    id_empty = has_empty_id and any("巡检编号格式错误或为空" in r for r in bad_reasons)
    gas_error = any("瓦斯浓度无效" in r for r in bad_reasons)
    loc_error = any("巡检地点为空" in r for r in bad_reasons)
    time_format_error = any("时间格式无法解析" in r for r in bad_reasons)

    checks = [
        ("编号格式错误被隔离", id_error),
        ("编号空值被隔离", id_empty),
        ("瓦斯浓度错误被隔离", gas_error),
        ("地点空值被隔离", loc_error),
        ("时间格式错误被隔离", time_format_error),
    ]

    for name, ok in checks:
        if ok:
            print_pass(name)
        else:
            print_fail(name)
            all_passed = False

    success_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("success_")]
    success_rows = read_csv(os.path.join(OUTPUT_DIR, success_files[0]))

    valid_slash_date = any(r.get("巡检编号") == "INSP-011" for r in success_rows)
    valid_compact_date = any(r.get("巡检编号") == "INSP-012" for r in success_rows)

    if valid_slash_date and valid_compact_date:
        print_pass("多种日期格式的有效记录正确通过")
    else:
        print_fail("多日期格式解析异常")
        all_passed = False

    return all_passed


def test_4_missing_config():
    """场景4：配置缺失错误提示"""
    print_section("场景4：配置缺失错误提示")
    clean_output()

    all_passed = True

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", "/nonexistent/mapping.json",
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-o", OUTPUT_DIR,
    ])
    if result.returncode != 0 and "不存在" in result.stderr:
        print_pass("映射文件不存在时正确报错")
    else:
        print_fail("映射文件不存在时未正确报错")
        all_passed = False

    result = run_cli([
        "-f", "/nonexistent/source.csv",
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-o", OUTPUT_DIR,
    ])
    if result.returncode != 0 and "不存在" in result.stderr:
        print_pass("输入文件不存在时正确报错")
    else:
        print_fail("输入文件不存在时未正确报错")
        all_passed = False

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "invalid-date",
        "-e", "2025-06-05",
        "-o", OUTPUT_DIR,
    ])
    if result.returncode != 0 and "格式错误" in result.stderr:
        print_pass("日期格式错误时正确报错")
    else:
        print_fail("日期格式错误时未正确报错")
        all_passed = False

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-10",
        "-e", "2025-06-05",
        "-o", OUTPUT_DIR,
    ])
    if result.returncode != 0 and "晚于" in result.stderr:
        print_pass("起始日期晚于结束日期时正确报错")
    else:
        print_fail("起始日期晚于结束日期时未正确报错")
        all_passed = False

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "xml",
        "-o", OUTPUT_DIR,
    ])
    if result.returncode != 0 and "不支持" in result.stderr:
        print_pass("不支持的导出格式时正确报错")
    else:
        print_fail("不支持的导出格式时未正确报错")
        all_passed = False

    return all_passed


def test_5_dry_run():
    """场景5：dry-run 预览模式"""
    print_section("场景5：dry-run 预览模式")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-o", OUTPUT_DIR,
        "--dry-run",
    ])

    all_passed = True

    if result.returncode == 0:
        print_pass("dry-run 命令执行成功")
    else:
        print_fail(f"dry-run 命令执行失败: {result.stderr}")
        return False

    if "DRY-RUN" in result.stdout or "预览" in result.stdout:
        print_pass("控制台输出包含 dry-run 标识")
    else:
        print_fail("控制台输出缺少 dry-run 标识")
        all_passed = False

    success_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("success_")]
    bad_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("bad_rows_")]
    diff_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("diff_")]

    if not success_files and not bad_files and not diff_files:
        print_pass("dry-run 模式不生成正式结果文件")
    else:
        print_fail("dry-run 模式生成了不应有的结果文件")
        all_passed = False

    log_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("operation_")]
    if log_files:
        print_pass("dry-run 模式仍生成操作日志")
    else:
        print_fail("dry-run 模式未生成操作日志")
        all_passed = False

    return all_passed


def test_6_review_entry():
    """场景6：坏行复核入口"""
    print_section("场景6：坏行复核入口与来源追溯")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_with_errors.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    all_passed = True

    if "复核" in result.stdout or "bad_rows" in result.stdout:
        print_pass("控制台输出包含坏行复核提示")
    else:
        print_fail("控制台输出缺少坏行复核提示")
        all_passed = False

    bad_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("bad_rows_")]
    if bad_files:
        bad_rows = read_csv(os.path.join(OUTPUT_DIR, bad_files[0]))
        has_reason = all("_bad_reason" in r for r in bad_rows)
        has_source = all("_source_file" in r for r in bad_rows)
        has_batch = all("_batch_id" in r for r in bad_rows)
        has_row = all("_row_number" in r for r in bad_rows)

        if has_reason:
            print_pass("坏行文件包含坏行原因")
        else:
            print_fail("坏行文件缺少坏行原因")
            all_passed = False

        if has_source and has_batch and has_row:
            print_pass("坏行文件包含来源文件、批次号、行号，可追溯复盘")
        else:
            print_fail("坏行文件缺少追溯信息")
            all_passed = False

        bad_reasons = [r["_bad_reason"] for r in bad_rows if r.get("_bad_reason")]
        print_info(f"坏行原因示例: {bad_reasons[:3]}")

    return all_passed


def test_7_batch_source_traceability():
    """场景7：批次与来源标识"""
    print_section("场景7：批次与来源标识验证")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-f", os.path.join(TEST_DATA_DIR, "source_b.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-b", "TEST-BATCH-001",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    all_passed = True

    if result.returncode == 0:
        print_pass("多文件合并处理成功")
    else:
        print_fail(f"多文件合并处理失败: {result.stderr}")
        return False

    success_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("success_")]
    success_rows = read_csv(os.path.join(OUTPUT_DIR, success_files[0]))

    batches = set(r.get("_batch_id", "") for r in success_rows)
    if batches == {"TEST-BATCH-001"}:
        print_pass("批次号正确写入所有记录")
    else:
        print_fail(f"批次号不正确: {batches}")
        all_passed = False

    sources = set(r.get("_source_file", "") for r in success_rows)
    if "source_a.csv" in sources and "source_b.csv" in sources:
        print_pass("来源文件标识正确，可追溯到原始文件")
    else:
        print_fail(f"来源文件标识缺失: {sources}")
        all_passed = False

    a_count = sum(1 for r in success_rows if r.get("_source_file") == "source_a.csv")
    b_count = sum(1 for r in success_rows if r.get("_source_file") == "source_b.csv")

    if a_count == 10 and b_count == 5:
        print_pass(f"来源记录数正确: source_a={a_count}, source_b={b_count}")
    else:
        print_fail(f"来源记录数错误: source_a={a_count}(期望10), source_b={b_count}(期望5)")
        all_passed = False

    return all_passed


def test_8_diff_table():
    """场景8：差异表生成"""
    print_section("场景8：差异表生成验证")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    all_passed = True

    diff_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("diff_")]
    if not diff_files:
        print_fail("未生成差异表")
        return False

    diff_rows = read_csv(os.path.join(OUTPUT_DIR, diff_files[0]))
    if len(diff_rows) > 0:
        print_pass(f"差异表生成成功，共 {len(diff_rows)} 条记录")
    else:
        print_fail("差异表为空")
        all_passed = False

    required_cols = ["location", "prev_inspection_id", "curr_inspection_id",
                     "prev_gas", "curr_gas", "diff_value", "diff_percent"]
    if diff_rows:
        has_cols = all(col in diff_rows[0] for col in required_cols)
        if has_cols:
            print_pass("差异表包含完整字段（前后记录、差值、百分比）")
        else:
            print_fail(f"差异表缺少字段: {[c for c in required_cols if c not in diff_rows[0]]}")
            all_passed = False

        has_source = "_source_file" in diff_rows[0]
        has_batch = "_batch_id" in diff_rows[0]
        if has_source and has_batch:
            print_pass("差异表包含来源和批次标识")
        else:
            print_fail("差异表缺少来源/批次标识")
            all_passed = False

    return all_passed


def test_9_export_formats():
    """场景9：多格式导出"""
    print_section("场景9：多格式导出验证")
    all_passed = True

    for fmt in ["csv", "json", "excel"]:
        clean_output()
        result = run_cli([
            "-f", os.path.join(TEST_DATA_DIR, "source_a.csv"),
            "-m", os.path.join(TEST_DATA_DIR, "mapping.json"),
            "-s", "2025-06-01",
            "-e", "2025-06-05",
            "-F", fmt,
            "-o", OUTPUT_DIR,
        ])

        if result.returncode == 0:
            print_pass(f"{fmt.upper()} 格式导出成功")
        else:
            print_fail(f"{fmt.upper()} 格式导出失败: {result.stderr}")
            all_passed = False

        if fmt == "excel":
            ext = ".xlsx"
        else:
            ext = "." + fmt

        success_files = [f for f in os.listdir(OUTPUT_DIR)
                         if f.startswith("success_") and f.endswith(ext)]
        if success_files:
            print_pass(f"  {fmt} 格式成功文件存在")
        else:
            print_fail(f"  {fmt} 格式成功文件不存在")
            all_passed = False

    return all_passed


def test_10_alt_field_mapping():
    """场景10：不同字段名映射"""
    print_section("场景10：字段映射适配不同数据源")
    clean_output()

    result = run_cli([
        "-f", os.path.join(TEST_DATA_DIR, "source_alt_fields.csv"),
        "-m", os.path.join(TEST_DATA_DIR, "mapping_alt.json"),
        "-s", "2025-06-01",
        "-e", "2025-06-05",
        "-F", "csv",
        "-o", OUTPUT_DIR,
    ])

    all_passed = True

    if result.returncode == 0:
        print_pass("英文字段名映射处理成功")
    else:
        print_fail(f"英文字段名映射处理失败: {result.stderr}")
        all_passed = False

    success_files = [f for f in os.listdir(OUTPUT_DIR) if f.startswith("success_")]
    if success_files:
        success_rows = read_csv(os.path.join(OUTPUT_DIR, success_files[0]))
        if len(success_rows) == 3:
            print_pass(f"映射后有效记录数正确: {len(success_rows)}")
        else:
            print_fail(f"映射后记录数错误: 期望3, 实际{len(success_rows)}")
            all_passed = False

    return all_passed


def main():
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔══════════════════════════════════════════════════╗")
    print("║    煤矿瓦斯巡检 CLI - 验收测试套件               ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"{Colors.RESET}")
    print(f"测试数据目录: {TEST_DATA_DIR}")
    print(f"输出目录: {OUTPUT_DIR}")

    tests = [
        ("场景1：完整数据正常处理", test_1_complete_data),
        ("场景2：时间越界数据隔离", test_2_time_out_of_bounds),
        ("场景3：编号错误/数据错误隔离", test_3_invalid_id),
        ("场景4：配置缺失错误提示", test_4_missing_config),
        ("场景5：dry-run 预览模式", test_5_dry_run),
        ("场景6：坏行复核入口与追溯", test_6_review_entry),
        ("场景7：批次与来源标识", test_7_batch_source_traceability),
        ("场景8：差异表生成", test_8_diff_table),
        ("场景9：多格式导出", test_9_export_formats),
        ("场景10：字段映射适配", test_10_alt_field_mapping),
    ]

    results = []
    for name, test_fn in tests:
        try:
            ok = test_fn()
            results.append((name, ok))
        except Exception as e:
            print_fail(f"测试异常: {e}")
            results.append((name, False))

    print_section("测试结果汇总")

    passed = sum(1 for _, ok in results if ok)
    total = len(results)

    print(f"\n{Colors.BOLD}共 {total} 个测试场景，通过 {passed} 个，失败 {total - passed} 个{Colors.RESET}\n")

    for name, ok in results:
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if ok else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"  {status}  {name}")

    print()

    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ 所有验收测试通过！{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ 有 {total - passed} 个测试未通过{Colors.RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
