from __future__ import annotations

from datetime import date, datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .exporter import (
    RISK_EMOJI,
    build_follow_up_list,
    export_follow_up_excel,
    export_follow_up_markdown,
)
from .history import (
    SnapshotStore,
    build_snapshot,
)
from .importers import (
    import_contracts,
    import_forecasts,
    import_tickets,
    import_usage,
)
from .merger import merge_data
from .models import RiskLevel
from .name_matcher import CustomerNameMatcher
from .risk_engine import RISK_ORDER, RiskConfig, run_risk_assessment
from .sales_sync import (
    build_pre_meeting_report,
    build_sales_sync_list,
    export_sales_pre_meeting_md,
    export_sales_sync_excel,
)

console = Console()


def _default_workspace() -> Path:
    return Path.cwd() / ".renewal_aligner"


def _workspace_path(ctx, param, value):
    return Path(value) if value else _default_workspace()


@click.group(help="SaaS 客户成功续费对齐工具：合并合同/使用量/工单/销售预测，识别续费风险")
@click.option("--workspace", "-w", type=click.Path(file_okay=False), default=None,
              callback=_workspace_path,
              help="工作目录（默认 ./.renewal_aligner）")
@click.pass_context
def cli(ctx, workspace):
    ctx.ensure_object(dict)
    ws = Path(workspace)
    ws.mkdir(parents=True, exist_ok=True)
    ctx.obj["workspace"] = ws
    ctx.obj["storage"] = SnapshotStore(ws / "snapshots")
    ctx.obj["alias_file"] = ws / "aliases.json"
    ctx.obj["matcher"] = CustomerNameMatcher(alias_file=ctx.obj["alias_file"])
    ctx.obj["output_dir"] = ws / "exports"
    ctx.obj["output_dir"].mkdir(parents=True, exist_ok=True)


def _print_import_stats(label, result):
    table = Table(title=f"📥 {label}", show_header=True, header_style="bold")
    table.add_column("指标", style="cyan")
    table.add_column("数值", justify="right")
    table.add_row("总行数", str(result.total_rows))
    table.add_row("成功导入", str(result.success_count))
    table.add_row("跳过行数", str(len(result.skipped_rows)))
    if result.errors:
        table.add_row("错误数", str(len(result.errors)), style="red")
    console.print(table)
    if result.errors:
        console.print("  ⚠️  前5条错误示例：", style="yellow")
        for err in result.errors[:5]:
            console.print(f"     {err}")


def _print_merge_stats(stats):
    panel = Table(title="🔗 数据合并结果", show_header=True, header_style="bold magenta")
    panel.add_column("指标")
    panel.add_column("数值", justify="right")
    panel.add_row("合并后客户总数", str(stats.total_customers), style="bold")
    panel.add_row("合同数", str(stats.contracts_matched))
    panel.add_row("使用量记录", str(stats.usage_matched))
    panel.add_row("工单", str(stats.tickets_matched))
    panel.add_row("预测商机", str(stats.forecasts_matched))
    if stats.renamed_customers:
        panel.add_row("识别改名客户", str(stats.renamed_customers), style="yellow")
    if stats.new_customers:
        panel.add_row("新识别客户", str(len(stats.new_customers)), style="green")
    if stats.low_confidence_matches:
        panel.add_row("低置信度匹配", str(len(stats.low_confidence_matches)), style="red")
    console.print(panel)
    if stats.fuzzy_matches:
        table = Table(title="🔍 模糊匹配明细（部分示例）", show_header=True, header_style="bold")
        table.add_column("来源")
        table.add_column("原始名")
        table.add_column("匹配名")
        table.add_column("分数", justify="right")
        table.add_column("匹配类型")
        for m in stats.fuzzy_matches[:10]:
            table.add_row(m["source"], m["raw_name"], m["canonical_name"], str(m["score"]), m["match_type"])
        console.print(table)


