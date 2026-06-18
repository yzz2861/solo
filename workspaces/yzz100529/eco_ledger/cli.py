from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .audit import AuditTrail
from .checker import check_issues
from .loader import load_ledger, load_manifests
from .models import IssueType
from .preview import confirm_and_export, generate_preview
from .reorder import reorder_ledger


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="eco-ledger",
        description="环保台账编号重排 — 校正编号、检出问题、审计回溯",
    )
    sub = parser.add_subparsers(dest="command", help="子命令")

    p_preview = sub.add_parser("preview", help="预览重排结果（不导出）")
    p_preview.add_argument("ledger", help="台账 CSV 文件路径")
    p_preview.add_argument("manifest", help="联单 CSV 文件路径")

    p_reorder = sub.add_parser("reorder", help="重排编号并导出新台账和问题报告")
    p_reorder.add_argument("ledger", help="台账 CSV 文件路径")
    p_reorder.add_argument("manifest", help="联单 CSV 文件路径")
    p_reorder.add_argument(
        "-o", "--output-dir", default="./output", help="输出目录 (默认: ./output)"
    )
    p_reorder.add_argument(
        "-y", "--yes", action="store_true", help="跳过确认直接导出"
    )
    p_reorder.add_argument("--remark", default="", help="本次重排备注说明")

    p_report = sub.add_parser("report", help="仅生成问题报告（不重排编号）")
    p_report.add_argument("ledger", help="台账 CSV 文件路径")
    p_report.add_argument("manifest", help="联单 CSV 文件路径")
    p_report.add_argument(
        "-o", "--output-dir", default="./output", help="输出目录 (默认: ./output)"
    )

    p_audit = sub.add_parser("audit", help="审计回溯：从编号查找原始联单")
    p_audit.add_argument("mapping", help="编号映射 JSON 文件路径")
    p_audit.add_argument("identifier", help="要回溯的编号（原编号或新编号）")

    p_review = sub.add_parser(
        "review", help="复核异常桶号：列出需环保经理单独复核的桶号"
    )
    p_review.add_argument("ledger", help="台账 CSV 文件路径")
    p_review.add_argument("manifest", help="联单 CSV 文件路径")
    p_review.add_argument(
        "-o", "--output-dir", default="./output", help="输出目录 (默认: ./output)"
    )

    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        return 0

    if args.command == "preview":
        return _cmd_preview(args)
    elif args.command == "reorder":
        return _cmd_reorder(args)
    elif args.command == "report":
        return _cmd_report(args)
    elif args.command == "audit":
        return _cmd_audit(args)
    elif args.command == "review":
        return _cmd_review(args)

    return 0


def _cmd_preview(args) -> int:
    entries = load_ledger(args.ledger)
    manifests = load_manifests(args.manifest)

    print(f"已加载台账 {len(entries)} 条，联单 {len(manifests)} 条\n")

    result = reorder_ledger(entries, manifests)
    issues = check_issues(entries, manifests)
    result.issues.extend(issues)

    generate_preview(result)
    return 0


def _cmd_reorder(args) -> int:
    entries = load_ledger(args.ledger)
    manifests = load_manifests(args.manifest)

    print(f"已加载台账 {len(entries)} 条，联单 {len(manifests)} 条\n")

    result = reorder_ledger(entries, manifests)
    issues = check_issues(entries, manifests)
    result.issues.extend(issues)

    generate_preview(result)

    if not args.yes:
        print()
        answer = input("确认导出？[y/N] ").strip().lower()
        if answer not in ("y", "yes"):
            print("已取消导出。")
            return 0

    exported = confirm_and_export(
        result, args.output_dir, confirmed=True, remark=args.remark
    )

    audit = AuditTrail()
    audit.build_from_result(result, entries, remark=args.remark)
    audit_path = Path(args.output_dir) / "audit_trail.json"
    audit.save(audit_path)
    exported["审计追踪"] = str(audit_path)

    print("\n导出完成:")
    for label, path in exported.items():
        print(f"  {label}: {path}")

    return 0


def _cmd_report(args) -> int:
    entries = load_ledger(args.ledger)
    manifests = load_manifests(args.manifest)

    issues = check_issues(entries, manifests)

    if not issues:
        print("未检出问题。")
        return 0

    print(f"检出 {len(issues)} 个问题:\n")

    for idx, issue in enumerate(issues, 1):
        print(f"  [{idx}] {issue.issue_type.value}")
        print(f"      详情: {issue.detail}")
        print(f"      建议: {issue.suggestion}")
        print()

    from .preview import _export_issues_csv
    from datetime import datetime

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = output_dir / f"问题报告_{timestamp}.csv"
    _export_issues_csv(issues, report_path)

    print(f"问题报告已导出: {report_path}")
    return 0


def _cmd_audit(args) -> int:
    audit = AuditTrail(args.mapping)
    info = audit.trace(args.identifier)

    print("审计回溯结果:")
    for key, value in info.items():
        print(f"  {key}: {value}")

    return 0


def _cmd_review(args) -> int:
    entries = load_ledger(args.ledger)
    manifests = load_manifests(args.manifest)

    issues = check_issues(entries, manifests)

    review_types = {
        IssueType.WEIGHT_MISMATCH,
        IssueType.DUPLICATE_BARREL,
        IssueType.UNIT_INCONSISTENCY,
    }

    review_issues = [i for i in issues if i.issue_type in review_types]

    if not review_issues:
        print("无需复核的异常桶号。")
        return 0

    print(f"需复核异常桶号 {len(review_issues)} 项:\n")
    print("=" * 80)

    review_barrels: dict[str, list] = {}
    for issue in review_issues:
        if issue.barrel_no:
            for bn in issue.barrel_no.split(", "):
                review_barrels.setdefault(bn.strip(), []).append(issue)

    for barrel_no, barrel_issues in review_barrels.items():
        print(f"\n  桶号: {barrel_no}")
        for issue in barrel_issues:
            print(f"    问题: {issue.issue_type.value}")
            print(f"    详情: {issue.detail}")
            print(f"    建议: {issue.suggestion}")
            print()

    print("=" * 80)
    print("\n请环保经理逐项复核，确认称重单是否被贴错批次。")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    from datetime import datetime
    from .preview import _export_issues_csv

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    review_path = output_dir / f"复核清单_{timestamp}.csv"
    _export_issues_csv(review_issues, review_path)
    print(f"复核清单已导出: {review_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
