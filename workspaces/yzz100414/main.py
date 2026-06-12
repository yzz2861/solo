#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path
from datetime import datetime

from scanner import VersionScanner
from alignment_engine import AlignmentEngine
from diff_tracker import DiffTracker
from report_generator import ReportGenerator


def main():
    parser = argparse.ArgumentParser(
        description="安装包版本清单对齐检查工具 - 扫描发布目录，验证安装包、校验和、发布说明的一致性"
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default=".",
        help="要扫描的发布目录（默认为当前目录）"
    )
    parser.add_argument(
        "--no-verify-checksum",
        action="store_true",
        help="跳过实际校验和计算验证（只检查文件存在性和时间）"
    )
    parser.add_argument(
        "--no-diff",
        action="store_true",
        help="不进行历史对比，也不记录本次运行"
    )
    parser.add_argument(
        "--output",
        default=".",
        help="报告输出目录（默认为当前目录）"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="同时输出 JSON 格式报告"
    )
    parser.add_argument(
        "--email",
        action="store_true",
        help="输出给打包同事的邮件内容"
    )
    parser.add_argument(
        "--history",
        action="store_true",
        help="显示历史运行记录"
    )

    args = parser.parse_args()

    root_dir = Path(args.directory).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not root_dir.exists() or not root_dir.is_dir():
        print(f"错误: 目录不存在或不是有效目录: {root_dir}")
        sys.exit(1)

    if args.history:
        tracker = DiffTracker(root_dir)
        history = tracker.get_history_summary()
        if not history:
            print("暂无历史运行记录")
        else:
            print("历史运行记录:")
            print("-" * 80)
            for i, run in enumerate(reversed(history), 1):
                print(f"#{len(history) - i + 1} {run['scan_time']}")
                print(f"   包数: {run['total_packages']} | 问题: {run['total_issues']} | "
                      f"可发布: {run['can_publish']} | 阻断: {run['blocker_count']} | "
                      f"警告: {run['warning_count']}")
                print()
        return

    print(f"开始扫描目录: {root_dir}")
    print(f"扫描时间: {datetime.now():%Y-%m-%d %H:%M:%S}")
    print()

    scanner = VersionScanner(str(root_dir))
    scan_result = scanner.scan()

    print(f"发现 {len(scan_result.packages)} 个安装包")
    print(f"发现 {len(scan_result.checksums)} 个校验和文件")
    print(f"发现 {len(scan_result.release_notes)} 个发布说明文件")
    print()

    verify_checksums = not args.no_verify_checksum
    engine = AlignmentEngine(scan_result, verify_checksums=verify_checksums)
    scan_result = engine.run_alignment_checks()

    diff_result = None
    if not args.no_diff:
        tracker = DiffTracker(str(root_dir))
        diff_result = tracker.compare_with_previous(scan_result)
        tracker.record_run(scan_result)

    generator = ReportGenerator(scan_result, diff_result)

    print("=" * 80)
    text_report_path = generator.generate_text_report(str(output_dir))
    print("=" * 80)
    print()
    print(f"文本报告已保存到: {text_report_path}")

    if args.json:
        json_report_path = generator.generate_json_report(str(output_dir))
        print(f"JSON 报告已保存到: {json_report_path}")

    if args.email:
        print()
        print("=" * 80)
        print("给打包同事的邮件内容:")
        print("=" * 80)
        print()
        print(generator.generate_rejection_email_content())
        print()

    can_publish = sum(
        1 for pkg in scan_result.packages
        if not pkg.issues
    )
    has_blocker = any(
        any(i.severity.value == 'blocker' for i in pkg.issues)
        for pkg in scan_result.packages
    )

    print()
    print("=" * 80)
    print(f"检查完成: {can_publish}/{len(scan_result.packages)} 个包可发布")
    if has_blocker:
        print("⚠ 存在阻断性问题，部分包需要退回重打")
        sys.exit(2)
    elif any(
        any(i.severity.value == 'warning' for i in pkg.issues)
        for pkg in scan_result.packages
    ):
        print("⚠ 存在警告，部分包需要审核确认")
        sys.exit(1)
    else:
        print("✓ 所有包检查通过")
        sys.exit(0)


if __name__ == "__main__":
    main()
