import sys
import os
from datetime import date
from pathlib import Path
from typing import Optional

import click

from .readers import read_all_sources
from .merger import RecordMerger, AnomalyDetector
from .statistics import StatisticsAnalyzer
from .exporter import ExcelExporter
from .config import SICK_ALERT_THRESHOLD, DEFAULT_CLASS_NAME


banner = r"""
╔══════════════════════════════════════════════════════════╗
║                学生请假条汇总器  v1.0.0                   ║
║     合并短信 / 请假条 / 缺勤记录，一键生成统计报告         ║
╚══════════════════════════════════════════════════════════╝
"""


def print_banner():
    click.echo(banner)


def run_pipeline(
    sms_path: Optional[str],
    sheet_path: Optional[str],
    absence_path: Optional[str],
    output_dir: str,
    class_name: str,
    reference_date: Optional[date],
    sick_threshold: int,
    verbose: bool,
) -> dict:
    click.echo(f"📚 班级名称: {class_name}")
    click.echo(f"📅 基准日期: {(reference_date or date.today()).strftime('%Y年%m月%d日')}")
    click.echo()

    click.echo("📂 正在读取数据文件...")
    if sms_path:
        click.echo(f"   - 短信摘录: {sms_path}")
    else:
        click.echo("   - 短信摘录: (未提供)")
    if sheet_path:
        click.echo(f"   - 请假表:   {sheet_path}")
    else:
        click.echo("   - 请假表:   (未提供)")
    if absence_path:
        click.echo(f"   - 缺勤表:   {absence_path}")
    else:
        click.echo("   - 缺勤表:   (未提供)")

    all_records = read_all_sources(
        sms_path=sms_path,
        sheet_path=sheet_path,
        absence_path=absence_path,
        class_name=class_name,
        reference_date=reference_date,
    )

    if not all_records:
        click.echo()
        click.echo("⚠️  警告: 没有读取到任何记录，请检查输入文件格式是否正确。")
        return {}

    click.echo()
    click.echo(f"✅ 共读取到 {len(all_records)} 条原始记录")

    sms_count = sum(1 for r in all_records if r.source.value == "短信")
    paper_count = sum(1 for r in all_records if r.source.value == "请假条")
    absence_count = sum(1 for r in all_records if r.source.value == "缺勤记录")
    click.echo(f"   短信: {sms_count}条  |  请假条: {paper_count}条  |  缺勤记录: {absence_count}条")

    click.echo()
    click.echo("🔀 正在合并去重...")
    merger = RecordMerger(all_records)
    merged_records = merger.get_merged_records()
    dup_groups = merger.get_duplicate_groups()
    click.echo(f"✅ 合并完成: {len(merged_records)} 条合并记录 / {len(dup_groups)} 组存在多来源重复")

    click.echo()
    click.echo("🔍 正在检测异常...")
    detector = AnomalyDetector(all_records, merged_records)
    anomalies = detector.detect_all()
    click.echo(f"✅ 检测完成: 共发现 {len(anomalies)} 条异常")

    error_count = sum(1 for a in anomalies if a.severity == "error")
    warning_count = sum(1 for a in anomalies if a.severity == "warning")
    info_count = sum(1 for a in anomalies if a.severity == "info")
    click.echo(f"   ERROR: {error_count}  |  WARNING: {warning_count}  |  INFO: {info_count}")

    click.echo()
    click.echo("📊 正在统计分析...")
    analyzer = StatisticsAnalyzer(merged_records, anomalies, class_name)
    analyzer.print_summary()

    alerts = analyzer.check_sick_alerts(threshold=sick_threshold)
    if alerts:
        click.echo()
        click.echo("🔴 病假异常警报:")
        for alert in alerts:
            click.echo(f"   ⚠️  {alert.message}")

    click.echo()
    click.echo("📋 异常报告摘要:")
    from .models import AnomalyType
    anomaly_counts = {}
    for a in anomalies:
        key = a.anomaly_type.value
        anomaly_counts[key] = anomaly_counts.get(key, 0) + 1
    for key, cnt in anomaly_counts.items():
        click.echo(f"   • {key}: {cnt} 条")

    if verbose and anomalies:
        click.echo()
        click.echo("=" * 60)
        click.echo("详细异常列表:")
        click.echo("-" * 60)
        for i, a in enumerate(anomalies, 1):
            sev_icon = "🔴" if a.severity == "error" else ("🟡" if a.severity == "warning" else "🟢")
            click.echo(f"{i:2d}. {sev_icon} [{a.anomaly_type.value}] {a.description}")
            click.echo(f"    💡 建议: {a.suggestions}")
            students = "、".join(sorted(set(r.student_name for r in a.related_records)))
            click.echo(f"    👤 涉及: {students}")
            click.echo()

    click.echo()
    click.echo("💾 正在导出文件...")
    exporter = ExcelExporter(all_records, merged_records, anomalies, analyzer, class_name)
    exported_files = exporter.export_all(output_dir)

    click.echo()
    click.echo("✅ 导出完成:")
    for key, path in exported_files.items():
        size_kb = Path(path).stat().st_size / 1024
        click.echo(f"   📄 {key:15s} -> {path} ({size_kb:.1f} KB)")

    result = {
        "class_name": class_name,
        "total_records": len(all_records),
        "merged_records": len(merged_records),
        "anomalies": len(anomalies),
        "alerts": len(alerts),
        "files": exported_files,
    }

    click.echo()
    click.echo("🎉 处理完成！")
    if len(anomalies) > 0:
        click.echo(f"   请重点关注【异常报告】中的 {error_count} 条 ERROR 级别问题，及时联系家长确认。")
    if len(alerts) > 0:
        click.echo(f"   【病假警报】请尽快将校医名单发送给校医室，关注传染病风险。")

    return result


