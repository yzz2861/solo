#!/usr/bin/env python3
"""影城排片退票核对 CLI 工具"""
import argparse
import sys
import os

from .storage import init_db, DB_PATH
from .importer import import_schedule_csv, import_sales_json, import_refund_csv
from .auditor import (
    get_schedule_summary,
    get_sales_summary,
    get_refund_summary,
    find_cancelled_sales,
    find_duplicate_refunds,
    find_amount_mismatch,
    find_sales_no_schedule,
    find_refunds_no_sale,
    get_show_detail,
    get_order_detail,
)
from .exporter import export_json, export_csv, export_text_report


def cmd_audit(args):
    """audit 命令：导入数据并执行核对"""
    init_db(args.db)
    print("📥 正在导入数据...")
    print()

    total_imported = 0
    total_skipped = 0

    if args.schedule:
        for fp in args.schedule:
            count, skipped = import_schedule_csv(fp, args.db)
            if skipped:
                print(f"  ⏭️  排片 {os.path.basename(fp)}: 已导入过，跳过")
                total_skipped += 1
            else:
                print(f"  ✅ 排片 {os.path.basename(fp)}: 导入 {count} 条")
                total_imported += count

    if args.sales:
        for fp in args.sales:
            count, skipped = import_sales_json(fp, args.db)
            if skipped:
                print(f"  ⏭️  售票 {os.path.basename(fp)}: 已导入过，跳过")
                total_skipped += 1
            else:
                print(f"  ✅ 售票 {os.path.basename(fp)}: 导入 {count} 条")
                total_imported += count

    if args.refund:
        for fp in args.refund:
            count, skipped = import_refund_csv(fp, args.db)
            if skipped:
                print(f"  ⏭️  退票 {os.path.basename(fp)}: 已导入过，跳过")
                total_skipped += 1
            else:
                print(f"  ✅ 退票 {os.path.basename(fp)}: 导入 {count} 条")
                total_imported += count

    print()
    print(f"   导入完成: 新增 {total_imported} 条，跳过 {total_skipped} 个重复批次")
    print()
    print("🔍 核对结果:")
    print(export_text_report(args.db))


def cmd_review(args):
    """review 命令：查询异常和明细"""
    init_db(args.db)

    if args.show:
        detail = get_show_detail(args.show, args.db)
        s = detail["schedule"]
        if s:
            print(f"场次 {s['show_id']}: {s['film_name']}")
            print(f"  时间: {s['show_time']}  影厅: {s['hall']}  "
                  f"票价: ¥{s['price']:.2f}  状态: {s['status']}")
        else:
            print(f"场次 {args.show}: 未找到排片记录")
        print(f"  售票 {detail['sale_count']} 笔，退票 {detail['refund_count']} 笔")
        print()
        for sale in detail["sales"]:
            print(f"  订单 {sale['order_id']}: 座位 {sale['seat_no']} "
                  f"¥{sale['amount']:.2f} ({sale['sale_time']})")
            for rf in sale["refunds"]:
                print(f"    ↳ 退票 {rf['refund_id']}: ¥{rf['refund_amount']:.2f} "
                      f"({rf['refund_time']})")
        return

    if args.order:
        detail = get_order_detail(args.order, args.db)
        print(f"订单 {detail['order_id']}")
        if detail["schedule"]:
            s = detail["schedule"]
            print(f"  场次: {s['show_id']} {s['film_name']} "
                  f"({s['show_time']}) 影厅 {s['hall']}")
        if detail["sale"]:
            t = detail["sale"]
            print(f"  售票: 座位 {t['seat_no']} ¥{t['amount']:.2f} ({t['sale_time']})")
        else:
            print("  售票: 未找到")
        print(f"  退票: {detail['refund_count']} 笔，累计 ¥{detail['total_refunded']:.2f}")
        for rf in detail["refunds"]:
            print(f"    - {rf['refund_id']}: ¥{rf['refund_amount']:.2f} ({rf['refund_time']})")
        return

    if args.type == "all":
        print(export_text_report(args.db))
        return

    if args.type == "cancelled":
        records = find_cancelled_sales(args.db)
        print(f"取消场次仍有售票: {len(records)} 条")
        print("-" * 60)
        for r in records:
            print(f"  {r['show_id']} {r['film_name']} ({r['show_time']}) "
                  f"[{r['status']}] -> 订单 {r['order_id']} ¥{r['amount']:.2f}")
        return

    if args.type == "duplicate":
        records = find_duplicate_refunds(args.db)
        print(f"重复退款订单: {len(records)} 笔")
        print("-" * 60)
        for r in records:
            print(f"  订单 {r['order_id']}: {r['refund_count']} 次退款 "
                  f"累计 ¥{r['total_refund_amount']:.2f}"
                  f" (票价 ¥{r.get('sale_amount', 0) or 0:.2f})")
        return

    if args.type == "mismatch":
        records = find_amount_mismatch(args.db)
        print(f"退票金额与票价不符: {len(records)} 条")
        print("-" * 60)
        for r in records:
            diff = r["refund_amount"] - (r["ticket_amount"] or 0)
            print(f"  退票 {r['refund_id']} 订单 {r['order_id']}: "
                  f"票价 ¥{r.get('ticket_amount', 0) or 0:.2f} "
                  f"退票 ¥{r['refund_amount']:.2f} "
                  f"差额 ¥{diff:.2f}")
        return

    if args.type == "orphan-sales":
        records = find_sales_no_schedule(args.db)
        print(f"售票无对应排片: {len(records)} 条")
        print("-" * 60)
        for r in records:
            print(f"  订单 {r['order_id']}: 场次 {r['show_id']} ¥{r['amount']:.2f}")
        return

    if args.type == "orphan-refunds":
        records = find_refunds_no_sale(args.db)
        print(f"退票无对应售票: {len(records)} 条")
        print("-" * 60)
        for r in records:
            print(f"  退票 {r['refund_id']}: 订单 {r['order_id']} ¥{r['refund_amount']:.2f}")
        return

    print(export_text_report(args.db))


