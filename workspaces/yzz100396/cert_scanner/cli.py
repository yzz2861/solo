#!/usr/bin/env python3
import argparse
import sys
import json
import os
import concurrent.futures
from datetime import datetime

from .config import load_config
from .scanner import scan_domain, ScanResult
from .risk import classify_risk, risk_label, RiskLevel
from .dedup import AlertDedup
from .report import generate_weekly_report, categorize_results


def _scan_all(domains_path: str, timeout: float, workers: int, dedup: AlertDedup,
              show_all: bool = False) -> list:
    entries = load_config(domains_path)
    results: list = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        future_map = {pool.submit(scan_domain, e, timeout): e for e in entries}
        for fut in concurrent.futures.as_completed(future_map):
            result = fut.result()
            results.append(result)

    results.sort(key=lambda r: (r.domain.host, r.domain.port, r.domain.environment))
    return results


def _print_scan_output(results: list, dedup: AlertDedup, show_all: bool = False,
                       json_output: bool = False):
    if json_output:
        data = [r.to_dict() for r in results]
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return

    current_keys = set()
    for result in results:
        current_keys.add(result.domain.key)
        risk = classify_risk(result)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(result)

        if not show_all and not is_new and not is_changed:
            continue

        tag = ""
        if is_new:
            tag = "🆕 新增"
        elif is_changed:
            tag = "🔄 变更"
            if prev_risk and prev_risk != risk:
                tag += f" ({prev_risk.value}→{risk.value})"

        parts = [risk_label(result)]
        parts.append(f"{result.domain.host}:{result.domain.port}")
        parts.append(f"[{result.domain.environment}]")

        if result.days_until_expiry is not None:
            parts.append(f"到期: {result.days_until_expiry}天")
        if result.domain.owner and not result.domain.is_orphan:
            parts.append(f"负责人: {result.domain.owner}")
        else:
            parts.append("⚠️无人认领")
        if result.error:
            parts.append(f"异常: {result.error}")
        if not result.cert_chain_complete and result.cert_verified:
            parts.append("⚠️证书链不完整")

        if tag:
            parts.append(tag)

        print(" | ".join(parts))

    dedup.purge_missing(current_keys)


def cmd_scan(args):
    dedup = AlertDedup(state_path=args.state_file)
    results = _scan_all(args.domains, args.timeout, args.workers, dedup, args.all)

    if args.report:
        generate_weekly_report(results, output_path=args.report)
        print(f"\n周报已保存到: {args.report}")

    _print_scan_output(results, dedup, show_all=args.all, json_output=args.json)


def cmd_report(args):
    dedup = AlertDedup(state_path=args.state_file)
    state = dedup.get_all_states()

    if not state:
        print("暂无扫描数据，请先执行 scan 命令")
        return

    results = []
    for key, info in state.items():
        from .config import DomainEntry
        entry = DomainEntry(
            host=info["host"],
            port=info["port"],
            environment=info["environment"],
            owner=info.get("owner", ""),
            owner_contact=info.get("owner_contact", ""),
        )
        sr = ScanResult(domain=entry)
        sr.dns_resolved = info.get("dns_resolved", False)
        sr.connectable = info.get("connectable", False)
        sr.cert_verified = info.get("cert_verified", False)
        sr.cert_chain_complete = info.get("cert_chain_complete", True)
        sr.days_until_expiry = info.get("days_until_expiry")
        sr.error = info.get("error")
        results.append(sr)

    report = generate_weekly_report(results, output_path=args.output)
    if not args.output:
        print(report)


def cmd_orphans(args):
    dedup = AlertDedup(state_path=args.state_file)
    state = dedup.get_all_states()

    orphans = []
    for key, info in state.items():
        if not info.get("is_orphan", False):
            continue
        risk = RiskLevel(info.get("risk_level", "OK"))
        if risk in (RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM):
            orphans.append((key, info, risk))

    if not orphans:
        print("✅ 没有无人认领的异常域名")
        return

    print("=" * 60)
    print("  ⚠️  无人认领的异常域名（周会决定续费或下线）")
    print("=" * 60)

    for key, info, risk in orphans:
        host = info["host"]
        port = info["port"]
        env = info["environment"]
        days = info.get("days_until_expiry", "?")
        err = info.get("error", "")
        print(f"  {risk_label_from_level(risk)} {host}:{port} [{env}] | 到期: {days}天 | {err}")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            for key, info, risk in orphans:
                f.write(f"{info['host']}:{info['port']} [{info['environment']}] | 风险: {risk.value} | 到期: {info.get('days_until_expiry', '?')}天\n")
        print(f"\n已保存到: {args.output}")


def risk_label_from_level(level: RiskLevel) -> str:
    from .risk import RISK_EMOJI, RISK_COLOR, RESET
    emoji = RISK_EMOJI.get(level, "")
    color = RISK_COLOR.get(level, "")
    return f"{emoji} {color}{level.value}{RESET}"


def main():
    parser = argparse.ArgumentParser(
        prog="cert-scanner",
        description="证书域名到期扫描 CLI — 检查 HTTPS 证书、解析状态和到期天数，按风险级别输出提醒",
    )
    parser.add_argument("--state-file", default="scan_state.json",
                        help="去重状态文件路径 (默认: scan_state.json)")

    sub = parser.add_subparsers(dest="command", help="子命令")

    p_scan = sub.add_parser("scan", help="扫描域名证书状态")
    p_scan.add_argument("-d", "--domains", default="domains.yaml",
                        help="域名清单 YAML 文件路径 (默认: domains.yaml)")
    p_scan.add_argument("-t", "--timeout", type=float, default=10.0,
                        help="连接超时秒数 (默认: 10)")
    p_scan.add_argument("-w", "--workers", type=int, default=5,
                        help="并发扫描线程数 (默认: 5)")
    p_scan.add_argument("--all", action="store_true",
                        help="显示所有域名（包括无变化的）")
    p_scan.add_argument("--json", action="store_true", dest="json",
                        help="以 JSON 格式输出扫描结果")
    p_scan.add_argument("--report", metavar="FILE",
                        help="同时生成周报并保存到指定文件")

    p_report = sub.add_parser("report", help="根据上次扫描数据生成运维周报")
    p_report.add_argument("-o", "--output", help="周报输出文件路径（不指定则输出到终端）")

    p_orphan = sub.add_parser("orphans", help="列出无人认领的异常域名")
    p_orphan.add_argument("-o", "--output", help="输出文件路径")

    args = parser.parse_args()

    if args.command == "scan":
        cmd_scan(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "orphans":
        cmd_orphans(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
