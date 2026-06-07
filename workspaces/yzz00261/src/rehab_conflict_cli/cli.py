"""CLI 命令入口"""
import click
import os
import sys
import json
from typing import Dict, Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from rehab_conflict_cli.models import ConfigParams, ProcessResult, DiffRecord, BatchSummary
from rehab_conflict_cli.utils import (
    load_ledger, load_params, load_previous_results,
    filter_records, save_csv, save_json, generate_batch_id,
    now_str, ensure_dir
)
from rehab_conflict_cli.core import (
    ConflictDetector, IdempotencyManager, build_summary
)


def _get_default_output_dir():
    """获取默认输出目录"""
    return os.path.join(os.getcwd(), "output")


@click.group()
@click.version_option(version="1.0.0", prog_name="rehab-conflict-cli")
def cli():
    """康复治疗预约冲突检测 CLI 工具"""
    pass


@cli.command()
@click.option("--ledger", "-l", required=True, help="业务台账 CSV 文件路径")
@click.option("--params", "-p", required=True, help="参数配置 JSON 文件路径")
@click.option("--filters", "-f", default=None, help="筛选条件 JSON 字符串")
@click.option("--output", "-o", default=None, help="输出目录")
@click.option("--batch-id", default=None, help="批次号（自动生成可不填）")
def validate(ledger, params, filters, output, batch_id):
    """校验命令：仅做数据校验，不输出冲突结果"""
    output_dir = output or _get_default_output_dir()
    ensure_dir(output_dir)

    click.echo(f"📋 加载业务台账: {ledger}")
    records = load_ledger(ledger)
    click.echo(f"   共加载 {len(records)} 条记录")

    click.echo(f"⚙️  加载参数配置: {params}")
    config = load_params(params)
    if batch_id:
        config.batch_id = batch_id
    click.echo(f"   批次号: {config.batch_id}")

    if filters:
        filter_dict = json.loads(filters)
        records = filter_records(records, filter_dict)
        click.echo(f"   筛选后: {len(records)} 条")

    click.echo(f"🔍 开始数据校验...")

    from rehab_conflict_cli.utils import validate_record
    valid_count = 0
    bad_rows = []
    logs = []

    for record in records:
        is_valid, error_msg = validate_record(record)
        if is_valid:
            valid_count += 1
            logs.append({
                "timestamp": now_str(),
                "level": "INFO",
                "batch_id": config.batch_id,
                "action": "校验通过",
                "message": f"记录 {record.source_id} 校验通过",
                "details": ""
            })
        else:
            bad_rows.append({
                "source_id": record.source_id,
                "patient_id": record.patient_id,
                "patient_name": record.patient_name,
                "error_message": error_msg,
                "batch_id": config.batch_id,
                "source_system": record.source_system
            })
            logs.append({
                "timestamp": now_str(),
                "level": "WARN",
                "batch_id": config.batch_id,
                "action": "校验失败",
                "message": f"记录 {record.source_id} 校验失败",
                "details": error_msg
            })

    summary = {
        "batch_id": config.batch_id,
        "total_count": len(records),
        "valid_count": valid_count,
        "failed_count": len(bad_rows),
        "operator": config.operator,
        "processed_at": now_str()
    }

    click.echo(f"\n📊 校验结果汇总:")
    click.echo(f"   总记录数: {summary['total_count']}")
    click.echo(f"   有效记录: {summary['valid_count']}")
    click.echo(f"   失败记录: {summary['failed_count']}")

    bad_rows_path = os.path.join(output_dir, f"bad_rows_{config.batch_id}.csv")
    logs_path = os.path.join(output_dir, f"logs_{config.batch_id}.csv")
    summary_path = os.path.join(output_dir, f"summary_{config.batch_id}.json")

    save_csv(bad_rows_path, bad_rows, [
        "source_id", "patient_id", "patient_name",
        "error_message", "batch_id", "source_system"
    ])
    save_csv(logs_path, logs, [
        "timestamp", "level", "batch_id", "action", "message", "details"
    ])
    save_json(summary_path, summary)

    click.echo(f"\n💾 输出文件:")
    click.echo(f"   坏行文件: {bad_rows_path}")
    click.echo(f"   操作日志: {logs_path}")
    click.echo(f"   汇总信息: {summary_path}")


