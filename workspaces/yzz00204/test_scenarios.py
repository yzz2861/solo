#!/usr/bin/env python3
"""测试场景脚本 - 论文盲审冲突回避CLI

覆盖场景:
1. 单条成功场景
2. 批量部分失败场景
3. 人工复核场景
4. 重复提交（幂等性验证）
5. 数据回放与摘要查看
"""
import sys
import os
import json
import csv
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from paper_review_cli.core.validator import run_validate_command
from paper_review_cli.core.generator import run_generate_command
from paper_review_cli.core.diff import apply_diff_to_result
from paper_review_cli.core.exporter import export_results, export_summary
from paper_review_cli.utils.file_io import read_batch_snapshot


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXAMPLES_DIR = os.path.join(BASE_DIR, "examples")
OUTPUT_DIR = os.path.join(BASE_DIR, "test_output")


def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_1_single_success():
    """场景1: 单条成功 - 数据全部合法，分配成功"""
    print_section("场景1: 单条成功（全量成功分配）")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_single_success.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario1")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
    )

    files = export_results(result, output_dir)
    summary = export_summary(result)

    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数: {summary['total_count']}")
    print(f"成功分配: {summary['success_count']} 篇")
    print(f"坏行: {summary['bad_count']} 条")
    print(f"分配记录总数: {summary['assignments_count']} 条")

    success_file = files["success"]
    with open(success_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        success_count = sum(1 for _ in reader)
    print(f"成功结果CSV行数: {success_count} 条分配记录")

    assert summary["status"] == "success", f"预期状态success，实际{summary['status']}"
    assert summary["bad_count"] == 0, f"预期坏行0，实际{summary['bad_count']}"
    assert summary["assignments_count"] == summary["total_count"] * 3, "分配记录数应为论文数x3"

    print("✅ 场景1测试通过")
    return summary["batch_id"], files["snapshot"]


def test_2_partial_failure():
    """场景2: 批量部分失败 - 部分数据为坏行"""
    print_section("场景2: 批量部分失败")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_partial_failure.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario2")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
    )

    files = export_results(result, output_dir)
    summary = export_summary(result)

    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数(有效): {summary['total_count']}")
    print(f"成功分配: {summary['success_count']} 篇")
    print(f"坏行: {summary['bad_count']} 条")

    bad_file = files["bad_records"]
    with open(bad_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        bad_rows = list(reader)
    print(f"坏行文件记录数: {len(bad_rows)} 条")
    for i, row in enumerate(bad_rows[:3], 1):
        errors = row.get("errors", "")
        print(f"  坏行{i}: 第{row.get('source_line', '?')}行 - {errors[:50]}...")

    assert summary["status"] == "partial_success", f"预期partial_success，实际{summary['status']}"
    assert summary["bad_count"] > 0, "应该有坏行记录"
    assert len(bad_rows) == summary["bad_count"], "坏行文件记录数应与统计一致"

    print("✅ 场景2测试通过")
    return summary["batch_id"]


def test_3_manual_review():
    """场景3: 人工复核 - 合格评审人不足，需要人工复核"""
    print_section("场景3: 人工复核")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_manual_review.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers_manual_review.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario3")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
        allow_manual_review=True,
    )

    files = export_results(result, output_dir)
    summary = export_summary(result)

    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数: {summary['total_count']}")
    print(f"成功分配: {summary['success_count']} 篇")
    print(f"待人工复核: {summary['manual_review_count']} 篇")

    manual_file = files["manual_review"]
    if os.path.exists(manual_file):
        with open(manual_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            manual_rows = list(reader)
        print(f"人工复核文件记录数: {len(manual_rows)} 条")
        for i, row in enumerate(manual_rows[:3], 1):
            conflicts = row.get("conflicts", "")
            error = row.get("error_message", "")
            print(f"  复核{i}: 论文{row.get('paper_id', '')} - 评审人{row.get('reviewer_id', '')} - {error[:40]}")

    assert summary["manual_review_count"] > 0, "应该有待人工复核的论文"

    print("✅ 场景3测试通过")
    return summary["batch_id"]


def test_4_repeat_submission_idempotency():
    """场景4: 重复提交（幂等性验证）- 相同输入不能产生新差异"""
    print_section("场景4: 重复提交 - 幂等性验证")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_single_success.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario4")

    result1 = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
    )
    files1 = export_results(result1, output_dir)
    snap1 = read_batch_snapshot(files1["snapshot"])
    assign1_count = len(snap1.get("assignments", []))

    print(f"第一次执行: 批次 {result1.batch.batch_id}，分配 {assign1_count} 条")

    result2 = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        snapshot_file=files1["snapshot"],
        per_paper_count=3,
    )
    apply_diff_to_result(result2, snap1)
    files2 = export_results(result2, output_dir)

    diff_count = len(result2.diff_records)
    print(f"第二次执行: 批次 {result2.batch.batch_id}，差异 {diff_count} 条")

    if diff_count > 0:
        for d in result2.diff_records[:5]:
            print(f"  差异: {d['diff_type']} - {d['paper_id']}/{d['reviewer_id']} - {d['field']}")

    assign2 = {f"{a.paper_id}|{a.reviewer_id}" for a in result2.assignments}
    assign1_set = {f"{a['paper_id']}|{a['reviewer_id']}" for a in snap1.get("assignments", [])}
    print(f"第一次分配集合大小: {len(assign1_set)}")
    print(f"第二次分配集合大小: {len(assign2)}")
    print(f"两次分配完全相同: {assign1_set == assign2}")

    assert assign1_set == assign2, "两次执行的分配结果应该完全一致（幂等性）"

    print("✅ 场景4测试通过 - 幂等性验证成功")
    return result2.batch.batch_id


