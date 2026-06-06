"""CLI 入口"""
import argparse
import sys
import os
import json

from .core.validator import run_validate_command
from .core.generator import run_generate_command
from .core.diff import apply_diff_to_result
from .core.exporter import export_results, export_summary
from .utils.config import load_rules
from .utils.file_io import read_batch_snapshot, get_snapshot_list
from . import __version__


def cmd_validate(args):
    result = run_validate_command(
        paper_file=args.papers,
        reviewer_file=args.reviewers,
        rules_file=args.rules,
        output_dir=args.output,
        snapshot_file=args.snapshot,
    )

    if args.snapshot and os.path.exists(args.snapshot):
        snap_data = read_batch_snapshot(args.snapshot)
        apply_diff_to_result(result, snap_data)

    files = export_results(result, args.output)
    summary = export_summary(result)

    print("\n========== 校验结果摘要 ==========")
    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总记录数: {summary['total_count']}")
    print(f"坏行数: {summary['bad_count']}")
    if summary['diff_count']:
        print(f"差异数: {summary['diff_count']}")
    print(f"\n输出目录: {args.output}/{summary['batch_id']}/")
    print("====================================")

    return 0 if summary["bad_count"] == 0 else 1


def cmd_generate(args):
    result = run_generate_command(
        paper_file=args.papers,
        reviewer_file=args.reviewers,
        rules_file=args.rules,
        output_dir=args.output,
        snapshot_file=args.snapshot,
        per_paper_count=args.count,
        allow_manual_review=not args.no_manual_review,
    )

    if args.snapshot and os.path.exists(args.snapshot):
        snap_data = read_batch_snapshot(args.snapshot)
        apply_diff_to_result(result, snap_data)

    files = export_results(result, args.output)
    summary = export_summary(result)

    print("\n========== 分配结果摘要 ==========")
    print(f"批次ID: {summary['batch_id']}")
    print(f"状态: {summary['status']}")
    print(f"总论文数: {summary['total_count']}")
    print(f"成功分配: {summary['success_count']} 篇")
    print(f"分配失败: {summary['failed_count']} 篇")
    print(f"待人工复核: {summary['manual_review_count']} 篇")
    print(f"坏行: {summary['bad_count']} 条")
    if summary['diff_count']:
        print(f"差异数: {summary['diff_count']}")
    print(f"\n输出目录: {args.output}/{summary['batch_id']}/")
    print("====================================")

    return 0 if summary["status"] == "success" else 1


def cmd_export(args):
    if not args.snapshot or not os.path.exists(args.snapshot):
        print(f"错误: 快照文件不存在: {args.snapshot}", file=sys.stderr)
        return 1

    snap_data = read_batch_snapshot(args.snapshot)
    if not snap_data:
        print("错误: 快照文件为空或格式错误", file=sys.stderr)
        return 1

    from .models import ProcessResult, BatchInfo, AssignmentResult, RecordStatus, ConflictType, TaskStatus
    import time

    bi = snap_data.get("batch_info", {})
    batch = BatchInfo(
        batch_id=bi.get("batch_id", ""),
        command=bi.get("command", ""),
        start_time=bi.get("start_time", 0),
        end_time=bi.get("end_time", 0),
        status=TaskStatus(bi.get("status", "pending")),
        input_file=bi.get("input_file", ""),
        rules_file=bi.get("rules_file", ""),
        snapshot_file=bi.get("snapshot_file", ""),
        output_dir=bi.get("output_dir", ""),
        total_count=bi.get("total_count", 0),
        success_count=bi.get("success_count", 0),
        failed_count=bi.get("failed_count", 0),
        bad_count=bi.get("bad_count", 0),
        manual_review_count=bi.get("manual_review_count", 0),
    )

    result = ProcessResult(
        batch=batch,
        bad_records=snap_data.get("bad_records", []),
        diff_records=snap_data.get("diff_records", []),
        logs=snap_data.get("logs", []),
    )

    for a_dict in snap_data.get("assignments", []):
        conflicts = [ConflictType(c) for c in a_dict.get("conflicts", [])]
        assignment = AssignmentResult(
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
        )
        result.assignments.append(assignment)

    output_dir = args.output or batch.output_dir or "./output"
    files = export_results(result, output_dir)

    print(f"\n已从快照导出: {args.snapshot}")
    print(f"导出目录: {output_dir}/{batch.batch_id}/")
    return 0