@cli.command()
@click.option("--ledger", "-l", required=True, help="业务台账 CSV 文件路径")
@click.option("--params", "-p", required=True, help="参数配置 JSON 文件路径")
@click.option("--previous", "-r", default=None, help="上次结果 CSV 文件路径")
@click.option("--filters", "-f", default=None, help="筛选条件 JSON 字符串")
@click.option("--output", "-o", default=None, help="输出目录")
@click.option("--batch-id", default=None, help="批次号（自动生成可不填）")
def generate(ledger, params, previous, filters, output, batch_id):
    """生成命令：执行完整冲突检测，输出结果、坏行、差异和日志"""
    output_dir = output or _get_default_output_dir()
    ensure_dir(output_dir)

    click.echo(f"📋 加载业务台账: {ledger}")
    records = load_ledger(ledger)
    click.echo(f"   共加载 {len(records)} 条记录")

    click.echo(f"⚙️  加载参数配置: {params}")
    config = load_params(params)
    if batch_id:
        config.batch_id = batch_id
    click.echo(f"   批次号: {config.batch_id}")

    if filters:
        filter_dict = json.loads(filters)
        records = filter_records(records, filter_dict)
        click.echo(f"   筛选后: {len(records)} 条")

    prev_results = {}
    if previous:
        click.echo(f"📂 加载上次结果: {previous}")
        prev_results = load_previous_results(previous)
        click.echo(f"   上次结果: {len(prev_results)} 条")

    click.echo(f"🔍 开始冲突检测...")
    detector = ConflictDetector(config)
    results = detector.detect_conflicts(records)

    all_logs = detector.logs

    diffs = []
    final_results = results
    if prev_results:
        click.echo(f"🔄 幂等性校验与差异比对...")
        idempotent = IdempotencyManager(prev_results, config.batch_id)
        diffs, final_results = idempotent.compare(results)
        all_logs.extend(idempotent.logs)

    click.echo(f"📊 构建批次汇总...")
    summary = build_summary(final_results, config.batch_id, config.operator)

    success_results = [r for r in final_results if r.status in ("success", "conflict")]
    bad_results = [r for r in final_results if r.status == "failed"]

    click.echo(f"\n📊 处理结果汇总:")
    click.echo(f"   总记录数: {summary.total_count}")
    click.echo(f"   成功数: {summary.success_count}")
    click.echo(f"   冲突数: {summary.conflict_count}")
    click.echo(f"   失败数: {summary.failed_count}")
    click.echo(f"   高风险: {summary.high_risk_count}")
    click.echo(f"   中风险: {summary.medium_risk_count}")
    click.echo(f"   低风险: {summary.low_risk_count}")

    if prev_results:
        click.echo(f"   差异数: {len(diffs)}")

    success_path = os.path.join(output_dir, f"success_{config.batch_id}.csv")
    bad_path = os.path.join(output_dir, f"bad_rows_{config.batch_id}.csv")
    diff_path = os.path.join(output_dir, f"diff_{config.batch_id}.csv")
    logs_path = os.path.join(output_dir, f"logs_{config.batch_id}.csv")
    summary_path = os.path.join(output_dir, f"summary_{config.batch_id}.json")

    success_rows = []
    for r in success_results:
        success_rows.append({
            "source_id": r.source_id,
            "row_hash": r.row_hash,
            "status": r.status,
            "risk_label": r.risk_label,
            "conflict_with": "|".join(r.conflict_with),
            "batch_id": r.batch_id,
            "processed_at": r.processed_at
        })

    bad_rows = []
    ledger_map = {r.source_id: r for r in records}
    for r in bad_results:
        rec = ledger_map.get(r.source_id)
        bad_rows.append({
            "source_id": r.source_id,
            "patient_id": rec.patient_id if rec else "",
            "patient_name": rec.patient_name if rec else "",
            "error_message": r.error_message,
            "batch_id": r.batch_id,
            "source_system": rec.source_system if rec else ""
        })

    diff_rows = [d.to_dict() for d in diffs]

    log_rows = [log.to_dict() for log in all_logs]

    save_csv(success_path, success_rows, [
        "source_id", "row_hash", "status", "risk_label",
        "conflict_with", "batch_id", "processed_at"
    ])
    save_csv(bad_path, bad_rows, [
        "source_id", "patient_id", "patient_name",
        "error_message", "batch_id", "source_system"
    ])
    if diffs:
        save_csv(diff_path, diff_rows, [
            "source_id", "diff_type", "field_name",
            "old_value", "new_value", "batch_id"
        ])
    save_csv(logs_path, log_rows, [
        "timestamp", "level", "batch_id", "action", "message", "details"
    ])
    save_json(summary_path, summary.to_dict())

    click.echo(f"\n💾 输出文件:")
    click.echo(f"   成功结果: {success_path}")
    click.echo(f"   坏行文件: {bad_path}")
    if diffs:
        click.echo(f"   差异表: {diff_path}")
    click.echo(f"   操作日志: {logs_path}")
    click.echo(f"   汇总信息: {summary_path}")


