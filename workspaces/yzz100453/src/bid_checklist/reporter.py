"""报告生成器：待补清单、可归档目录、按负责人拆分."""
from __future__ import annotations

import csv
import shutil
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .matcher import AttachmentCheckResult
from .models import AttachmentStatus, BidChecklistConfig
from .scanner import ScannedFile


console = Console()


STATUS_ICON = {
    AttachmentStatus.PENDING: "⏳",
    AttachmentStatus.MATCHED: "✅",
    AttachmentStatus.EXPIRED: "⏰",
    AttachmentStatus.MISSING: "❌",
    AttachmentStatus.DUPLICATE: "🔁",
    AttachmentStatus.PAGE_ERROR: "📄",
    AttachmentStatus.STAMP_MISSING: "🔏",
    AttachmentStatus.NAME_MISMATCH: "👤",
}

STATUS_LABEL = {
    AttachmentStatus.PENDING: "待处理",
    AttachmentStatus.MATCHED: "正常",
    AttachmentStatus.EXPIRED: "已过期",
    AttachmentStatus.MISSING: "缺失",
    AttachmentStatus.DUPLICATE: "重复",
    AttachmentStatus.PAGE_ERROR: "页数异常",
    AttachmentStatus.STAMP_MISSING: "缺盖章",
    AttachmentStatus.NAME_MISMATCH: "姓名不一致",
}

STATUS_STYLE = {
    AttachmentStatus.MATCHED: "bold green",
    AttachmentStatus.MISSING: "bold red",
    AttachmentStatus.EXPIRED: "bold red",
    AttachmentStatus.PAGE_ERROR: "bold yellow",
    AttachmentStatus.STAMP_MISSING: "bold orange3",
    AttachmentStatus.NAME_MISMATCH: "bold magenta",
    AttachmentStatus.DUPLICATE: "bold cyan",
    AttachmentStatus.PENDING: "dim",
}


@dataclass
class ReportSummary:
    total: int = 0
    matched: int = 0
    missing: int = 0
    expired: int = 0
    page_error: int = 0
    stamp_missing: int = 0
    name_mismatch: int = 0
    with_warnings: int = 0

    def ok(self) -> bool:
        return self.missing == 0 and self.expired == 0 and self.page_error == 0 \
            and self.stamp_missing == 0 and self.name_mismatch == 0


def _build_summary(results: List[AttachmentCheckResult]) -> ReportSummary:
    s = ReportSummary(total=len(results))
    for r in results:
        if r.status == AttachmentStatus.MATCHED and not r.issues:
            s.matched += 1
        elif r.status == AttachmentStatus.MISSING:
            s.missing += 1
        elif r.status == AttachmentStatus.EXPIRED:
            s.expired += 1
        elif r.status == AttachmentStatus.PAGE_ERROR:
            s.page_error += 1
        elif r.status == AttachmentStatus.STAMP_MISSING:
            s.stamp_missing += 1
        elif r.status == AttachmentStatus.NAME_MISMATCH:
            s.name_mismatch += 1
        if r.warnings:
            s.with_warnings += 1
    return s


def print_summary(
    config: BidChecklistConfig,
    results: List[AttachmentCheckResult],
    scanned_files: Optional[List[ScannedFile]] = None,
):
    """在终端打印汇总."""
    s = _build_summary(results)
    header = f"📋 招投标附件清单检查报告 — {config.project_name}"
    if config.bid_deadline:
        header += f"  封标日：{config.bid_deadline}"

    info_lines = [
        f"共 [bold]{s.total}[/] 项附件要求",
        f"✅ 正常 [green]{s.matched}[/]    ❌ 缺失 [red]{s.missing}[/]",
        f"⏰ 过期 [red]{s.expired}[/]    📄 页数异常 [yellow]{s.page_error}[/]",
        f"🔏 缺盖章 [orange3]{s.stamp_missing}[/]    👤 姓名不一致 [magenta]{s.name_mismatch}[/]",
    ]
    if s.with_warnings:
        info_lines.append(f"⚠️  含警告项 [cyan]{s.with_warnings}[/]")
    if scanned_files:
        info_lines.append(f"📂 扫描到本地文件共 [bold]{len(scanned_files)}[/] 个")

    info = "\n".join(info_lines)
    style = "green" if s.ok() else "yellow"
    console.print(Panel(info, title=header, border_style=style))


