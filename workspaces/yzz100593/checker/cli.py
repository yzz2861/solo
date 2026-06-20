from __future__ import annotations

import os
import sys

import click
from rich.console import Console
from rich.table import Table

from .loader import RulesBundle, load_all
from .reporter import (
    export_clinical_csv,
    export_exception_csv,
    generate_it_report,
    record_batch,
)
from .risk import run_checks, sort_by_risk
from .types import CheckResult, ISSUE_KIND_LABEL, IssueSeverity

console = Console()


@click.group()
@click.option("--rules-dir", envvar="OTC_RULES_DIR", default="rules", help="规则文件目录")
@click.option("--template-dir", envvar="OTC_TEMPLATE_DIR", default="templates", help="模板文件目录")
@click.pass_context
def main(ctx, rules_dir, template_dir):
    """医嘱模板变量检查 CLI — 检查未闭合变量、默认值缺失、剂量单位不一致和禁用表述"""
    ctx.ensure_object(dict)
    ctx.obj["rules_dir"] = rules_dir
    ctx.obj["template_dir"] = template_dir


@main.command()
@click.option("--output", "-o", default=None, help="报告输出文件路径（默认输出到终端）")
@click.pass_context
def check(ctx, output):
    """运行模板变量检查，输出信息科报告"""
    rules_dir = ctx.obj["rules_dir"]
    template_dir = ctx.obj["template_dir"]

    if not os.path.isdir(template_dir):
        console.print(f"[red]错误: 模板目录不存在: {template_dir}[/red]")
        sys.exit(1)

    bundle, templates, timestamp = load_all(rules_dir, template_dir)
    run_checks(
        templates,
        bundle.variable_rules,
        bundle.unit_rules,
        bundle.forbidden_rules,
        bundle.similar_drugs,
    )
    templates = sort_by_risk(templates)

    batch_id = f"CHK_{timestamp}"
    result = CheckResult(templates=templates, batch_id=batch_id, timestamp=timestamp)

    report_text = generate_it_report(result)

    if output:
        os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
        with open(output, "w", encoding="utf-8") as f:
            f.write(report_text)
        console.print(f"[green]报告已写入: {output}[/green]")
    else:
        console.print(report_text)

    _print_summary_table(result)

    if result.error_count > 0:
        sys.exit(2)
    elif result.warning_count > 0:
        sys.exit(1)


@main.command()
@click.option("--format", "fmt", type=click.Choice(["csv", "json"]), default="csv", help="导出格式")
@click.option("--output", "-o", required=True, help="导出文件路径")
@click.option("--type", "export_type", type=click.Choice(["clinical", "exception"]), default="exception", help="导出类型: clinical=临床科室确认, exception=业务例外确认")
@click.pass_context
def export(ctx, fmt, output, export_type):
    """导出检查结果供临床科室确认"""
    rules_dir = ctx.obj["rules_dir"]
    template_dir = ctx.obj["template_dir"]

    bundle, templates, timestamp = load_all(rules_dir, template_dir)
    run_checks(
        templates,
        bundle.variable_rules,
        bundle.unit_rules,
        bundle.forbidden_rules,
        bundle.similar_drugs,
    )
    templates = sort_by_risk(templates)

    batch_id = f"EXP_{timestamp}"
    result = CheckResult(templates=templates, batch_id=batch_id, timestamp=timestamp)

    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)

    if export_type == "exception":
        path = export_exception_csv(result, output)
        console.print(f"[green]业务例外确认表已导出: {path}[/green]")
    else:
        path = export_clinical_csv(result, output)
        console.print(f"[green]临床科室确认表已导出: {path}[/green]")


@main.command()
@click.option("--batch-dir", default="batches", help="上线批次记录目录")
@click.option("--report-output", default=None, help="信息科报告输出路径")
@click.pass_context
def batch(ctx, batch_dir, report_output):
    """批量运行模板检查，记录上线批次"""
    rules_dir = ctx.obj["rules_dir"]
    template_dir = ctx.obj["template_dir"]

    if not os.path.isdir(template_dir):
        console.print(f"[red]错误: 模板目录不存在: {template_dir}[/red]")
        sys.exit(1)

    bundle, templates, timestamp = load_all(rules_dir, template_dir)
    run_checks(
        templates,
        bundle.variable_rules,
        bundle.unit_rules,
        bundle.forbidden_rules,
        bundle.similar_drugs,
    )
    templates = sort_by_risk(templates)

    batch_id = f"BATCH_{timestamp}"
    result = CheckResult(templates=templates, batch_id=batch_id, timestamp=timestamp)

    record_path = record_batch(result, batch_dir)
    console.print(f"[green]批次记录已保存: {record_path}[/green]")

    report_text = generate_it_report(result)
    if report_output:
        os.makedirs(os.path.dirname(report_output) or ".", exist_ok=True)
        with open(report_output, "w", encoding="utf-8") as f:
            f.write(report_text)
        console.print(f"[green]信息科报告已写入: {report_output}[/green]")
    else:
        report_path = os.path.join(batch_dir, f"report_{batch_id}.txt")
        os.makedirs(batch_dir, exist_ok=True)
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report_text)
        console.print(f"[green]信息科报告已写入: {report_path}[/green]")

    exception_path = os.path.join(batch_dir, f"exception_{batch_id}.csv")
    export_exception_csv(result, exception_path)
    console.print(f"[green]业务例外确认表已导出: {exception_path}[/green]")

    _print_summary_table(result)

    if result.error_count > 0:
        console.print(f"\n[red bold]⚠ 发现 {result.error_count} 个错误，建议修复后再上线！[/red bold]")
        sys.exit(2)


def _print_summary_table(result: CheckResult) -> None:
    table = Table(title="\n检查摘要", show_lines=True)
    table.add_column("指标", style="bold")
    table.add_column("数值", justify="right")

    table.add_row("总模板数", str(len(result.templates)))
    table.add_row("在用模板", str(len(result.active_templates)))
    table.add_row("停用模板(参考)", str(len(result.reference_templates)))
    table.add_row("问题总数", str(result.total_issues), style="red" if result.total_issues else "green")
    table.add_row("错误", str(result.error_count), style="red bold" if result.error_count else "green")
    table.add_row("警告", str(result.warning_count), style="yellow" if result.warning_count else "green")

    high_risk = [t for t in result.active_templates if t.risk_score >= 15]
    if high_risk:
        table.add_row("高风险模板(≥15分)", str(len(high_risk)), style="red bold")

    console.print(table)


if __name__ == "__main__":
    main()
