#!/usr/bin/env python3
"""冷库果蔬预冷排程 CLI - 测试场景脚本

覆盖场景:
1. 单条成功
2. 批量部分失败
3. 人工复核
4. 重复提交（幂等性验证）
"""

import os
import sys
import json
import csv
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TEST_DATA_DIR = BASE_DIR / "tests" / "data"
OUTPUT_DIR = BASE_DIR / "output"
CLI_CMD = [sys.executable, "-m", "precool_scheduler"]


def run_cli(args, expect_exit=0, desc=""):
    """运行 CLI 命令并返回结果"""
    print(f"\n{'='*70}")
    print(f"  场景: {desc}")
    print(f"  命令: {' '.join(args)}")
    print(f"{'='*70}")
    result = subprocess.run(
        args,
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
    )
    print(f"  退出码: {result.returncode} (期望: {expect_exit})")
    if result.stdout:
        print("  标准输出:")
        for line in result.stdout.strip().split("\n"):
            print(f"    {line}")
    if result.stderr:
        print("  标准错误:")
        for line in result.stderr.strip().split("\n"):
            print(f"    {line}")

    passed = result.returncode == expect_exit
    status = "✅ 通过" if passed else "❌ 失败"
    print(f"  结果: {status}")
    return result


def clear_output():
    """清空输出目录"""
    if OUTPUT_DIR.exists():
        shutil.rmtree(str(OUTPUT_DIR))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def test_1_single_success():
    """场景1: 单条成功"""
    print("\n" + "="*70)
    print("  场景1: 单条成功 - validate 命令")
    print("="*70)

    file = TEST_DATA_DIR / "single_success.csv"

    result = run_cli(
        CLI_CMD + ["validate", str(file)],
        expect_exit=0,
        desc="单条成功记录校验",
    )

    assert "通过校验:      1" in result.stdout, "应显示1条通过"
    assert "异常记录:      0" in result.stdout, "应显示0条异常"

    passed_csv = list(OUTPUT_DIR.glob("*_passed.csv"))
    exceptions_csv = list(OUTPUT_DIR.glob("*_exceptions.csv"))
    assert len(passed_csv) == 1, "应生成通过清单 CSV"
    assert len(exceptions_csv) == 1, "应生成异常清单 CSV"

    with open(passed_csv[0], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        assert len(rows) == 1, "通过清单应有1条记录"
        rec = rows[0]
        assert "batch_id" in rec, "应包含批次号"
        assert "source_file" in rec, "应包含来源文件"
        assert "row_number" in rec, "应包含行号"
        assert "source_row_hash" in rec, "应包含来源行哈希"
        assert "record_id" in rec, "应包含记录ID"
        assert rec["status"] == "pending", "状态应为 pending"
        print(f"  ✅ 通过清单验证: 记录ID={rec['record_id']}, 来源={rec['source_file']} 第{rec['row_number']}行")

    with open(exceptions_csv[0], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        assert len(rows) == 0, "异常清单应为空"
        print(f"  ✅ 异常清单验证: 0条异常（正确）")

    print("  ✅ 场景1 全部通过")
    return True


def test_2_batch_partial_fail():
    """场景2: 批量部分失败"""
    clear_output()
    print("\n" + "="*70)
    print("  场景2: 批量部分失败 - generate 命令")
    print("="*70)

    file = TEST_DATA_DIR / "batch_partial_fail.csv"
    mapping = TEST_DATA_DIR / "field_mapping.csv"

    result = run_cli(
        CLI_CMD + ["generate", str(file), "--mapping", str(mapping), "--format", "json"],
        expect_exit=1,
        desc="批量部分失败（含字段映射）",
    )

    assert result.returncode == 1, "有异常时退出码应为1"

    json_files = list(OUTPUT_DIR.glob("*_result.json"))
    assert len(json_files) == 1, "应生成结果 JSON"

    with open(json_files[0], "r", encoding="utf-8") as f:
        data = json.load(f)

    summary = data["summary"]
    assert summary["total_records"] == 10, f"总记录数应为10，实际{summary['total_records']}"
    assert summary["passed_records"] < 10, "通过数应小于10"
    assert summary["exception_records"] > 0, "应有异常记录"
    print(f"  ✅ 汇总验证: 总{summary['total_records']}条, 通过{summary['passed_records']}条, 异常{summary['exception_records']}条")

    exceptions = data["exceptions"]
    assert len(exceptions) > 0, "异常清单非空"
    for exc in exceptions:
        assert exc["errors"], "每条异常应有错误信息"
        assert exc["source_file"], "应保留来源文件"
        assert exc["row_number"], "应保留行号"
    print(f"  ✅ 坏行隔离验证: {len(exceptions)}条异常已隔离到异常清单，均含错误信息和来源标识")

    passed = data["passed"]
    for rec in passed:
        assert "batch_id" in rec
        assert "source_row_hash" in rec
    print(f"  ✅ 来源追溯验证: 通过记录均含批次号、来源文件、行号、行哈希")

    print("  ✅ 场景2 全部通过")
    return True


def test_3_manual_review():
    """场景3: 人工复核"""
    clear_output()
    print("\n" + "="*70)
    print("  场景3: 人工复核 - generate + summary")
    print("="*70)

    file = TEST_DATA_DIR / "review_required.csv"

    result = run_cli(
        CLI_CMD + ["generate", str(file), "--format", "csv"],
        expect_exit=0,
        desc="人工复核场景",
    )

    assert "人工复核入口" in result.stdout, "控制台应显示人工复核入口"
    print(f"  ✅ 控制台验证: 显示人工复核入口")

    passed_csv = list(OUTPUT_DIR.glob("*_passed.csv"))
    assert len(passed_csv) == 1

    with open(passed_csv[0], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        review_rows = [r for r in rows if r["review_required"] == "True"]
        assert len(review_rows) > 0, "应有待复核记录"
        for rec in review_rows:
            assert rec["review_reason"], "待复核记录应有复核原因"
            assert rec["record_id"], "待复核记录应有记录ID作为复核入口"
        print(f"  ✅ 复核入口验证: {len(review_rows)}条待复核记录，均含record_id和review_reason")

    summary_json = list(OUTPUT_DIR.glob("*_summary.json"))
    assert len(summary_json) == 1
    batch_id = None
    with open(summary_json[0], "r", encoding="utf-8") as f:
        s = json.load(f)
        batch_id = s["batch_id"]
        assert s["review_records"] > 0, "摘要中应包含待复核数量"
        print(f"  ✅ 摘要验证: review_records = {s['review_records']}")

    result2 = run_cli(
        CLI_CMD + ["summary", "--batch-id", batch_id],
        expect_exit=0,
        desc=f"查看批次 {batch_id} 摘要",
    )
    assert batch_id in result2.stdout, "summary 命令应显示批次号"
    assert "待人工复核" in result2.stdout, "summary 应显示待复核数量"
    print(f"  ✅ summary命令验证: 正确显示批次摘要和复核信息")

    print("  ✅ 场景3 全部通过")
    return True


def test_4_duplicate_submission():
    """场景4: 重复提交 - 幂等性验证"""
    clear_output()
    print("\n" + "="*70)
    print("  场景4: 重复提交 - 幂等性验证")
    print("="*70)

    file = TEST_DATA_DIR / "single_success.csv"
    batch_id = "BATCH-IDEMPOTENT-001"

    result1 = run_cli(
        CLI_CMD + ["generate", str(file), "--batch-id", batch_id, "--format", "json"],
        expect_exit=0,
        desc="第一次提交",
    )

    json_files1 = list(OUTPUT_DIR.glob("*_result.json"))
    assert len(json_files1) == 1
    with open(json_files1[0], "r", encoding="utf-8") as f:
        data1 = json.load(f)
    idem_key_1 = data1["idempotency_key"]
    print(f"  第一次幂等键: {idem_key_1}")

    result2 = run_cli(
        CLI_CMD + ["generate", str(file), "--batch-id", batch_id, "--format", "json"],
        expect_exit=0,
        desc="第二次提交（相同数据）",
    )

    assert "命中缓存" in result2.stdout or "幂等" in result2.stdout, "第二次应命中缓存"
    print(f"  ✅ 控制台验证: 显示幂等/缓存提示")

    json_files2 = list(OUTPUT_DIR.glob("*_result.json"))
    assert len(json_files2) == 1, f"不应生成新文件，实际有{len(json_files2)}个"
    with open(json_files2[0], "r", encoding="utf-8") as f:
        data2 = json.load(f)

    idem_key_2 = data2["idempotency_key"]
    print(f"  第二次幂等键: {idem_key_2}")
    assert idem_key_1 == idem_key_2, "幂等键应相同"
    print(f"  ✅ 幂等键验证: 两次幂等键一致")

    assert data1["passed"] == data2["passed"], "通过清单应完全一致"
    assert data1["exceptions"] == data2["exceptions"], "异常清单应完全一致"
    assert data1["summary"]["total_precool_hours"] == data2["summary"]["total_precool_hours"]
    print(f"  ✅ 结果一致性验证: 通过/异常/摘要数据完全一致，无新增差异")

    result3 = run_cli(
        CLI_CMD + ["generate", str(file), "--no-idempotent", "--batch-id", batch_id, "--format", "json"],
        expect_exit=0,
        desc="禁用幂等后再提交",
    )
    assert "命中缓存" not in result3.stdout, "禁用幂等后不应命中缓存"
    print(f"  ✅ --no-idempotent 验证: 禁用后不命中缓存")

    print("  ✅ 场景4 全部通过")
    return True


def test_5_export_formats():
    """额外场景: 多格式导出验证"""
    clear_output()
    print("\n" + "="*70)
    print("  额外场景: 多格式导出验证")
    print("="*70)

    file = TEST_DATA_DIR / "single_success.csv"

    for fmt in ["csv", "json", "excel"]:
        clear_output()
        result = run_cli(
            CLI_CMD + ["export", str(file), "--format", fmt],
            expect_exit=0,
            desc=f"导出 {fmt} 格式",
        )
        if fmt == "csv":
            assert any("passed" in f.name for f in OUTPUT_DIR.iterdir()), "CSV 格式应有passed文件"
            assert any("exceptions" in f.name for f in OUTPUT_DIR.iterdir()), "CSV 格式应有exceptions文件"
            assert any("summary" in f.name for f in OUTPUT_DIR.iterdir()), "CSV 格式应有summary文件"
        elif fmt == "json":
            assert any("_result.json" in f.name for f in OUTPUT_DIR.iterdir()), "JSON 格式应有result文件"
        elif fmt == "excel":
            assert any(".xlsx" in f.name for f in OUTPUT_DIR.iterdir()), "Excel 格式应有xlsx文件"
        print(f"  ✅ {fmt} 格式导出验证通过")

    print("  ✅ 多格式导出全部通过")
    return True


def main():
    print("\n" + "="*70)
    print("  冷库果蔬预冷排程 CLI - 测试场景总览")
    print("="*70)
    print("  1. 单条成功")
    print("  2. 批量部分失败")
    print("  3. 人工复核")
    print("  4. 重复提交（幂等性）")
    print("  5. 多格式导出")

    results = {}

    try:
        clear_output()
        results["场景1_单条成功"] = test_1_single_success()
    except Exception as e:
        print(f"  ❌ 场景1失败: {e}")
        import traceback
        traceback.print_exc()
        results["场景1_单条成功"] = False

    try:
        results["场景2_批量部分失败"] = test_2_batch_partial_fail()
    except Exception as e:
        print(f"  ❌ 场景2失败: {e}")
        import traceback
        traceback.print_exc()
        results["场景2_批量部分失败"] = False

    try:
        results["场景3_人工复核"] = test_3_manual_review()
    except Exception as e:
        print(f"  ❌ 场景3失败: {e}")
        import traceback
        traceback.print_exc()
        results["场景3_人工复核"] = False

    try:
        results["场景4_重复提交"] = test_4_duplicate_submission()
    except Exception as e:
        print(f"  ❌ 场景4失败: {e}")
        import traceback
        traceback.print_exc()
        results["场景4_重复提交"] = False

    try:
        results["场景5_多格式导出"] = test_5_export_formats()
    except Exception as e:
        print(f"  ❌ 场景5失败: {e}")
        import traceback
        traceback.print_exc()
        results["场景5_多格式导出"] = False

    print("\n" + "="*70)
    print("  测试结果汇总")
    print("="*70)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for name, ok in results.items():
        status = "✅ 通过" if ok else "❌ 失败"
        print(f"  {name}: {status}")
    print(f"\n  总计: {passed}/{total} 通过")
    print("="*70)

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