def cmd_export(args):
    """export 命令：导出核对报告"""
    init_db(args.db)

    if args.format == "json":
        out_path = args.output or "report.json"
        out = export_json(out_path, args.db)
        print(f"✅ JSON 报告已导出: {out}")
    elif args.format == "csv":
        out_dir = args.output or "cinema_audit_report"
        files = export_csv(out_dir, args.db)
        print(f"✅ CSV 报告已导出到 {out_dir}/ ({len(files)} 个文件)")
        for f in files:
            print(f"   - {os.path.basename(f)}")
    elif args.format == "text":
        text = export_text_report(args.db)
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"✅ 文本报告已导出: {args.output}")
        else:
            print(text)


def main():
    parser = argparse.ArgumentParser(
        prog="cinema-audit",
        description="影城排片退票核对工具 - 串起排片、售票、退票，检测异常",
    )
    parser.add_argument(
        "--db", default=DB_PATH,
        help=f"数据库文件路径 (默认: {DB_PATH})",
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # audit 命令
    audit_p = subparsers.add_parser(
        "audit", help="导入数据并执行核对",
        description="导入排片 CSV、售票 JSON、退票 CSV，并输出核对结果",
    )
    audit_p.add_argument("--schedule", "-s", action="append", metavar="FILE",
                         help="排片 CSV 文件，可多次指定")
    audit_p.add_argument("--sales", "-t", action="append", metavar="FILE",
                         help="售票 JSON 文件，可多次指定")
    audit_p.add_argument("--refund", "-r", action="append", metavar="FILE",
                         help="退票 CSV 文件，可多次指定")
    audit_p.set_defaults(func=cmd_audit)

    # review 命令
    review_p = subparsers.add_parser(
        "review", help="查询异常和明细",
        description="查看各类异常记录，或按场次/订单查询明细",
    )
    review_p.add_argument(
        "type", nargs="?", default="all",
        choices=["all", "cancelled", "duplicate", "mismatch",
                 "orphan-sales", "orphan-refunds"],
        help="异常类型: all(全部), cancelled(取消场次有售票), "
             "duplicate(重复退款), mismatch(金额不符), "
             "orphan-sales(无排片售票), orphan-refunds(无售票退票)",
    )
    review_p.add_argument("--show", metavar="SHOW_ID",
                          help="按场次编号查询明细")
    review_p.add_argument("--order", metavar="ORDER_ID",
                          help="按订单号查询明细")
    review_p.set_defaults(func=cmd_review)

    # export 命令
    export_p = subparsers.add_parser(
        "export", help="导出核对报告",
        description="导出经理可核对的排片退票冲突报告",
    )
    export_p.add_argument(
        "--format", "-f", default="csv",
        choices=["json", "csv", "text"],
        help="导出格式: csv(默认,多文件), json, text",
    )
    export_p.add_argument(
        "--output", "-o", default=None,
        help="输出路径 (csv 时为目录，json/text 时为文件)",
    )
    export_p.set_defaults(func=cmd_export)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
