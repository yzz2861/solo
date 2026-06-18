from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List

from license_audit.models import AuditReport, Package


REPAIR_HINTS = {
    "missing": [
        "在 package.json / pyproject.toml 中显式声明 license 字段",
        "检查 LICENSE 文件并在元数据中同步",
        "确认项目是否有 LICENSE 文件，补入对应 SPDX 标识符",
    ],
    "restricted": [
        "评估是否可替换为白名单许可证的等价库",
        "联系法务评审 GPL/AGPL/SSPL 等传染型许可证的合规边界",
        "如必须使用，启动法务审批并在 package_exceptions 中登记例外",
    ],
    "uncertain": [
        "查阅官方仓库 LICENSE 文件确认准确的 SPDX 标识符",
        "在 issue/邮件中向维护者确认许可证",
        "无法确认时向法务提交需确认包名单",
    ],
    "dual_mixed": [
        "明确项目采用双许可证中的哪一个分支（通常 OR 任取其一）",
        "优先选择合规分支并在文档/配置中记录",
        "向法务确认双许可的可接受方案",
    ],
    "dual_restricted": [
        "评估双许可中是否存在合规分支可选用",
        "如双许可均有限制，考虑替换依赖或启动审批",
    ],
    "multi_version": [
        "排查依赖树中哪些直接依赖引入了不同版本",
        "通过 overrides / resolutions / pip 的 constraints 统一版本",
        "评估各版本许可证是否一致，避免版本升级引入许可风险",
    ],
    "dev_in_prod": [
        "检查打包配置（webpack/vite/rollup/tree-shaking）是否错误包含 devDependency",
        "把构建期仅用的工具（如 babel、eslint、jest）限定为 devDependencies",
        "验证产物内容确认不再包含开发依赖",
    ],
}


def _hints_for(pkg: Package, report: AuditReport) -> List[str]:
    cat = pkg.license.category.value
    hints = []
    if cat == "missing":
        hints.extend(REPAIR_HINTS["missing"])
    elif cat in {"restricted", "dual_restricted"}:
        hints.extend(REPAIR_HINTS["restricted"])
        if cat == "dual_restricted":
            hints.extend(REPAIR_HINTS["dual_restricted"])
    elif cat == "uncertain":
        hints.extend(REPAIR_HINTS["uncertain"])
    elif cat == "dual_mixed":
        hints.extend(REPAIR_HINTS["dual_mixed"])
        hints.extend(REPAIR_HINTS["uncertain"])
    if pkg.issues:
        hints.extend(REPAIR_HINTS["dev_in_prod"])
    return hints


def _risk_level(pkg: Package) -> str:
    cat = pkg.license.category
    if cat.value in {"restricted", "dual_restricted"}:
        return "高"
    if cat.value == "missing":
        return "中"
    if cat.value in {"uncertain", "dual_mixed"}:
        return "中"
    return "低"