def _print_risk_summary(records, diff=None):
    level_list = [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.NONE]
    summary = {lvl: 0 for lvl in level_list}
    for rec in records.values():
        summary[rec.highest_risk_level] = summary.get(rec.highest_risk_level, 0) + 1
    t = Table(title="🎯 风险分布总览", show_header=True, header_style="bold")
    color_map = {
        RiskLevel.CRITICAL: "bold red",
        RiskLevel.HIGH: "bold yellow",
        RiskLevel.MEDIUM: "bold bright_yellow",
        RiskLevel.LOW: "bold green",
        RiskLevel.NONE: "bold white",
    }
    for lvl in level_list:
        emoji = RISK_EMOJI.get(lvl, "")
        t.add_column(f"{emoji} {lvl.value.upper()}", justify="center", header_style=color_map[lvl])
    t.add_row(*[str(summary.get(lvl, 0)) for lvl in level_list])
    console.print(t)
    if diff and diff.summary:
        dt = Table(title="📈 相比上次变化", show_header=True, header_style="bold")
        dt.add_column("指标", style="cyan")
        dt.add_column("数量", justify="right")
        items = [
            ("新客户", "new_customers", "green"),
            ("消失客户", "lost_customers", "magenta"),
            ("风险恶化", "worsened", "red"),
            ("风险改善", "improved", "green"),
            ("仍为高风险", "unchanged_high_risk", "yellow"),
            ("新增风险项", "total_added_risks", "red"),
            ("解决风险项", "total_removed_risks", "green"),
        ]
        for label, key, color in items:
            val = diff.summary.get(key, 0)
            if val:
                dt.add_row(label, str(val), style=color)
            else:
                dt.add_row(label, str(val))
        console.print(dt)


def _print_top_risk_clients(records, top_n=10):
    level_order = {lvl: i for i, lvl in enumerate(RISK_ORDER)}
    sorted_recs = sorted(
        [r for r in records.values() if r.highest_risk_level != RiskLevel.NONE],
        key=lambda r: (-level_order[r.highest_risk_level], -r.contract_value),
    )[:top_n]
    if not sorted_recs:
        return
    t = Table(title=f"⚠️  TOP {len(sorted_recs)} 高风险客户", show_header=True, header_style="bold")
    t.add_column("#", justify="right")
    t.add_column("客户")
    t.add_column("等级")
    t.add_column("合同额", justify="right")
    t.add_column("到期")
    t.add_column("主要风险")
    t.add_column("客成")
    t.add_column("销售")
    for i, rec in enumerate(sorted_recs):
        emoji = RISK_EMOJI.get(rec.highest_risk_level, "")
        lvl_text = Text(f"{emoji} {rec.highest_risk_level.value.upper()}")
        expiry = "-"
        if rec.upcoming_end_date:
            d = (rec.upcoming_end_date - date.today()).days
            expiry = f"{d}天" if d >= 0 else f"已过期{abs(d)}天"
        risks = sorted({r.risk_type.value for r in rec.risks})[:3]
        risk_str = " ".join(risks)
        val_str = f"￥{rec.contract_value:,.0f}" if rec.contract_value else "-"
        t.add_row(
            str(i + 1),
            rec.canonical_customer_name,
            lvl_text,
            val_str,
            expiry,
            risk_str,
            rec.csm_owner or "-",
            rec.sales_owner or "-",
        )
    console.print(t)