@cli.command()
@click.option("--results", "-r", required=True, help="成功结果 CSV 文件路径")
@click.option("--bad-rows", "-b", default=None, help="坏行文件 CSV 路径")
@click.option("--diffs", "-d", default=None, help="差异表 CSV 路径")
@click.option("--format", "-f", "fmt", default="json",
              type=click.Choice(["json", "csv", "excel"]), help="导出格式")
@click.option("--output", "-o", default=None, help="输出文件路径")
def export(results, bad_rows, diffs, fmt, output):
    """导出命令：将结果导出为指定格式"""
    import csv as csv_module

    click.echo(f"📂 读取成功结果: {results}")

    all_data = {}
    success_data = []
    with open(results, "r", encoding="utf-8-sig") as f:
        reader = csv_module.DictReader(f)
        success_data = list(reader)
    all_data["success"] = success_data
    click.echo(f"   成功记录: {len(success_data)} 条")

    if bad_rows:
        click.echo(f"📂 读取坏行文件: {bad_rows}")
        bad_data = []
        with open(bad_rows, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            bad_data = list(reader)
        all_data["bad_rows"] = bad_data
        click.echo(f"   坏行记录: {len(bad_data)} 条")

    if diffs:
        click.echo(f"📂 读取差异表: {diffs}")
        diff_data = []
        with open(diffs, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            diff_data = list(reader)
        all_data["diffs"] = diff_data
        click.echo(f"   差异记录: {len(diff_data)} 条")

    if fmt == "json":
        output_path = output or "export_result.json"
        save_json(output_path, all_data)
        click.echo(f"💾 已导出为 JSON: {output_path}")
    elif fmt == "csv":
        output_dir = output or "export_csv"
        ensure_dir(output_dir)
        for key, data in all_data.items():
            if not data:
                continue
            file_path = os.path.join(output_dir, f"{key}.csv")
            save_csv(file_path, data, list(data[0].keys()))
        click.echo(f"💾 已导出 CSV 文件到: {output_dir}")
    elif fmt == "excel":
        try:
            import pandas as pd
        except ImportError:
            click.echo("❌ 请安装 pandas 以支持 Excel 导出: pip install pandas openpyxl")
            return

        output_path = output or "export_result.xlsx"
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            for key, data in all_data.items():
                if data:
                    df = pd.DataFrame(data)
                    df.to_excel(writer, sheet_name=key, index=False)
        click.echo(f"💾 已导出为 Excel: {output_path}")


@cli.command()
@click.option("--summary", "-s", default=None, help="汇总 JSON 文件路径")
@click.option("--results", "-r", default=None, help="成功结果 CSV 文件路径")
@click.option("--bad-rows", "-b", default=None, help="坏行文件 CSV 路径")
@click.option("--diffs", "-d", default=None, help="差异表 CSV 路径")
@click.option("--logs", "-l", default=None, help="操作日志 CSV 路径")
def summary(summary, results, bad_rows, diffs, logs):
    """摘要命令：查看处理结果摘要"""
    import csv as csv_module

    click.echo("\n" + "=" * 60)
    click.echo("📊 康复治疗预约冲突检测 - 结果摘要")
    click.echo("=" * 60)

    if summary and os.path.exists(summary):
        with open(summary, "r", encoding="utf-8") as f:
            sum_data = json.load(f)
        click.echo(f"\n📦 批次信息:")
        click.echo(f"   批次号: {sum_data.get('batch_id', 'N/A')}")
        click.echo(f"   操作人: {sum_data.get('operator', 'N/A')}")
        click.echo(f"   处理时间: {sum_data.get('processed_at', 'N/A')}")
        click.echo(f"\n📈 数量统计:")
        click.echo(f"   总记录数: {sum_data.get('total_count', 0)}")
        click.echo(f"   成功数: {sum_data.get('success_count', 0)}")
        if "conflict_count" in sum_data:
            click.echo(f"   冲突数: {sum_data.get('conflict_count', 0)}")
        click.echo(f"   失败数: {sum_data.get('failed_count', 0)}")
        click.echo(f"\n⚠️  风险分布:")
        click.echo(f"   🔴 高风险: {sum_data.get('high_risk_count', 0)}")
        click.echo(f"   🟡 中风险: {sum_data.get('medium_risk_count', 0)}")
        click.echo(f"   🟢 低风险: {sum_data.get('low_risk_count', 0)}")

    if results and os.path.exists(results):
        with open(results, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            rows = list(reader)
        click.echo(f"\n✅ 成功结果明细 ({len(rows)} 条):")
        if rows:
            click.echo(f"   {'source_id':<12} {'状态':<10} {'风险标签':<8} {'冲突数':<6}")
            click.echo(f"   {'-'*12} {'-'*10} {'-'*8} {'-'*6}")
            for row in rows[:10]:
                conflict_count = len([c for c in row.get('conflict_with', '').split('|') if c])
                status_display = "冲突" if row.get('status') == 'conflict' else "正常"
                click.echo(f"   {row.get('source_id', ''):<12} {status_display:<10} {row.get('risk_label', ''):<8} {conflict_count:<6}")
            if len(rows) > 10:
                click.echo(f"   ... 还有 {len(rows) - 10} 条")

    if bad_rows and os.path.exists(bad_rows):
        with open(bad_rows, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            rows = list(reader)
        click.echo(f"\n❌ 坏行记录 ({len(rows)} 条):")
        if rows:
            click.echo(f"   {'source_id':<12} {'错误信息'}")
            click.echo(f"   {'-'*12} {'-'*40}")
            for row in rows[:5]:
                click.echo(f"   {row.get('source_id', ''):<12} {row.get('error_message', '')}")
            if len(rows) > 5:
                click.echo(f"   ... 还有 {len(rows) - 5} 条")

    if diffs and os.path.exists(diffs):
        with open(diffs, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            rows = list(reader)
        click.echo(f"\n🔄 差异记录 ({len(rows)} 条):")
        if rows:
            click.echo(f"   {'source_id':<12} {'类型':<6} {'字段':<16}")
            click.echo(f"   {'-'*12} {'-'*6} {'-'*16}")
            for row in rows[:10]:
                click.echo(f"   {row.get('source_id', ''):<12} {row.get('diff_type', ''):<6} {row.get('field_name', ''):<16}")
            if len(rows) > 10:
                click.echo(f"   ... 还有 {len(rows) - 10} 条")

    if logs and os.path.exists(logs):
        with open(logs, "r", encoding="utf-8-sig") as f:
            reader = csv_module.DictReader(f)
            rows = list(reader)
        click.echo(f"\n📝 操作日志 ({len(rows)} 条):")
        if rows:
            click.echo(f"   {'时间':<20} {'级别':<6} {'动作':<12} {'消息'}")
            click.echo(f"   {'-'*20} {'-'*6} {'-'*12} {'-'*30}")
            for row in rows[-10:]:
                msg = row.get('message', '')[:30]
                click.echo(f"   {row.get('timestamp', ''):<20} {row.get('level', ''):<6} {row.get('action', ''):<12} {msg}")
            if len(rows) > 10:
                click.echo(f"   ... 还有 {len(rows) - 10} 条")

    click.echo("\n" + "=" * 60)


if __name__ == "__main__":
    cli()
