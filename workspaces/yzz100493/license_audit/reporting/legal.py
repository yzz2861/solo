from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List

from license_audit.models import AuditReport, LicenseCategory, Package


CATEGORY_ORDER = [
    LicenseCategory.RESTRICTED,
    LicenseCategory.DUAL_RESTRICTED,
    LicenseCategory.MISSING,
    LicenseCategory.UNCERTAIN,
    LicenseCategory.DUAL_MIXED,
    LicenseCategory.DUAL_APPROVED,
    LicenseCategory.APPROVED,
]


def _license_distribution(packages: List[Package]) -> Dict[str, int]:
    counter: Counter = Counter()
    for p in packages:
        for lid in p.license.identifiers:
            counter[lid] += 1
    return dict(counter.most_common())


def _by_license(packages: List[Package]) -> Dict[str, List[Package]]:
    grouped: Dict[str, List[Package]] = defaultdict(list)
    for p in packages:
        for lid in p.license.identifiers:
            grouped[lid].append(p)
    return dict(grouped)


def _by_category(packages: List[Package]) -> Dict[LicenseCategory, List[Package]]:
    grouped: Dict[LicenseCategory, List[Package]] = defaultdict(list)
    for p in packages:
        grouped[p.license.category].append(p)
    return dict(grouped)


def generate_legal_report(report: AuditReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "legal-report.md"
    lines: List[str] = []

    lines.append("# 法务依赖许可证审查报告")
    lines.append("")
    lines.append(f"- 生成时间：{report.timestamp}")
    if report.baseline_timestamp:
        lines.append(f"- 对比基线：{report.baseline_timestamp}")
    lines.append(f"- 扫描文件数：{len(report.scan.scanned_files)}")
    lines.append(f"- 依赖总数：{len(report.scan.packages)}")
    lines.append("")

    lines.append("## 汇总")
    lines.append("")
    lines.append("| 分类 | 数量 | 占比 |")
    lines.append("| :--- | :---: | :---: |")
    total = len(report.scan.packages) or 1
    by_cat = _by_category(report.scan.packages)
    for cat in CATEGORY_ORDER:
        pkgs = by_cat.get(cat, [])
        pct = f"{len(pkgs) * 100 / total:.1f}%"
        lines.append(f"| {cat.label_zh} | {len(pkgs)} | {pct} |")
    lines.append("")

    lines.append("## 许可证分布")
    lines.append("")
    dist = _license_distribution(report.scan.packages)
    lines.append("| 许可证 | 包数 |")
    lines.append("| :--- | :---: |")
    for lid, cnt in dist.items():
        lines.append(f"| {lid} | {cnt} |")
    lines.append("")

    for cat in CATEGORY_ORDER:
        pkgs = by_cat.get(cat, [])
        if not pkgs:
            continue
        lines.append(f"## {cat.label_zh}（{len(pkgs)} 个）")
        lines.append("")
        lines.append("| 包管理器 | 包名 | 版本 | 许可证原文 | 标准化标识符 | 说明 |")
        lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for p in sorted(pkgs, key=lambda x: (x.manager.value, x.name.lower(), x.version)):
            ids = ", ".join(p.license.identifiers) or "-"
            raw = p.license.raw or "-"
            note = p.license.note or ("已登记例外" if p.from_exception else "")
            lines.append(f"| {p.manager.value} | `{p.name}` | {p.version} | {raw} | {ids} | {note} |")
        lines.append("")

    lines.append("## 需法务确认包")
    lines.append("")
    if report.need_confirmation:
        lines.append("以下包许可证不明确或存在双许可冲突，需法务评估：")
        lines.append("")
        lines.append("| 包 | 版本 | 许可证原文 | 说明 |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for p in sorted(report.need_confirmation, key=lambda x: (x.manager.value, x.name.lower())):
            raw = p.license.raw or "(缺失)"
            note = p.license.note or ""
            lines.append(f"| `{p.manager.value}:{p.name}` | {p.version} | {raw} | {note} |")
        lines.append("")
    else:
        lines.append("本次扫描无需要法务确认的包。")
        lines.append("")

    lines.append("## 风险包清单摘要")
    lines.append("")
    if report.risks:
        lines.append(f"共 {len(report.risks)} 个风险依赖，详见 `legal-risk-summary.csv`。")
        lines.append("")
    else:
        lines.append("本次扫描未发现风险依赖。")
        lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def generate_legal_json(report: AuditReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "legal-report.json"
    by_cat = _by_category(report.scan.packages)
    payload = {
        "timestamp": report.timestamp,
        "baseline_timestamp": report.baseline_timestamp,
        "summary": {
            "total": len(report.scan.packages),
            "by_category": {
                cat.label_zh: len(by_cat.get(cat, [])) for cat in CATEGORY_ORDER
            },
            "license_distribution": _license_distribution(report.scan.packages),
            "need_confirmation": len(report.need_confirmation),
            "risks": len(report.risks),
            "new_risks_vs_baseline": len(report.new_risks_vs_baseline),
            "resolved_vs_baseline": len(report.resolved_vs_baseline),
        },
        "by_category": {
            cat.label_zh: [p.to_dict() for p in by_cat.get(cat, [])]
            for cat in CATEGORY_ORDER
        },
        "by_license": {
            lid: [f"{p.manager.value}:{p.name}@{p.version}" for p in pkgs]
            for lid, pkgs in _by_license(report.scan.packages).items()
        },
        "need_confirmation": [p.to_dict() for p in report.need_confirmation],
        "risks": [p.to_dict() for p in report.risks],
        "new_risks_vs_baseline": [p.to_dict() for p in report.new_risks_vs_baseline],
        "resolved_vs_baseline": report.resolved_vs_baseline,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def generate_legal_risk_summary(report: AuditReport, output_dir: Path) -> Path:
    """
    法务风险摘要：只包含风险包，用于单独流转法务审核。
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "legal-risk-summary.csv"
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow([
            "序号", "风险级别", "包管理器", "包名", "版本",
            "依赖类型", "进入产物", "许可证分类", "许可证原文",
            "标准化标识符", "说明", "是否需法务确认",
        ])
        risks = sorted(
            report.risks,
            key=lambda p: (
                0 if p.license.category.value in {"restricted", "dual_restricted"} else 1,
                p.license.category.value == "missing",
                p.manager.value,
                p.name.lower(),
                p.version,
            ),
        )
        for idx, p in enumerate(risks, 1):
            level = "高" if p.license.category.value in {"restricted", "dual_restricted"} else "中"
            need = "是" if p in report.need_confirmation else ""
            in_art = "是" if p.in_artifact else ("否" if p.in_artifact is False else "未检测")
            w.writerow([
                idx,
                level,
                p.manager.value,
                p.name,
                p.version,
                p.dep_type.label_zh,
                in_art,
                p.license.category.label_zh,
                p.license.raw or "(缺失)",
                ", ".join(p.license.identifiers) or "(未知)",
                p.license.note or ("已登记例外" if p.from_exception else ""),
                need,
            ])
    return out_path