@cli.command("run", help="完整运行：导入所有表、合并、评估风险、保存快照、生成报告")
@click.option("--contracts", "contracts_file", required=True, type=click.Path(exists=True, dir_okay=False), help="合同表 CSV/Excel")
@click.option("--usage", "usage_file", required=True, type=click.Path(exists=True, dir_okay=False), help="产品使用量表")
@click.option("--tickets", "tickets_file", required=True, type=click.Path(exists=True, dir_okay=False), help="工单表")
@click.option("--forecasts", "forecasts_file", required=True, type=click.Path(exists=True, dir_okay=False), help="销售预测表")
@click.option("--baseline", default=None, help="基准日期 YYYY-MM-DD（默认今天）")
@click.option("--match-threshold", type=int, default=70, help="客户名匹配置信度阈值")
@click.option("--no-save", is_flag=True, help="不保存本次运行快照")
@click.option("--export/--no-export", default=True, help="是否同时导出跟进清单和销售同步")
@click.option("--top", type=int, default=15, help="控制台显示的高风险客户数")
@click.pass_context
def run_full(ctx, contracts_file, usage_file, tickets_file, forecasts_file, baseline, match_threshold, no_save, export, top):
    workspace = ctx.obj["workspace"]
    matcher: CustomerNameMatcher = ctx.obj["matcher"]
    store: SnapshotStore = ctx.obj["storage"]
    baseline_date = date.fromisoformat(baseline) if baseline else date.today()
    console.print(Panel(
        "📊 客户成功续费对齐运行",
        subtitle=f"基准日期: {baseline_date.isoformat()} | 工作区: {workspace}",
        border_style="blue",
    ))
    console.rule("步骤 1/5: 导入数据", style="cyan")
    c_res = import_contracts(Path(contracts_file))
    _print_import_stats("合同", c_res)
    u_res = import_usage(Path(usage_file))
    _print_import_stats("使用量", u_res)
    t_res = import_tickets(Path(tickets_file))
    _print_import_stats("工单", t_res)
    f_res = import_forecasts(Path(forecasts_file))
    _print_import_stats("销售预测", f_res)
    console.rule("步骤 2/5: 合并与客户匹配", style="magenta")
    merge_result = merge_data(
        contracts=c_res.records,
        usage_records=u_res.records,
        tickets=t_res.records,
        forecasts=f_res.records,
        matcher=matcher,
        match_threshold=match_threshold,
        baseline_date=baseline_date,
    )
    _print_merge_stats(merge_result.stats)
    console.rule("步骤 3/5: 风险评估", style="yellow")
    cfg = RiskConfig()
    records = run_risk_assessment(merge_result.records, baseline=baseline_date, config=cfg)
    console.rule("步骤 4/5: 保存快照并与上次对比", style="green")
    previous_run_id = store.latest_run_id()
    snapshot = build_snapshot(records, baseline_date=baseline_date, previous_run_id=previous_run_id)
    diff = None
    run_id = ""
    if not no_save:
        run_id = store.save_snapshot(snapshot)
        console.print(f"💾 快照已保存：{run_id}", style="bold green")
        if ctx.obj["alias_file"]:
            matcher.save_aliases(ctx.obj["alias_file"])
        diff = store.annotate_with_changes(records, run_id, previous_run_id)
    else:
        run_id = "(未保存)"
    console.rule("步骤 5/5: 生成报告", style="bold")
    _print_risk_summary(records, diff)
    _print_top_risk_clients(records, top_n=top)
    if export:
        out_dir: Path = ctx.obj["output_dir"]
        stamp = datetime.now().strftime("%Y%m%d-%H%M")
        items = build_follow_up_list(records, diff, baseline=baseline_date)
        xl_path = out_dir / f"follow-up-{stamp}.xlsx"
        md_path = out_dir / f"follow-up-{stamp}.md"
        export_follow_up_excel(items, xl_path)
        export_follow_up_markdown(items, md_path, title=f"下周重点跟进清单 ({baseline_date.isoformat()})")
        console.print("✅ 跟进清单已导出：", style="bold green")
        console.print(f"   Excel: {xl_path}")
        console.print(f"   Markdown: {md_path}")
        sales_items = build_sales_sync_list(records, baseline=baseline_date)
        if sales_items:
            sales_xl = out_dir / f"sales-sync-{stamp}.xlsx"
            sales_md = out_dir / f"pre-meeting-{stamp}.md"
            export_sales_sync_excel(sales_items, sales_xl)
            report = build_pre_meeting_report(sales_items, baseline=baseline_date)
            export_sales_pre_meeting_md(report, sales_md)
            console.print("✅ 销售同步清单已导出：", style="bold green")
            console.print(f"   Excel: {sales_xl}")
            console.print(f"   会议清单: {sales_md}")
            console.print(f"   含 {len(sales_items)} 位高风险客户需要销售对齐", style="yellow")
        else:
            console.print("ℹ️  没有达到高风险客户需要销售同步", style="cyan")
    console.print(Panel("运行完成！", border_style="green"))


