#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from studio_check.config import get_config
from studio_check.scanner import Scanner
from studio_check.checker import Checker
from studio_check.reporter import Reporter
from studio_check.confirmer import Confirmer
from studio_check.models import IssueLevel


def cmd_scan(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    scanner = Scanner(config)
    result = scanner.scan(client_dir)

    checker = Checker(config)
    checker.check(result)

    confirmer = Confirmer(client_dir, config["metadata_dir"])
    confirm_state = confirmer.load_state()

    reporter = Reporter(client_dir, config["metadata_dir"])

    if args.json:
        print(reporter.generate_json(result, confirm_state))
    else:
        report_path = reporter.save_report(result, confirm_state)
        text = reporter.generate_text(result, confirm_state)
        print(text)
        print(f"\n报告已保存: {report_path}")

    error_count = sum(1 for i in result.issues if i.level == IssueLevel.ERROR)
    return 1 if error_count > 0 else 0


def cmd_report(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    meta_dir = client_dir / config["metadata_dir"]
    json_path = meta_dir / "report.json"

    if not json_path.exists():
        print("错误: 未找到扫描报告，请先运行 scan 命令", file=sys.stderr)
        return 1

    confirmer = Confirmer(client_dir, config["metadata_dir"])
    confirm_state = confirmer.load_state()

    scanner = Scanner(config)
    result = scanner.scan(client_dir)
    checker = Checker(config)
    checker.check(result)

    reporter = Reporter(client_dir, config["metadata_dir"])

    if args.json:
        print(reporter.generate_json(result, confirm_state))
    elif args.checklist:
        checklist = reporter._generate_checklist(result, confirm_state)
        print(checklist)
    else:
        print(reporter.generate_text(result, confirm_state))

    return 0


def cmd_confirm(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    scanner = Scanner(config)
    result = scanner.scan(client_dir)

    confirmer = Confirmer(client_dir, config["metadata_dir"])

    photo_ids = [pid.strip() for pid in args.photos.split(",") if pid.strip()]
    version = args.version if args.version else None

    try:
        state = confirmer.confirm(photo_ids, result, version=version)
    except RuntimeError as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1

    print(f"已确认 {len(photo_ids)} 张照片")
    for pid in photo_ids:
        entry = state.entries.get(pid)
        if entry:
            ver_str = f" v{entry.confirmed_version}" if entry.confirmed_version else ""
            print(f"  {pid}{ver_str}")

    return 0


def cmd_unconfirm(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    confirmer = Confirmer(client_dir, config["metadata_dir"])
    photo_ids = [pid.strip() for pid in args.photos.split(",") if pid.strip()]

    try:
        confirmer.unconfirm(photo_ids)
    except RuntimeError as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1

    print(f"已取消确认 {len(photo_ids)} 张照片")
    return 0


def cmd_lock(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    confirmer = Confirmer(client_dir, config["metadata_dir"])
    state = confirmer.lock()

    print(f"交付包已锁定 (时间: {state.locked_at})")
    print(f"已确认 {len(state.entries)} 张照片")
    return 0


def cmd_unlock(args: argparse.Namespace) -> int:
    client_dir = Path(args.client_dir)
    config = get_config(Path(args.config) if args.config else None)

    confirmer = Confirmer(client_dir, config["metadata_dir"])
    confirmer.unlock()

    print("交付包已解锁")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="studio-check",
        description="摄影棚交付包检查工具 - 扫描客户目录，核对精修数量、原片编号、授权书、挑片表和交付说明",
    )
    parser.add_argument("--config", "-c", help="自定义配置文件路径 (JSON)")

    sub = parser.add_subparsers(dest="command", help="子命令")

    scan_p = sub.add_parser("scan", help="扫描客户目录并生成检查报告")
    scan_p.add_argument("client_dir", help="客户目录路径")
    scan_p.add_argument("--json", "-j", action="store_true", help="以 JSON 格式输出")

    report_p = sub.add_parser("report", help="查看检查报告或前台清单")
    report_p.add_argument("client_dir", help="客户目录路径")
    report_p.add_argument("--json", "-j", action="store_true", help="以 JSON 格式输出")
    report_p.add_argument("--checklist", action="store_true", help="输出前台确认清单")

    confirm_p = sub.add_parser("confirm", help="标记照片为客户确认版本")
    confirm_p.add_argument("client_dir", help="客户目录路径")
    confirm_p.add_argument("--photos", "-p", required=True, help="照片编号，逗号分隔 (如 A001,A005)")
    confirm_p.add_argument("--version", "-v", type=int, help="确认的版本号 (多版本时指定)")

    unconfirm_p = sub.add_parser("unconfirm", help="取消照片确认标记")
    unconfirm_p.add_argument("client_dir", help="客户目录路径")
    unconfirm_p.add_argument("--photos", "-p", required=True, help="照片编号，逗号分隔")

    lock_p = sub.add_parser("lock", help="锁定交付包 (锁定后不可修改确认状态)")
    lock_p.add_argument("client_dir", help="客户目录路径")

    unlock_p = sub.add_parser("unlock", help="解锁交付包")
    unlock_p.add_argument("client_dir", help="客户目录路径")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    dispatch = {
        "scan": cmd_scan,
        "report": cmd_report,
        "confirm": cmd_confirm,
        "unconfirm": cmd_unconfirm,
        "lock": cmd_lock,
        "unlock": cmd_unlock,
    }

    handler = dispatch.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    return handler(args)


if __name__ == "__main__":
    sys.exit(main())