@click.group(invoke_without_command=True)
@click.version_option(version="1.0.0", prog_name="学生请假条汇总器")
@click.option("--verbose", "-v", is_flag=True, help="显示详细处理信息")
@click.pass_context
def cli(ctx: click.Context, verbose: bool):
    """
    学生请假条汇总器 - 整合多来源请假数据并生成报告

    使用示例:

      \b
      # 快速汇总（推荐）
      leave-summary process \\
          --sms data/短信摘录.txt \\
          --sheet data/请假表.xlsx \\
          --absence data/缺勤记录.csv \\
          --class 高三1班 \\
          --output ./output

      \b
      # 只查看短信请假（无其他数据源时）
      leave-summary process --sms 短信.txt -o 输出目录

      \b
      # 提高病假警报灵敏度，设置阈值为3人
      leave-summary process ... --sick-threshold 3
    """
    ctx.ensure_object(dict)
    ctx.obj["verbose"] = verbose
    if ctx.invoked_subcommand is None:
        print_banner()
        click.echo(ctx.get_help())


@cli.command("process")
@click.option("--sms", "sms_path", type=click.Path(exists=False, dir_okay=False), help="短信摘录文件 (.txt)")
@click.option("--sheet", "sheet_path", type=click.Path(exists=False, dir_okay=False), help="请假表文件 (.xlsx/.csv/.json)")
@click.option("--absence", "absence_path", type=click.Path(exists=False, dir_okay=False), help="缺勤记录表 (.xlsx/.csv/.json)")
@click.option("--output", "-o", "output_dir", type=click.Path(file_okay=False), default="./output", show_default=True, help="输出目录")
@click.option("--class", "class_name", default=DEFAULT_CLASS_NAME, show_default=True, help="班级名称（用于报告标题和导出文件名）")
@click.option("--date", "date_str", type=str, default=None, help="基准日期 YYYY-MM-DD，默认今天（用于解析'今天''明天'等相对日期）")
@click.option("--sick-threshold", type=int, default=SICK_ALERT_THRESHOLD, show_default=True, help="单日出病假人数阈值，超过即触发警报")
@click.option("--yes", "-y", is_flag=True, help="跳过确认直接执行")
@click.pass_context
def process_cmd(
    ctx: click.Context,
    sms_path: Optional[str],
    sheet_path: Optional[str],
    absence_path: Optional[str],
    output_dir: str,
    class_name: str,
    date_str: Optional[str],
    sick_threshold: int,
    yes: bool,
):
    """处理数据并生成完整报告（主功能）"""
    print_banner()
    verbose = ctx.obj.get("verbose", False)

    if not sms_path and not sheet_path and not absence_path:
        click.echo("❌ 错误: 至少需要提供一个输入文件（--sms / --sheet / --absence）")
        click.echo()
        click.echo("使用 --help 查看完整帮助。")
        sys.exit(1)

    for p, label in [(sms_path, "短信"), (sheet_path, "请假表"), (absence_path, "缺勤表")]:
        if p and not Path(p).exists():
            click.echo(f"❌ 错误: {label}文件不存在: {p}")
            sys.exit(1)

    reference_date = None
    if date_str:
        try:
            reference_date = date.fromisoformat(date_str)
        except ValueError:
            click.echo(f"❌ 错误: 日期格式不正确: {date_str}，请使用 YYYY-MM-DD 格式")
            sys.exit(1)

    if not yes:
        click.echo("请确认以下参数:")
        click.echo(f"  班级: {class_name}")
        click.echo(f"  病假阈值: {sick_threshold}人/天")
        click.echo(f"  输出目录: {output_dir}")
        if sms_path:
            click.echo(f"  短信文件: {sms_path}")
        if sheet_path:
            click.echo(f"  请假表: {sheet_path}")
        if absence_path:
            click.echo(f"  缺勤表: {absence_path}")
        if not click.confirm("\n是否继续执行？", default=True):
            click.echo("已取消。")
            sys.exit(0)

    try:
        result = run_pipeline(
            sms_path=sms_path,
            sheet_path=sheet_path,
            absence_path=absence_path,
            output_dir=output_dir,
            class_name=class_name,
            reference_date=reference_date,
            sick_threshold=sick_threshold,
            verbose=verbose,
        )
    except Exception as e:
        click.echo(f"\n❌ 处理过程中出现错误: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


@cli.command("demo")
@click.option("--output", "-o", "output_dir", type=click.Path(file_okay=False), default="./demo_output", show_default=True, help="演示数据输出目录")
@click.pass_context
def demo_cmd(ctx: click.Context, output_dir: str):
    """生成演示数据并执行完整流程（用于测试）"""
    print_banner()
    verbose = ctx.obj.get("verbose", False)

    from .data import generate_sample_data

    click.echo("🎲 正在生成演示数据...")
    files = generate_sample_data()

    click.echo("✅ 演示数据已生成:")
    for k, v in files.items():
        click.echo(f"   {k}: {v}")
    click.echo()

    click.echo("🚀 开始处理演示数据...")
    try:
        result = run_pipeline(
            sms_path=files["sms"],
            sheet_path=files["sheet"],
            absence_path=files["absence"],
            output_dir=output_dir,
            class_name="高三(3)班",
            reference_date=date(2025, 6, 20),
            sick_threshold=SICK_ALERT_THRESHOLD,
            verbose=verbose,
        )
    except Exception as e:
        click.echo(f"\n❌ 处理过程中出现错误: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def main():
    try:
        cli(standalone_mode=True)
    except KeyboardInterrupt:
        click.echo("\n\n已取消操作。")
        sys.exit(130)


if __name__ == "__main__":
    main()