@cli.command("diff", help="对比两次运行的风险变化")
@click.option("--run-id", "run_id", default=None, help="本次运行ID（默认最新）")
@click.option("--previous", "previous_id", default=None, help="对比的之前运行ID")
@click.option("--export", "export_file", default=None, type=click.Path(dir_okay=False), help="导出到Excel")
@click.pass_context
def cmd_diff(ctx, run_id, previous_id, export_file):
    store: SnapshotStore = ctx.obj["storage"]
    if not run_id:
        run_id = store.latest_run_id()
        if not run_id:
            console.print("❌ 没有找到任何运行记录，请先运行 run 命令", style="bold red")
            return
    console.print(f"🔍 对比分析：运行 {run_id}", style="bold")
    diff = store.compute_diff(run_id, previous_id)
    if not diff.previous_run_id:
        console.print("ℹ️  没有找到之前的运行记录，将只展示当前内容", style="yellow")
    else:
        console.print(f"   对比基准：{diff.previous_run_id}", style="cyan")
    if diff.new_customers:
        t = Table(title="🆕 新进入名单的客户", show_header=True, header_style="bold green")
        t.add_column("客户名")
        for n in diff.new_customers:
            t.add_row(n)
        console.print(t)
    if diff.lost_customers:
        t = Table(title="👋 本次名单中不再出现的客户", show_header=True, header_style="bold magenta")
        t.add_column("客户名")
        for n in diff.lost_customers:
            t.add_row(n)
        console.print(t)
    if diff.worsened:
        t = Table(title="📈 风险恶化", show_header=True, header_style="bold red")
        t.add_column("客户")
        t.add_column("之前")
        t.add_column("现在")
        t.add_column("新增风险")
        t.add_column("加重风险")
        for c in diff.worsened:
            added = ", ".join(r["risk_type"] for r in c.added_risks[:3])
            esc = ", ".join(f"{ar['risk']['risk_type']}" for ar in c.escalated_risks[:2]) or "-"
            t.add_row(c.canonical_customer_name, c.previous_level.value, c.current_level.value, added or "-", esc)
        console.print(t)
    if diff.improved:
        t = Table(title="📉 风险改善", show_header=True, header_style="bold green")
        t.add_column("客户")
        t.add_column("之前")
        t.add_column("现在")
        t.add_column("已解决风险")
        for c in diff.improved:
            removed = ", ".join(r["risk_type"] for r in c.removed_risks[:3])
            t.add_row(c.canonical_customer_name, c.previous_level.value, c.current_level.value, removed or "-")
        console.print(t)
    if diff.unchanged_high_risk:
        t = Table(title="⚠️ 持续高风险（未改善）", show_header=True, header_style="bold yellow")
        t.add_column("客户")
        t.add_column("当前等级")
        t.add_column("新增风险")
        for c in diff.unchanged_high_risk:
            added = ", ".join(r["risk_type"] for r in c.added_risks[:3])
            t.add_row(c.canonical_customer_name, c.current_level.value, added or "(无新增)")
        console.print(t)
    if export_file:
        rows = []
        def _ch_to_row(ch, kind):
            return {
                "类型": kind,
                "客户": ch.canonical_customer_name,
                "之前等级": ch.previous_level.value,
                "当前等级": ch.current_level.value,
                "变化": f"{ch.level_delta:+d}",
                "新增风险": "; ".join(r["risk_type"] + ":" + r["message"] for r in ch.added_risks),
                "已解决风险": "; ".join(r["risk_type"] + ":" + r["message"] for r in ch.removed_risks),
                "风险加重": "; ".join(
                    ar["risk"]["risk_type"] + " (" + ar["previous_level"] + "->" + ar["current_level"] + ")"
                    for ar in ch.escalated_risks
                ),
            }
        import pandas as pd
        for c in diff.worsened:
            rows.append(_ch_to_row(c, "风险恶化"))
        for c in diff.improved:
            rows.append(_ch_to_row(c, "风险改善"))
        for c in diff.unchanged_high_risk:
            rows.append(_ch_to_row(c, "持续高风险"))
        for n in diff.new_customers:
            rows.append({"类型": "新客户", "客户": n, "之前等级": "-", "当前等级": "-"})
        for n in diff.lost_customers:
            rows.append({"类型": "消失客户", "客户": n, "之前等级": "-", "当前等级": "-"})
        if rows:
            df = pd.DataFrame(rows)
            out = Path(export_file)
            out.parent.mkdir(parents=True, exist_ok=True)
            df.to_excel(out, index=False)
            console.print(f"✅ 对比报告已导出：{out}", style="bold green")