def generate_dev_report(report: AuditReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "dev-report.md"

    lines: List[str] = []
    lines.append("# 研发依赖许可证修复报告")
    lines.append("")
    lines.append(f"- 扫描时间：{report.timestamp}")
    if report.baseline_timestamp:
        lines.append(f"- 对比基线：{report.baseline_timestamp}")
    lines.append(f"- 扫描文件：{len(report.scan.scanned_files)} 个")
    lines.append(f"- 总依赖数：{len(report.scan.packages)}")
    lines.append(f"- 风险依赖数：{len(report.risks)}")
    lines.append(f"- 合规依赖数：{len(report.approved)}")
    lines.append("")

    if report.new_risks_vs_baseline:
        lines.append("## ⚠️  相比上一次扫描新增的风险")
        lines.append("")
        for pkg in report.new_risks_vs_baseline:
            lines.append(f"- `{pkg.manager.value}:{pkg.name}@{pkg.version}` — {pkg.license.category.label_zh}（{pkg.license.raw or '未声明'}）")
        lines.append("")
    if report.resolved_vs_baseline:
        lines.append("## ✅ 相比上一次扫描已解决的风险")
        lines.append("")
        for key in report.resolved_vs_baseline:
            lines.append(f"- `{key}`")
        lines.append("")

    if report.risks:
        lines.append("## 🚨 风险依赖明细与修复建议")
        lines.append("")
        by_level: Dict[str, List[Package]] = defaultdict(list)
        for p in report.risks:
            by_level[_risk_level(p)].append(p)
        for level in ["高", "中", "低"]:
            pkgs = by_level.get(level, [])
            if not pkgs:
                continue
            lines.append(f"### {level}风险（{len(pkgs)} 个）")
            lines.append("")
            for pkg in pkgs:
                lines.append(f"#### `{pkg.manager.value}:{pkg.name}@{pkg.version}`")
                lines.append("")
                lines.append(f"- 许可证分类：**{pkg.license.category.label_zh}**")
                lines.append(f"- 许可证原文：`{pkg.license.raw or '(缺失)'}`")
                lines.append(f"- 标准化标识符：{', '.join(pkg.license.identifiers) or '(无)'}")
                lines.append(f"- 依赖类型：{pkg.dep_type.label_zh}")
                if pkg.in_artifact is not None:
                    lines.append(f"- 进入构建产物：{'是' if pkg.in_artifact else '否'}")
                if pkg.license.note:
                    lines.append(f"- 说明：{pkg.license.note}")
                if pkg.from_exception:
                    lines.append(f"- 备注：已在白名单 package_exceptions 中登记")
                if pkg.issues:
                    for issue in pkg.issues:
                        lines.append(f"- ⚠️  {issue}")
                hints = _hints_for(pkg, report)
                if hints:
                    lines.append("- 修复建议：")
                    for h in hints:
                        lines.append(f"  - {h}")
                if pkg.homepage:
                    lines.append(f"- 主页：{pkg.homepage}")
                if pkg.repository:
                    lines.append(f"- 仓库：{pkg.repository}")
                lines.append("")

    if report.multi_version:
        lines.append("## 📦 同包多版本情况")
        lines.append("")
        for info in report.multi_version:
            lics = "、".join(sorted(info.licenses)) or "(未知)"
            lines.append(f"- **{info.manager.value} `{info.name}`** — 版本 {', '.join(info.versions)} — 许可证：{lics}")
        lines.append("")
        lines.append("修复建议：")
        for h in REPAIR_HINTS["multi_version"]:
            lines.append(f"- {h}")
        lines.append("")

    if report.dev_in_prod:
        lines.append("## 🧪 开发依赖进入构建产物")
        lines.append("")
        for pkg in report.dev_in_prod:
            lines.append(f"- `{pkg.manager.value}:{pkg.name}@{pkg.version}`")
        lines.append("")
        lines.append("修复建议：")
        for h in REPAIR_HINTS["dev_in_prod"]:
            lines.append(f"- {h}")
        lines.append("")

    if report.dual_licenses:
        lines.append("## 🔀 双许可证包")
        lines.append("")
        for pkg in report.dual_licenses:
            lines.append(f"- `{pkg.manager.value}:{pkg.name}@{pkg.version}` — {', '.join(pkg.license.identifiers)} — **{pkg.license.category.label_zh}**")
        lines.append("")

    if report.scan.errors:
        lines.append("## ⚙️ 解析过程中的错误")
        lines.append("")
        for e in report.scan.errors:
            lines.append(f"- {e}")
        lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def generate_dev_json(report: AuditReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "dev-report.json"
    payload = {
        "timestamp": report.timestamp,
        "baseline_timestamp": report.baseline_timestamp,
        "summary": {
            "total": len(report.scan.packages),
            "approved": len(report.approved),
            "risks": len(report.risks),
            "missing": len(report.missing_license),
            "restricted": len(report.restricted),
            "uncertain": len(report.uncertain),
            "dual": len(report.dual_licenses),
            "multi_version": len(report.multi_version),
            "dev_in_prod": len(report.dev_in_prod),
            "new_risks": len(report.new_risks_vs_baseline),
            "resolved": len(report.resolved_vs_baseline),
        },
        "new_risks": [p.to_dict() for p in report.new_risks_vs_baseline],
        "resolved": report.resolved_vs_baseline,
        "risks": [
            {
                **p.to_dict(),
                "risk_level": _risk_level(p),
                "hints": _hints_for(p, report),
            }
            for p in report.risks
        ],
        "multi_version": [
            {
                "manager": mv.manager.value,
                "name": mv.name,
                "versions": mv.versions,
                "licenses": sorted(mv.licenses),
            }
            for mv in report.multi_version
        ],
        "dev_in_prod": [p.to_dict() for p in report.dev_in_prod],
        "dual_licenses": [p.to_dict() for p in report.dual_licenses],
        "errors": report.scan.errors,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def generate_dev_csv(report: AuditReport, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / "dev-report.csv"
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow([
            "风险等级", "包管理器", "包名", "版本", "依赖类型",
            "许可证分类", "许可证原文", "标准化标识符",
            "进入产物", "说明", "修复建议",
        ])
        for pkg in report.risks:
            hints = "；".join(_hints_for(pkg, report))
            w.writerow([
                _risk_level(pkg),
                pkg.manager.value,
                pkg.name,
                pkg.version,
                pkg.dep_type.label_zh,
                pkg.license.category.label_zh,
                pkg.license.raw,
                ", ".join(pkg.license.identifiers),
                "是" if pkg.in_artifact else ("否" if pkg.in_artifact is False else "未检测"),
                pkg.license.note,
                hints,
            ])
    return out_path