def print_detailed_table(results: List[AttachmentCheckResult]):
    """打印详细表格."""
    table = Table(
        title="附件明细",
        show_lines=True,
        header_style="bold cyan",
        expand=True,
    )
    table.add_column("状态", width=10, justify="center")
    table.add_column("章节", width=14, style="dim")
    table.add_column("附件名称", ratio=2)
    table.add_column("负责人", width=10)
    table.add_column("匹配文件", ratio=2)
    table.add_column("问题/警告", ratio=3)

    for r in results:
        status = Text()
        icon = STATUS_ICON.get(r.status, "❓")
        label = STATUS_LABEL.get(r.status, r.status.value)
        style = STATUS_STYLE.get(r.status, "white")
        status.append(f"{icon} {label}", style=style)

        section = r.item.section or "-"
        name = r.item.name
        owner = r.item.owner or "-"
        matched = (
            r.matched_file.name
            if r.matched_file
            else ("[red]无匹配[/]" if r.item.required else "[dim]（非必须）[/]")
        )

        problem_parts = []
        for issue in r.issues:
            problem_parts.append(f"[red]✖ {issue}[/]")
        for warn in r.warnings:
            problem_parts.append(f"[yellow]! {warn}[/]")
        problems = "\n".join(problem_parts) if problem_parts else "-"

        table.add_row(status, section, name, owner, matched, problems)

    console.print(table)


def _group_by_owner(
    results: List[AttachmentCheckResult], config: BidChecklistConfig
) -> Dict[str, List[AttachmentCheckResult]]:
    grouped: Dict[str, List[AttachmentCheckResult]] = {}
    for r in results:
        owner = r.item.owner or config.default_owner or "未分配"
        grouped.setdefault(owner, []).append(r)
    return grouped


def print_pending_by_owner(
    results: List[AttachmentCheckResult], config: BidChecklistConfig
):
    """按负责人打印待补催办清单."""
    grouped = _group_by_owner(results, config)
    console.print()
    console.print(Panel("📣 封标前待办 · 按负责人拆分", border_style="magenta"))

    for owner in sorted(grouped.keys()):
        owner_items = grouped[owner]
        problems = [
            r for r in owner_items
            if r.status != AttachmentStatus.MATCHED or r.issues or r.warnings
        ]
        if not problems:
            continue

        console.print(f"\n[bold magenta]📌 {owner}[/]  —— 共 {len(problems)} 项待处理")
        for idx, r in enumerate(problems, 1):
            icon = STATUS_ICON.get(r.status, "❓")
            label = STATUS_LABEL.get(r.status, r.status.value)
            console.print(f"  {idx}. {icon} [{label}] {r.item.name}")
            if r.matched_file:
                console.print(f"       文件：{r.matched_file.name}")
            for issue in r.issues:
                console.print(f"     [red]✖ {issue}[/]")
            for warn in r.warnings:
                console.print(f"     [yellow]! {warn}[/]")


def print_archive_suggestions(
    results: List[AttachmentCheckResult], config: BidChecklistConfig
):
    """打印可归档目录建议."""
    console.print()
    console.print(Panel("📁 可归档目录（仅正常项）", border_style="green"))

    by_section = config.attachments_by_section()
    used_files = set()

    table = Table(header_style="bold green", expand=True)
    table.add_column("章节", ratio=1)
    table.add_column("序号", width=6, justify="right")
    table.add_column("附件名", ratio=2)
    table.add_column("源文件路径", ratio=4)
    table.add_column("归档建议名", ratio=2)

    idx_total = 0
    for section, items in by_section.items():
        first_in_section = True
        for item in items:
            matched = None
            for r in results:
                if r.item is item and r.status == AttachmentStatus.MATCHED \
                        and not r.issues and r.matched_file:
                    matched = r.matched_file
                    break
            if not matched:
                continue
            used_files.add(str(matched.path.resolve()))
            idx_total += 1
            safe_name = f"{idx_total:03d}_{item.name}{matched.suffix}"
            table.add_row(
                section if first_in_section else "",
                str(idx_total),
                item.name,
                str(matched.path),
                safe_name,
            )
            first_in_section = False

    if idx_total == 0:
        console.print("[dim]暂无可归档项（存在待处理问题）[/]")
    else:
        console.print(table)
        console.print(f"[green]合计可归档 {idx_total} 个文件[/]")