@cli.command("list-runs", help="列出历史运行记录")
@click.option("--limit", type=int, default=10, help="显示最近N次运行")
@click.pass_context
def cmd_list_runs(ctx, limit):
    store: SnapshotStore = ctx.obj["storage"]
    runs = store.list_runs(limit=limit)
    if not runs:
        console.print("ℹ️  还没有任何运行记录", style="cyan")
        return
    t = Table(title="📜 历史运行", show_header=True, header_style="bold")
    t.add_column("运行ID")
    t.add_column("运行时间")
    t.add_column("基准日")
    t.add_column("客户数", justify="right")
    lvls = ["critical", "high", "medium", "low", "none"]
    for h in ["🔴", "🟠", "🟡", "🟢", "⚪"]:
        t.add_column(h, justify="right")
    for r in runs:
        rs = r.get("risk_summary", {})
        row = [r["run_id"], r["run_time"][:16].replace("T", " "), r["baseline_date"], str(r["total_customers"])]
        for lv in lvls:
            row.append(str(rs.get(lv, 0)))
        t.add_row(*row)
    console.print(t)


@cli.command("export-followup", help="导出重点跟进清单（基于指定运行或最新运行）")
@click.option("--run-id", default=None, help="运行ID（默认最新）")
@click.option("--format", "fmt", type=click.Choice(["excel", "markdown", "both"]), default="both", help="导出格式")
@click.option("--min-risk", type=click.Choice(["none", "low", "medium", "high", "critical"]), default="low", help="最低风险等级")
@click.option("--owner", default=None, help="按客成经理筛选（模糊匹配）")
@click.option("--days", type=int, default=30, help="包含未来N天内到期的客户")
@click.option("--output", default=None, type=click.Path(dir_okay=False), help="输出文件名前缀")
@click.pass_context
def cmd_export_followup(ctx, run_id, fmt, min_risk, owner, days, output):
    store: SnapshotStore = ctx.obj["storage"]
    if not run_id:
        run_id = store.latest_run_id()
        if not run_id:
            console.print("❌ 没有找到任何运行记录", style="bold red")
            return
    snap = store.load_snapshot(run_id)
    if not snap:
        console.print(f"❌ 找不到运行 {run_id}", style="bold red")
        return
    min_level = RiskLevel(min_risk)
    items = build_follow_up_list(
        snap.records,
        diff=None,
        min_risk_level=min_level,
        include_next_days=days,
        owner_filter=owner,
        baseline=snap.baseline_date,
    )
    console.print(f"📋 生成跟进清单：{len(items)} 位客户", style="bold")
    out_dir: Path = ctx.obj["output_dir"]
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    prefix = output or str(out_dir / f"follow-up-{run_id}-{stamp}")
    if fmt in ("excel", "both"):
        p = Path(output) if output and str(output).endswith(".xlsx") else Path(f"{prefix}.xlsx")
        export_follow_up_excel(items, p)
        console.print(f"   Excel: {p}", style="green")
    if fmt in ("markdown", "both"):
        p = Path(output) if output and str(output).endswith(".md") else Path(f"{prefix}.md")
        export_follow_up_markdown(items, p, title=f"重点跟进清单 - {run_id}")
        console.print(f"   Markdown: {p}", style="green")