def test_5_summary_and_replay():
    """场景5: 摘要查看与数据回放"""
    print_section("场景5: 摘要查看与数据回放")

    output_dir = os.path.join(OUTPUT_DIR, "scenario1")
    snap_dir = os.path.join(output_dir, "snapshots")

    snap_files = [f for f in os.listdir(snap_dir) if f.endswith(".json")]
    print(f"找到快照文件: {len(snap_files)} 个")

    if snap_files:
        snap_file = os.path.join(snap_dir, snap_files[0])
        snap_data = read_batch_snapshot(snap_file)

        bi = snap_data.get("batch_info", {})
        print(f"\n批次ID: {bi.get('batch_id', '')}")
        print(f"命令: {bi.get('command', '')}")
        print(f"状态: {bi.get('status', '')}")
        print(f"总记录数: {bi.get('total_count', 0)}")
        print(f"成功数: {bi.get('success_count', 0)}")
        print(f"分配记录数: {len(snap_data.get('assignments', []))}")

        logs = snap_data.get("logs", [])
        print(f"\n操作日志({len(logs)}条) - 最后3条:")
        for log in logs[-3:]:
            print(f"  {log}")

        assert bi.get("batch_id"), "快照应该包含批次ID"
        assert len(snap_data.get("assignments", [])) > 0, "快照应该包含分配记录"
        assert len(logs) > 0, "快照应该包含操作日志"

    replay_dir = os.path.join(OUTPUT_DIR, "scenario5_replay")
    if snap_files:
        snap_file = os.path.join(snap_dir, snap_files[0])
        from paper_review_cli.core.exporter import export_results
        from paper_review_cli.models import ProcessResult, BatchInfo, AssignmentResult, RecordStatus, ConflictType, TaskStatus

        snap_data = read_batch_snapshot(snap_file)
        bi = snap_data.get("batch_info", {})
        batch = BatchInfo(
            batch_id=bi.get("batch_id", ""),
            command=bi.get("command", ""),
            status=TaskStatus(bi.get("status", "pending")),
            total_count=bi.get("total_count", 0),
            success_count=bi.get("success_count", 0),
            bad_count=bi.get("bad_count", 0),
        )
        result = ProcessResult(
            batch=batch,
            bad_records=snap_data.get("bad_records", []),
            diff_records=snap_data.get("diff_records", []),
            logs=snap_data.get("logs", []),
        )
        for a_dict in snap_data.get("assignments", []):
            conflicts = [ConflictType(c) for c in a_dict.get("conflicts", [])]
            result.assignments.append(AssignmentResult(
                paper_id=a_dict.get("paper_id", ""),
                reviewer_id=a_dict.get("reviewer_id", ""),
                reviewer_name=a_dict.get("reviewer_name", ""),
                reviewer_institution=a_dict.get("reviewer_institution", ""),
                conflicts=conflicts,
                status=RecordStatus(a_dict.get("status", "success")),
                error_message=a_dict.get("error_message", ""),
                batch_id=a_dict.get("batch_id", ""),
                source_file=a_dict.get("source_file", ""),
                source_line=a_dict.get("source_line", 0),
            ))

        files = export_results(result, replay_dir)
        print(f"\n数据回放导出完成: {replay_dir}/{result.batch.batch_id}/")

        orig_count = len(snap_data.get("assignments", []))
        replayed_file = files["all_results"]
        with open(replayed_file, "r", encoding="utf-8-sig") as f:
            replayed_count = sum(1 for _ in csv.DictReader(f))
        print(f"原始分配数: {orig_count}, 回放分配数: {replayed_count}")
        assert orig_count == replayed_count, "数据回放应该与原始数据一致"

    print("✅ 场景5测试通过")


