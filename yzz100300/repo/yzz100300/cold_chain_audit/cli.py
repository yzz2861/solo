"""命令行入口。

子命令：
  audit    运行盘点（导入 CSV + 手工补录）
  summary  查看主管早会摘要
  report   查看完整报告
  list     列出历史批次
  show     查看批次详情
  export   导出 CSV 报告
  delete   删除批次
  append   追加数据到已有批次
"""

import argparse
import sys
import os
from datetime import datetime

from . import __version__
from .processor import process_batch
from .storage import list_batches, load_batch, delete_batch, get_data_dir
from .report import (
    generate_summary,
    generate_full_report,
    export_anomalies_csv,
    export_boxes_csv,
)


def cmd_audit(args):
    """运行盘点。"""
    try:
        result = process_batch(
            csv_files=args.csv,
            manual_json=args.manual,
            batch_date=args.date,
            batch_id=args.batch_id,
        )
        print(f"✓ 盘点完成，批次号: {result.batch_id}")
        print(f"  涉及箱数: {result.total_boxes}")
        print(f"  完整流程: {result.complete_boxes}")
        print(f"  异常数:   {len(result.anomalies)}")
        print(f"  数据已保存到: {get_data_dir()}")
        print()
        print(generate_summary(result))
    except Exception as e:
        print(f"✗ 错误: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_append(args):
    """追加数据到已有批次。"""
    try:
        result = process_batch(
            csv_files=args.csv or [],
            manual_json=args.manual,
            existing_batch_id=args.batch_id,
        )
        print(f"✓ 追加完成，批次号: {result.batch_id}")
        print(f"  涉及箱数: {result.total_boxes}")
        print(f"  完整流程: {result.complete_boxes}")
        print(f"  异常数:   {len(result.anomalies)}")
        print()
        print(generate_summary(result))
    except Exception as e:
        print(f"✗ 错误: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_summary(args):
    """查看主管摘要。"""
    result = load_batch(args.batch_id)
    if not result:
        print(f"✗ 找不到批次: {args.batch_id}", file=sys.stderr)
        sys.exit(1)
    print(generate_summary(result))


def cmd_report(args):
    """查看完整报告。"""
    result = load_batch(args.batch_id)
    if not result:
        print(f"✗ 找不到批次: {args.batch_id}", file=sys.stderr)
        sys.exit(1)
    print(generate_full_report(result))


def cmd_list(args):
    """列出历史批次。"""
    batches = list_batches(date=args.date)
    if not batches:
        if args.date:
            print(f"  没有 {args.date} 的批次记录")
        else:
            print("  暂无历史批次")
        return

    print(f"{'批次号':<28} {'日期':<12} {'箱数':<6} {'完整':<6} {'异常':<6} {'来源文件'}")
    print("-" * 80)
    for b in batches:
        sources = ", ".join(b["source_files"]) if b["source_files"] else "-"
        print(
            f"{b['batch_id']:<28} {b['batch_date']:<12} "
            f"{b['total_boxes']:<6} {b['complete_boxes']:<6} "
            f"{b['anomaly_count']:<6} {sources}"
        )
    print()
    print(f"共 {len(batches)} 个批次，数据目录: {get_data_dir()}")


def cmd_show(args):
    """查看单个箱子的详情。"""
    result = load_batch(args.batch_id)
    if not result:
        print(f"✗ 找不到批次: {args.batch_id}", file=sys.stderr)
        sys.exit(1)

    if args.box_id:
        box = result.boxes.get(args.box_id)
        if not box:
            print(f"✗ 批次中找不到箱号: {args.box_id}", file=sys.stderr)
            sys.exit(1)

        print(f"箱号: {box.box_id}")
        print(f"状态: {box.status}")
        print(f"完整流程: {'是' if box.is_complete else '否'}")
        print()

        for label, attr in [
            ("出库", "outbound"),
            ("到店", "arrive"),
            ("回仓", "return_"),
            ("清洗", "clean"),
        ]:
            rec = getattr(box, attr, None)
            if rec:
                print(f"  [{label}]")
                print(f"    时间:     {rec.scan_time.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"    门店:     {rec.store or '-'}")
                print(f"    温度:     {rec.temperature if rec.temperature is not None else '-'}")
                print(f"    来源:     {rec.source_file}")
                print(f"    原始行号: {rec.source_line}")
            else:
                print(f"  [{label}] -")
    else:
        # 列出所有箱子
        print(f"批次 {result.batch_id} 共 {result.total_boxes} 个箱子：")
        print()
        print(f"{'箱号':<14} {'状态':<8} {'完整':<6} {'出库门店':<12} {'到店门店':<12}")
        print("-" * 60)
        for bid in sorted(result.boxes.keys()):
            box = result.boxes[bid]
            out_store = box.outbound.store if box.outbound else "-"
            arr_store = box.arrive.store if box.arrive else "-"
            print(
                f"{bid:<14} {box.status:<8} "
                f"{'✓' if box.is_complete else '✗':<6} "
                f"{out_store:<12} {arr_store:<12}"
            )


def cmd_export(args):
    """导出 CSV 报告。"""
    result = load_batch(args.batch_id)
    if not result:
        print(f"✗ 找不到批次: {args.batch_id}", file=sys.stderr)
        sys.exit(1)

    output_dir = args.output or "."
    os.makedirs(output_dir, exist_ok=True)

    if args.type in ("anomalies", "all"):
        path = os.path.join(output_dir, f"{result.batch_id}_异常明细.csv")
        export_anomalies_csv(result, path)
        print(f"✓ 异常明细已导出: {path}")

    if args.type in ("boxes", "all"):
        path = os.path.join(output_dir, f"{result.batch_id}_箱子明细.csv")
        export_boxes_csv(result, path)
        print(f"✓ 箱子明细已导出: {path}")


def cmd_delete(args):
    """删除批次。"""
    if not args.yes:
        confirm = input(f"确认删除批次 {args.batch_id}? (y/N) ")
        if confirm.lower() not in ("y", "yes"):
            print("已取消")
            return

    if delete_batch(args.batch_id):
        print(f"✓ 已删除批次: {args.batch_id}")
    else:
        print(f"✗ 找不到批次: {args.batch_id}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        prog="cold-chain-audit",
        description="冷链周转箱扫码盘点 CLI",
    )
    parser.add_argument("--version", action="version", version=f"v{__version__}")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # audit
    p_audit = subparsers.add_parser("audit", help="运行盘点")
    p_audit.add_argument("csv", nargs="+", help="CSV 扫码记录文件")
    p_audit.add_argument("-m", "--manual", help="手工补录 JSON 文件")
    p_audit.add_argument("-d", "--date", help="批次日期 (YYYY-MM-DD)，默认今天")
    p_audit.add_argument("--batch-id", help="自定义批次号")
    p_audit.set_defaults(func=cmd_audit)

    # append
    p_append = subparsers.add_parser("append", help="追加数据到已有批次")
    p_append.add_argument("--batch-id", required=True, help="目标批次号")
    p_append.add_argument("-c", "--csv", nargs="*", default=[], help="CSV 扫码记录文件")
    p_append.add_argument("-m", "--manual", help="手工补录 JSON 文件")
    p_append.set_defaults(func=cmd_append)

    # summary
    p_summary = subparsers.add_parser("summary", help="查看主管早会摘要")
    p_summary.add_argument("batch_id", help="批次号")
    p_summary.set_defaults(func=cmd_summary)

    # report
    p_report = subparsers.add_parser("report", help="查看完整报告")
    p_report.add_argument("batch_id", help="批次号")
    p_report.set_defaults(func=cmd_report)

    # list
    p_list = subparsers.add_parser("list", help="列出历史批次")
    p_list.add_argument("-d", "--date", help="按日期筛选 (YYYY-MM-DD)")
    p_list.set_defaults(func=cmd_list)

    # show
    p_show = subparsers.add_parser("show", help="查看批次或箱子详情")
    p_show.add_argument("batch_id", help="批次号")
    p_show.add_argument("-b", "--box-id", help="指定箱号查看详情")
    p_show.set_defaults(func=cmd_show)

    # export
    p_export = subparsers.add_parser("export", help="导出 CSV 报告")
    p_export.add_argument("batch_id", help="批次号")
    p_export.add_argument(
        "-t", "--type",
        choices=["anomalies", "boxes", "all"],
        default="all",
        help="导出类型 (默认 all)",
    )
    p_export.add_argument("-o", "--output", help="输出目录")
    p_export.set_defaults(func=cmd_export)

    # delete
    p_delete = subparsers.add_parser("delete", help="删除批次")
    p_delete.add_argument("batch_id", help="批次号")
    p_delete.add_argument("-y", "--yes", action="store_true", help="确认删除")
    p_delete.set_defaults(func=cmd_delete)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    args.func(args)


if __name__ == "__main__":
    main()