@cli.command("export-sales-sync", help="导出销售同步清单与续费会前确认")
@click.option("--run-id", default=None, help="运行ID（默认最新）")
@click.option("--min-risk", type=click.Choice(["medium", "high", "critical"]), default="high", help="同步的最低风险等级")
@click.option("--output", default=None, type=click.Path(dir_okay=False), help="输出文件前缀")
@click.pass_context
def cmd_export_sales_sync(ctx, run_id, min_risk, output):
    store: SnapshotStore = ctx.obj["storage"]
    if not run_id:
        run_id = store.latest_run_id()
        if not run_id:
            console.print("❌ 没有找到任何运行记录", style="bold red")
            return
    snap = store.load_snapshot(run_id)
    if not snap:
        console.print(f"❌ 找不到运行 {run_id}", style="bold red")
        return
    min_level = RiskLevel(min_risk)
    items = build_sales_sync_list(snap.records, min_risk_level=min_level, baseline=snap.baseline_date)
    console.print(f"🤝 销售同步清单：{len(items)} 位客户需要销售对齐", style="bold")
    out_dir: Path = ctx.obj["output_dir"]
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    prefix = output or str(out_dir / f"sales-sync-{run_id}-{stamp}")
    xl_path = Path(f"{prefix}.xlsx")
    md_path = Path(f"{prefix}-meeting.md")
    export_sales_sync_excel(items, xl_path)
    report = build_pre_meeting_report(items, baseline=snap.baseline_date)
    export_sales_pre_meeting_md(report, md_path)
    console.print(f"   Excel (销售同步表): {xl_path}", style="green")
    console.print(f"   Markdown (续费会前清单): {md_path}", style="green")
    if report.urgent_items:
        console.print(f"   ⚠️  其中 {len(report.urgent_items)} 位极度紧急（30天内到期）", style="yellow")
    if report.forecast_mismatch_items:
        console.print(f"   ⚠️  {len(report.forecast_mismatch_items)} 位预测与合同不匹配", style="yellow")


@cli.group("alias", help="客户别名/曾用名管理")
def alias_group():
    pass


@alias_group.command("add", help="添加客户别名")
@click.argument("canonical")
@click.argument("alias_name")
@click.pass_context
def alias_add(ctx, canonical, alias_name):
    matcher: CustomerNameMatcher = ctx.obj["matcher"]
    matcher.add_alias(canonical, alias_name)
    matcher.save_aliases(ctx.obj["alias_file"])
    console.print(f"✅ 已添加别名：「{alias_name}」→「{canonical}」", style="bold green")


@alias_group.command("rename", help="记录客户改名（旧名→新名）")
@click.argument("old_name")
@click.argument("new_name")
@click.option("--date", "rename_date", default=None, help="改名日期 YYYY-MM-DD")
@click.pass_context
def alias_rename(ctx, old_name, new_name, rename_date):
    matcher: CustomerNameMatcher = ctx.obj["matcher"]
    matcher.record_rename(old_name, new_name, rename_date)
    matcher.save_aliases(ctx.obj["alias_file"])
    console.print(f"✅ 已记录改名：「{old_name}」→「{new_name}」", style="bold green")
    if rename_date:
        console.print(f"   改名日期：{rename_date}", style="cyan")


@alias_group.command("list", help="列出所有已知客户名映射")
@click.option("--search", default=None, help="按关键字过滤")
@click.pass_context
def alias_list(ctx, search):
    matcher: CustomerNameMatcher = ctx.obj["matcher"]
    names = matcher.all_canonical_names()
    if search:
        names = [n for n in names if search.lower() in n.lower()]
    if not names:
        console.print("ℹ️  没有匹配的客户名", style="cyan")
        return
    t = Table(title="📇 客户名称映射", show_header=True, header_style="bold")
    t.add_column("标准名称")
    t.add_column("别名")
    t.add_column("曾用名")
    t.add_column("改名日期")
    t.add_column("备注")
    for n in names:
        a = matcher.get_alias(n)
        if a:
            t.add_row(
                n,
                "、".join(a.aliases) or "-",
                "、".join(a.previous_names) or "-",
                a.rename_date or "-",
                a.notes or "-",
            )
        else:
            t.add_row(n, "-", "-", "-", "-")
    console.print(t)