def cmd_summary(args):
    if args.batch:
        snapshot_dir = os.path.join(args.output, "snapshots")
        snapshot_file = os.path.join(snapshot_dir, f"{args.batch}.json")
        if not os.path.exists(snapshot_file):
            print(f"错误: 找不到批次 {args.batch} 的快照", file=sys.stderr)
            return 1
        snap_data = read_batch_snapshot(snapshot_file)
        if not snap_data:
            print("错误: 快照数据为空", file=sys.stderr)
            return 1

        bi = snap_data.get("batch_info", {})
        print("\n========== 批次详情 ==========")
        print(f"批次ID: {bi.get('batch_id', '')}")
        print(f"命令: {bi.get('command', '')}")
        print(f"状态: {bi.get('status', '')}")
        print(f"开始时间: {bi.get('start_time', '')}")
        print(f"结束时间: {bi.get('end_time', '')}")
        print(f"论文清单: {bi.get('input_file', '')}")
        print(f"规则配置: {bi.get('rules_file', '') or '默认规则'}")
        print(f"总记录数: {bi.get('total_count', 0)}")
        print(f"成功数: {bi.get('success_count', 0)}")
        print(f"失败数: {bi.get('failed_count', 0)}")
        print(f"坏行数: {bi.get('bad_count', 0)}")
        print(f"人工复核数: {bi.get('manual_review_count', 0)}")
        print(f"分配记录数: {len(snap_data.get('assignments', []))}")
        print(f"差异记录数: {len(snap_data.get('diff_records', []))}")
        print("================================")

        if args.show_logs:
            print("\n--- 操作日志 ---")
            for log in snap_data.get("logs", []):
                print(log)

        if args.show_diffs:
            print("\n--- 差异记录 ---")
            diffs = snap_data.get("diff_records", [])
            if diffs:
                for d in diffs:
                    print(f"  [{d.get('diff_type', '')}] {d.get('paper_id', '')} / {d.get('reviewer_id', '')}: "
                          f"{d.get('field', '')}: {d.get('old_value', '')} -> {d.get('new_value', '')}")
            else:
                print("  无差异记录")

    else:
        snapshots = get_snapshot_list(args.output)
        if not snapshots:
            print("暂无历史批次记录")
            return 0

        print("\n========== 历史批次列表 ==========")
        print(f"{'批次ID':<20} {'命令':<10} {'状态':<18} {'总数':>6} {'成功':>6}")
        print("-" * 65)
        for s in snapshots:
            print(f"{s['batch_id']:<20} {s['command']:<10} {s['status']:<18} {s['total_count']:>6} {s['success_count']:>6}")
        print("====================================")
        print(f"共 {len(snapshots)} 个批次")

    return 0


def main():
    parser = argparse.ArgumentParser(
        prog="paper-review-cli",
        description="论文盲审冲突回避 CLI 工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  paper-review-cli validate -p papers.csv -r reviewers.csv -o output/
  paper-review-cli generate -p papers.csv -r reviewers.csv -o output/ -c 3
  paper-review-cli summary -o output/
  paper-review-cli summary -o output/ -b BATCH_ID
  paper-review-cli export -s snapshot.json -o output/
        """,
    )
    parser.add_argument("-v", "--version", action="version", version=f"%(prog)s {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # validate 命令
    p_validate = subparsers.add_parser("validate", help="校验CSV清单数据质量")
    p_validate.add_argument("-p", "--papers", required=True, help="论文清单CSV文件路径")
    p_validate.add_argument("-r", "--reviewers", required=True, help="评审人清单CSV文件路径")
    p_validate.add_argument("-R", "--rules", default="", help="冲突规则配置JSON文件路径")
    p_validate.add_argument("-o", "--output", default="./output", help="输出目录 (默认: ./output)")
    p_validate.add_argument("-s", "--snapshot", default="", help="历史快照文件路径，用于差异比较")
    p_validate.set_defaults(func=cmd_validate)

    # generate 命令
    p_generate = subparsers.add_parser("generate", help="生成评审人分配结果")
    p_generate.add_argument("-p", "--papers", required=True, help="论文清单CSV文件路径")
    p_generate.add_argument("-r", "--reviewers", required=True, help="评审人清单CSV文件路径")
    p_generate.add_argument("-R", "--rules", default="", help="冲突规则配置JSON文件路径")
    p_generate.add_argument("-o", "--output", default="./output", help="输出目录 (默认: ./output)")
    p_generate.add_argument("-s", "--snapshot", default="", help="历史快照文件路径，用于差异比较")
    p_generate.add_argument("-c", "--count", type=int, default=3, help="每篇论文分配评审人数 (默认: 3)")
    p_generate.add_argument("--no-manual-review", action="store_true", help="关闭人工复核模式")
    p_generate.set_defaults(func=cmd_generate)

    # export 命令
    p_export = subparsers.add_parser("export", help="从快照重新导出结果")
    p_export.add_argument("-s", "--snapshot", required=True, help="历史快照JSON文件路径")
    p_export.add_argument("-o", "--output", default="", help="导出目录 (默认使用快照中记录的目录)")
    p_export.set_defaults(func=cmd_export)

    # summary 命令
    p_summary = subparsers.add_parser("summary", help="查看处理摘要")
    p_summary.add_argument("-o", "--output", default="./output", help="输出目录 (默认: ./output)")
    p_summary.add_argument("-b", "--batch", default="", help="指定批次ID查看详情")
    p_summary.add_argument("--show-logs", action="store_true", help="显示操作日志")
    p_summary.add_argument("--show-diffs", action="store_true", help="显示差异记录")
    p_summary.set_defaults(func=cmd_summary)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