def export_pending_csv(
    results: List[AttachmentCheckResult],
    config: BidChecklistConfig,
    output_path: str | Path,
):
    """导出待补清单为CSV."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for r in results:
        if r.status == AttachmentStatus.MATCHED and not r.issues:
            continue
        rows.append({
            "负责人": r.item.owner or config.default_owner or "未分配",
            "章节": r.item.section or "",
            "附件名称": r.item.name,
            "类别": r.item.category.value,
            "状态": STATUS_LABEL.get(r.status, r.status.value),
            "是否必须": "是" if r.item.required else "否",
            "匹配文件": r.matched_file.name if r.matched_file else "",
            "文件路径": str(r.matched_file.path) if r.matched_file else "",
            "页数": r.matched_file.page_count if (r.matched_file and r.matched_file.is_pdf) else "",
            "问题描述": "；".join(r.issues),
            "警告提示": "；".join(r.warnings),
            "要求说明": r.item.description,
        })

    if not rows:
        console.print("[green]无待补项，未生成CSV[/]")
        return

    with out.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    console.print(f"✅ 待补清单已导出：[bold]{out}[/]（共 {len(rows)} 项）")


def export_summary_markdown(
    results: List[AttachmentCheckResult],
    config: BidChecklistConfig,
    scanned_files: Optional[List[ScannedFile]],
    output_path: str | Path,
):
    """导出完整Markdown报告."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    s = _build_summary(results)
    today = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []
    lines.append(f"# 招投标附件清单报告 — {config.project_name}")
    lines.append("")
    lines.append(f"- **生成时间**：{today}")
    if config.bid_deadline:
        lines.append(f"- **封标日期**：{config.bid_deadline}")
    lines.append(f"- **总附件数**：{s.total}")
    lines.append(f"- **正常**：{s.matched} ｜ **缺失**：{s.missing} ｜ **过期**：{s.expired}")
    lines.append(f"- **页数异常**：{s.page_error} ｜ **缺盖章**：{s.stamp_missing} ｜ **姓名不一致**：{s.name_mismatch}")
    if scanned_files:
        lines.append(f"- **扫描本地文件**：{len(scanned_files)} 个")
    lines.append("")

    lines.append("## 一、问题明细（待补清单）")
    lines.append("")
    grouped = _group_by_owner(results, config)
    for owner in sorted(grouped.keys()):
        owner_items = grouped[owner]
        problems = [
            r for r in owner_items
            if r.status != AttachmentStatus.MATCHED or r.issues or r.warnings
        ]
        if not problems:
            continue
        lines.append(f"### 👤 {owner}（{len(problems)}项）")
        lines.append("")
        lines.append("| 序号 | 附件 | 状态 | 匹配文件 | 问题 |")
        lines.append("| --- | --- | --- | --- | --- |")
        for i, r in enumerate(problems, 1):
            issues_text = "<br>".join(
                [f"❌ {x}" for x in r.issues]
                + [f"⚠️ {x}" for x in r.warnings]
            ) or "-"
            file_name = r.matched_file.name if r.matched_file else "-"
            lines.append(
                f"| {i} | {r.item.name} | "
                f"{STATUS_LABEL.get(r.status, r.status.value)} | "
                f"{file_name} | {issues_text} |"
            )
        lines.append("")

    lines.append("## 二、可归档目录")
    lines.append("")
    lines.append("| 序号 | 章节 | 附件 | 源文件 | 归档文件名 |")
    lines.append("| --- | --- | --- | --- | --- |")
    idx_total = 0
    for r in results:
        if r.status == AttachmentStatus.MATCHED and not r.issues and r.matched_file:
            idx_total += 1
            safe = f"{idx_total:03d}_{r.item.name}{r.matched_file.suffix}"
            lines.append(
                f"| {idx_total} | {r.item.section or '-'} | "
                f"{r.item.name} | {r.matched_file.path} | {safe} |"
            )
    if idx_total == 0:
        lines.append("| - | - | - | - | 暂无可归档项 |")
    lines.append("")

    lines.append("## 三、全量附件检查清单")
    lines.append("")
    lines.append("| 序号 | 章节 | 附件 | 负责人 | 状态 | 是否必须 | 匹配文件 | 问题/警告 |")
    lines.append("| --- | --- | --- | --- | --- | --- | --- | --- |")
    for i, r in enumerate(results, 1):
        must = "是" if r.item.required else "否"
        status = STATUS_LABEL.get(r.status, r.status.value)
        file_name = r.matched_file.name if r.matched_file else ""
        all_probs = "；".join(r.issues + r.warnings) or "-"
        lines.append(
            f"| {i} | {r.item.section or '-'} | {r.item.name} | "
            f"{r.item.owner or config.default_owner or '未分配'} | {status} | "
            f"{must} | {file_name} | {all_probs} |"
        )

    out.write_text("\n".join(lines), encoding="utf-8")
    console.print(f"✅ 完整Markdown报告已导出：[bold]{out}[/]")


def create_archive_directory(
    results: List[AttachmentCheckResult],
    config: BidChecklistConfig,
    dest_dir: str | Path,
    copy: bool = True,
) -> int:
    """创建可归档目录（硬拷贝或复制）."""
    dest = Path(dest_dir).expanduser().resolve()
    dest.mkdir(parents=True, exist_ok=True)

    by_section = config.attachments_by_section()
    idx_total = 0

    for section, items in by_section.items():
        section_dir = dest / (section or "未分类")
        for item in items:
            matched = None
            for r in results:
                if r.item is item and r.status == AttachmentStatus.MATCHED \
                        and not r.issues and r.matched_file:
                    matched = r.matched_file
                    break
            if not matched:
                continue

            section_dir.mkdir(parents=True, exist_ok=True)
            idx_total += 1
            safe = f"{idx_total:03d}_{item.name}{matched.suffix}"
            target = section_dir / safe
            i = 1
            while target.exists():
                target = section_dir / f"{idx_total:03d}_{item.name}_{i}{matched.suffix}"
                i += 1
            if copy:
                shutil.copy2(matched.path, target)
            else:
                try:
                    target.hardlink_to(matched.path)
                except OSError:
                    shutil.copy2(matched.path, target)

    console.print(f"✅ 已{'复制' if copy else '硬链接'} {idx_total} 个归档文件到 [bold]{dest}[/]")
    return idx_total