@cli.command("client", help="查看单个客户的完整详情")
@click.argument("customer_name")
@click.option("--run-id", default=None, help="运行ID（默认最新）")
@click.pass_context
def cmd_client(ctx, customer_name, run_id):
    store: SnapshotStore = ctx.obj["storage"]
    matcher: CustomerNameMatcher = ctx.obj["matcher"]
    canonical, _ = matcher.ensure_canonical(customer_name)
    if not run_id:
        run_id = store.latest_run_id()
        if not run_id:
            console.print("❌ 没有找到任何运行记录", style="bold red")
            return
    snap = store.load_snapshot(run_id)
    if not snap:
        console.print(f"❌ 找不到运行 {run_id}", style="bold red")
        return
    rec = snap.records.get(canonical)
    if not rec:
        console.print(
            f"❌ 在本次运行中找不到客户「{canonical}」（原输入：{customer_name}）",
            style="bold red",
        )
        sample = ", ".join(sorted(snap.records.keys())[:20])
        console.print(f"   本次运行中的客户示例：{sample}", style="cyan")
        return
    console.print(Panel(f"📋 {canonical}", subtitle=f"运行: {run_id}", border_style="bold blue"))
    info = Table(show_header=False, box=None)
    info.add_column("项目", style="cyan", width=15)
    info.add_column("内容")
    info.add_row("所有名称", " / ".join(rec.all_names) or canonical)
    if rec.was_renamed:
        info.add_row("改名情况", "是 ⚠️ " + str(rec.rename_details))
    info.add_row("客成经理", rec.csm_owner or "-")
    info.add_row("销售负责人", rec.sales_owner or "-")
    info.add_row("合同总额", f"￥{rec.contract_value:,.0f}" if rec.contract_value else "-")
    if rec.primary_contract:
        c = rec.primary_contract
        d = None
        if c.end_date:
            days = (c.end_date - snap.baseline_date).days
            if days >= 0:
                d = f"{c.end_date.isoformat()}（剩余{days}天）"
            else:
                d = f"{c.end_date.isoformat()}（已过期{abs(days)}天）"
        status_text = "续签中" if c.is_renewal_in_progress else c.status.value
        info.add_row("主合同", f"{c.contract_id} / {c.product or '-'} / {status_text}")
        info.add_row("合同期限", f"{c.start_date or '-'} ~ {d or '-'}")
    if rec.latest_usage:
        u = rec.latest_usage
        rate = f"{u.utilization_rate * 100:.0f}%"
        pilot = "试点中" if u.has_pilot else "无试点"
        info.add_row(
            "使用情况",
            f"活跃 {u.active_users}/{u.total_licenses} 使用率{rate}，近30天登录{u.login_last_30_days}人（{pilot}）",
        )
    info.add_row(
        "工单",
        f"总{len(rec.tickets)}，未关闭{rec.open_ticket_count}，重开{rec.reopened_ticket_count}",
    )
    if rec.forecasts:
        cats = ", ".join(f"{f.category.value}:￥{f.amount:,.0f}" for f in rec.forecasts)
        info.add_row("销售预测", cats)
    lvl_emoji = RISK_EMOJI.get(rec.highest_risk_level, "")
    info.add_row("最高风险", f"{lvl_emoji} {rec.highest_risk_level.value.upper()}")
    info.add_row("下一步", rec.next_action or "-")
    info.add_row(
        "建议跟进",
        rec.follow_up_date.isoformat() if rec.follow_up_date else "-",
    )
    console.print(info)
    if rec.risks:
        rt = Table(title="⚠️ 风险明细", show_header=True, header_style="bold")
        rt.add_column("类型")
        rt.add_column("等级")
        rt.add_column("说明")
        rt.add_column("变化")
        for r in rec.risks:
            emoji = RISK_EMOJI.get(r.risk_level, "")
            lvl = f"{emoji} {r.risk_level.value}"
            rt.add_row(r.risk_type.value, lvl, r.message, r.change_since_last or "-")
        console.print(rt)
    else:
        console.print("✅ 无风险项", style="green")


def main():
    cli()


if __name__ == "__main__":
    main()