def test_6_data_traceability():
    """场景6: 数据溯源 - 批次和来源标识验证"""
    print_section("场景6: 数据溯源验证")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_single_success.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario6")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
    )
    files = export_results(result, output_dir)

    success_file = files["success"]
    with open(success_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"成功结果字段: {list(rows[0].keys()) if rows else '无数据'}")

    has_batch = all("batch_id" in r for r in rows)
    has_source = all("source_file" in r for r in rows)
    has_source_line = all("source_line" in r for r in rows)

    print(f"包含批次ID: {has_batch}")
    print(f"包含来源文件: {has_source}")
    print(f"包含来源行号: {has_source_line}")

    if rows:
        print(f"示例批次ID: {rows[0]['batch_id']}")
        print(f"示例来源文件: {rows[0]['source_file']}")
        print(f"示例来源行号: {rows[0]['source_line']}")

    assert has_batch, "结果应该包含批次ID"
    assert has_source, "结果应该包含来源文件"
    assert has_source_line, "结果应该包含来源行号"

    bad_file = files["bad_records"]
    if os.path.exists(bad_file):
        with open(bad_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            bad_rows = list(reader)
        if bad_rows:
            print(f"坏行文件字段: {list(bad_rows[0].keys())[:8]}...")
            has_bad_source = all("source_file" in r for r in bad_rows)
            has_bad_line = all("source_line" in r for r in bad_rows)
            print(f"坏行包含来源文件: {has_bad_source}")
            print(f"坏行包含来源行号: {has_bad_line}")

    print("✅ 场景6测试通过 - 数据溯源完整")


def test_7_no_manual_review_all_failed():
    """场景7: 关闭人工复核且全部失败 - 状态应为failed，退出码非0"""
    print_section("场景7: 关闭人工复核 - 全部失败验证")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_manual_review.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers_manual_review.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario7")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
        allow_manual_review=False,
    )

    files = export_results(result, output_dir)
    summary = export_summary(result)

    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数: {summary['total_count']}")
    print(f"成功分配: {summary['success_count']} 篇")
    print(f"失败: {summary['failed_count']} 篇")
    print(f"待人工复核: {summary['manual_review_count']} 篇")
    print(f"分配记录总数: {summary['assignments_count']} 条")

    assert summary["status"] == "failed", f"关闭人工复核且全部失败时状态应为failed，实际为{summary['status']}"
    assert summary["success_count"] == 0, "全部失败时成功数应为0"
    assert summary["failed_count"] == summary["total_count"], "全部失败时失败数应等于总论文数"
    assert summary["manual_review_count"] == 0, "关闭人工复核时待复核数应为0"
    assert summary["assignments_count"] == 0, "全部失败时分配记录数应为0"

    print("✅ 场景7测试通过 - 关闭人工复核全部失败状态正确")


def test_8_manual_review_count_accuracy():
    """场景8: 人工复核论文数准确性验证 - 应按论文数统计而非记录数//每篇数"""
    print_section("场景8: 人工复核论文数准确性验证")

    paper_file = os.path.join(EXAMPLES_DIR, "papers_manual_review.csv")
    reviewer_file = os.path.join(EXAMPLES_DIR, "reviewers_manual_review.csv")
    rules_file = os.path.join(EXAMPLES_DIR, "rules.json")
    output_dir = os.path.join(OUTPUT_DIR, "scenario8")

    result = run_generate_command(
        paper_file=paper_file,
        reviewer_file=reviewer_file,
        rules_file=rules_file,
        output_dir=output_dir,
        per_paper_count=3,
        allow_manual_review=True,
    )

    summary = export_summary(result)

    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数: {summary['total_count']}")
    print(f"待人工复核论文数: {summary['manual_review_count']}")
    print(f"分配记录总数: {summary['assignments_count']}")

    manual_paper_ids = set(a.paper_id for a in result.assignments if a.status.value == "manual_review")
    print(f"实际待复核的论文ID数: {len(manual_paper_ids)}")
    print(f"待复核的论文ID: {sorted(manual_paper_ids)}")

    assert summary["manual_review_count"] == len(manual_paper_ids), (
        f"manual_review_count统计错误: 报表显示{summary['manual_review_count']}篇，"
        f"实际有{len(manual_paper_ids)}篇不同的论文"
    )
    assert summary["manual_review_count"] == 3, (
        f"预期3篇论文待复核，实际{summary['manual_review_count']}篇"
    )
    assert summary["status"] != "success", (
        "有论文待人工复核时，状态不应为success"
    )

    print("✅ 场景8测试通过 - 人工复核论文数统计准确")


def main():
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)

    print("论文盲审冲突回避 CLI - 综合测试")
    print(f"测试输出目录: {OUTPUT_DIR}")

    try:
        test_1_single_success()
        test_2_partial_failure()
        test_3_manual_review()
        test_4_repeat_submission_idempotency()
        test_5_summary_and_replay()
        test_6_data_traceability()
        test_7_no_manual_review_all_failed()
        test_8_manual_review_count_accuracy()

        print_section("所有测试通过 ✅")
        return 0
    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
