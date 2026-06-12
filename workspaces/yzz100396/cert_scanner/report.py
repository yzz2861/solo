import os
from datetime import datetime
from typing import List, Dict
from .scanner import ScanResult
from .risk import RiskLevel, classify_risk, risk_label


def _format_domain_line(result: ScanResult) -> str:
    parts = [f"  {result.domain.host}:{result.domain.port}"]

    if result.domain.environment:
        parts.append(f"[{result.domain.environment}]")

    if result.days_until_expiry is not None:
        parts.append(f"到期: {result.days_until_expiry}天")

    if result.domain.owner and not result.domain.is_orphan:
        parts.append(f"负责人: {result.domain.owner}({result.domain.owner_contact})")
    else:
        parts.append("⚠️ 无人认领")

    if result.error:
        parts.append(f"异常: {result.error}")

    if not result.cert_chain_complete and result.cert_verified:
        parts.append("⚠️ 证书链不完整")

    return " | ".join(parts)


def categorize_results(results: List[ScanResult]) -> Dict[str, List[ScanResult]]:
    renew: List[ScanResult] = []
    offline: List[ScanResult] = []
    manual: List[ScanResult] = []
    orphan: List[ScanResult] = []
    healthy: List[ScanResult] = []

    for r in results:
        risk = classify_risk(r)

        if r.domain.is_orphan and risk in (RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM):
            orphan.append(r)
            continue

        if not r.dns_resolved:
            offline.append(r)
        elif not r.connectable:
            offline.append(r)
        elif risk == RiskLevel.CRITICAL:
            renew.append(r)
        elif risk == RiskLevel.HIGH:
            if not r.cert_verified or not r.cert_chain_complete:
                manual.append(r)
            else:
                renew.append(r)
        elif risk == RiskLevel.MEDIUM:
            manual.append(r)
        else:
            healthy.append(r)

    return {
        "renew": renew,
        "offline": offline,
        "manual": manual,
        "orphan": orphan,
        "healthy": healthy,
    }


def generate_weekly_report(results: List[ScanResult], output_path: str = None) -> str:
    cats = categorize_results(results)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = []
    lines.append("=" * 72)
    lines.append(f"  证书域名到期扫描 · 运维周报  {now}")
    lines.append("=" * 72)
    lines.append("")

    total = len(results)
    critical = sum(1 for r in results if classify_risk(r) == RiskLevel.CRITICAL)
    high = sum(1 for r in results if classify_risk(r) == RiskLevel.HIGH)
    medium = sum(1 for r in results if classify_risk(r) == RiskLevel.MEDIUM)
    orphan_count = len(cats["orphan"])

    lines.append(f"  总计: {total} 个域名  |  🔴严重: {critical}  |  🟠高危: {high}  |  🟡中危: {medium}  |  ⚠️无人认领: {orphan_count}")
    lines.append("")

    if cats["orphan"]:
        lines.append("-" * 72)
        lines.append("  ⚠️  无人认领域名（快到期 / 异常，周会直接决定续费或下线）")
        lines.append("-" * 72)
        for r in cats["orphan"]:
            risk = classify_risk(r)
            lines.append(f"  {risk_label(r)} {_format_domain_line(r)}")
        lines.append("")

    if cats["renew"]:
        lines.append("-" * 72)
        lines.append("  🔄  需要续费")
        lines.append("-" * 72)
        for r in cats["renew"]:
            lines.append(f"  {risk_label(r)} {_format_domain_line(r)}")
        lines.append("")

    if cats["offline"]:
        lines.append("-" * 72)
        lines.append("  🗑️  建议下线（DNS 不可解析 / 无法连接）")
        lines.append("-" * 72)
        for r in cats["offline"]:
            lines.append(f"  {risk_label(r)} {_format_domain_line(r)}")
        lines.append("")

    if cats["manual"]:
        lines.append("-" * 72)
        lines.append("  ❓  需要人工确认")
        lines.append("-" * 72)
        for r in cats["manual"]:
            lines.append(f"  {risk_label(r)} {_format_domain_line(r)}")
        lines.append("")

    if cats["healthy"]:
        lines.append("-" * 72)
        lines.append(f"  🟢  正常 ({len(cats['healthy'])} 个)")
        lines.append("-" * 72)
        for r in cats["healthy"]:
            lines.append(f"  {risk_label(r)} {_format_domain_line(r)}")
        lines.append("")

    same_host_diff_owner = _find_same_host_diff_owner(results)
    if same_host_diff_owner:
        lines.append("-" * 72)
        lines.append("  🔀  同一域名不同环境负责人不同")
        lines.append("-" * 72)
        for host, entries in same_host_diff_owner.items():
            lines.append(f"  {host}:")
            for e in entries:
                lines.append(
                    f"    :{e.domain.port} [{e.domain.environment}] → {e.domain.owner or '无'}"
                )
        lines.append("")

    report = "\n".join(lines)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(report)

    return report


def _find_same_host_diff_owner(results: List[ScanResult]) -> Dict[str, List[ScanResult]]:
    from collections import defaultdict

    host_map: Dict[str, List[ScanResult]] = defaultdict(list)
    for r in results:
        host_map[r.domain.host].append(r)

    diff = {}
    for host, entries in host_map.items():
        if len(entries) < 2:
            continue
        owners = set()
        for e in entries:
            owners.add(e.domain.owner or "")
        if len(owners) > 1:
            diff[host] = entries

    return diff
