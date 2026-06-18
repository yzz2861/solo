"""命令行入口：bounce_classifier

示例：
    python -m bounce_classifier run ./samples/bounces -o ./reports
    python -m bounce_classifier run ./samples/bounces -o ./reports --excel
    python -m bounce_classifier run ./samples/bounces -o ./reports \
        --contacts ./samples/contacts.csv
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from typing import List

from .classifier import pipeline, summary
from .contact_sync import write_back
from .parser import iter_bounce_sources
from .reporter import build_text_summary, generate_reports


def _cmd_run(args: argparse.Namespace) -> int:
    inputs: List[str] = args.inputs
    if not inputs:
        print("错误: 请指定至少一个输入文件或目录", file=sys.stderr)
        return 2

    print(f"[1/4] 读取退信来源: {inputs}")
    raw_sources = list(iter_bounce_sources(inputs))
    print(f"  共解析到 {len(raw_sources)} 封退信/文本片段")
    if not raw_sources:
        print("  未解析到任何退信内容，请检查输入路径与文件格式。")
        return 1

    print(f"[2/4] 分类 + 按收件人合并")
    records = pipeline(raw_sources)
    stats = summary(records)
    print("  分类汇总:")
    for k, v in stats.items():
        print(f"    - {k}: {v}")

    print(f"[3/4] 生成报告 -> {args.output}")
    outputs = generate_reports(
        records,
        out_dir=args.output,
        name_prefix=args.prefix or f"bounce_{datetime.now().strftime('%Y%m%d_%H%M')}",
        excel=args.excel,
    )
    for label, path in outputs.items():
        print(f"    - {label}: {path}")

    if args.contacts:
        print(f"[4/4] 回写联系人清单 -> {args.contacts}")
        try:
            out_path, sync_stats = write_back(
                args.contacts,
                records,
                output_path=args.contacts_out,
                sheet_name=args.sheet_name,
            )
            print(f"  回写完成: {out_path}")
            for k, v in sync_stats.items():
                print(f"    - {k}: {v}")
        except Exception as e:
            print(f"  回写失败: {e}", file=sys.stderr)
            return 3
    else:
        print("[4/4] 未指定联系人清单，跳过回写。（使用 --contacts 指定）")

    print()
    print(build_text_summary(records, outputs))
    return 0


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="bounce_classifier",
        description="邮件退信分类脚本：读取退信文本，分类并生成运营/客户经理报告。",
    )
    sub = p.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="执行分类与报告生成")
    run_p.add_argument(
        "inputs",
        nargs="+",
        help="退信来源：文件(.eml/.mbox/.txt)或目录（递归）",
    )
    run_p.add_argument("-o", "--output", required=True, help="报告输出目录")
    run_p.add_argument("--prefix", default=None, help="报告文件名前缀")
    run_p.add_argument(
        "--excel",
        action="store_true",
        help="输出 Excel 格式（需安装 openpyxl），否则默认 CSV",
    )
    run_p.add_argument(
        "--contacts",
        default=None,
        help="联系人清单（CSV/Excel），用于将退信结果回写",
    )
    run_p.add_argument(
        "--contacts-out",
        default=None,
        help="联系人清单输出路径；未指定时自动加 _with_bounce 后缀",
    )
    run_p.add_argument(
        "--sheet-name",
        default=None,
        help="联系人 Excel 的工作表名；未指定时使用活动工作表",
    )
    run_p.set_defaults(func=_cmd_run)

    return p


def main(argv=None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
