import os
import sys
from datetime import date, datetime
from typing import List, Optional, Tuple

import click

from .models import (
    BatchInfo,
    RecordStatus,
    DiffType,
)
from .loader import load_records, load_field_mapping
from .validator import (
    validate_batch,
    get_valid_records,
    get_invalid_records,
    get_review_records,
)
from .generator import (
    ScheduleStore,
    idempotent_generate,
    import_all_records,
)
from .exporter import (
    export_schedules,
    export_bad_records,
    export_diff_table,
    export_operation_log,
    export_review_pending,
)
from .reviewer import ReviewManager


def _parse_date_range(start_date: str, end_date: str) -> Optional[Tuple[date, date]]:
    if not start_date and not end_date:
        return None
    try:
        sd = date.fromisoformat(start_date) if start_date else date.min
        ed = date.fromisoformat(end_date) if end_date else date.max
        return (sd, ed)
    except ValueError:
        raise click.BadParameter("日期格式不正确，请使用 YYYY-MM-DD 格式")


def _get_store(output_dir: str) -> ScheduleStore:
    store_dir = os.path.join(output_dir, ".store")
    return ScheduleStore(store_dir)


@click.group()
@click.version_option(version="1.0.0", prog_name="gym-scheduler")
def cli():
    """健身房私教课排期CLI工具"""
    pass


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.option("--mapping", "-m", type=click.Path(exists=True), help="字段映射JSON文件")
@click.option("--start-date", type=str, default="", help="日期范围起始 (YYYY-MM-DD)")
@click.option("--end-date", type=str, default="", help="日期范围结束 (YYYY-MM-DD)")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--operator", default="system", help="操作人")
def validate(files, mapping, start_date, end_date, output_dir, operator):
    """校验原始数据，输出校验结果和坏行文件。

    FILES: 一个或多个原始数据文件 (CSV/Excel)
    """
    date_range = _parse_date_range(start_date, end_date)
    field_mapping = load_field_mapping(mapping)

    click.echo("=" * 60)
    click.echo("📋 数据校验")
    click.echo("=" * 60)
    click.echo(f"输入文件: {len(files)} 个")
    for f in files:
        click.echo(f"  - {f}")
    click.echo(f"输出目录: {output_dir}")
    if date_range:
        click.echo(f"日期范围: {date_range[0]} ~ {date_range[1]}")
    click.echo("")

    batch = BatchInfo.create(list(files), operator=operator, remark="validate")

    records = load_records(
        list(files),
        field_mapping,
        date_range,
        batch.batch_id,
    )
    click.echo(f"共加载 {len(records)} 条记录")
    click.echo("")

    result = validate_batch(records)

    click.echo("📊 校验结果:")
    click.echo(f"  总计: {result.total_count}")
    click.echo(f"  ✅ 有效: {result.valid_count}")
    click.echo(f"  ❌ 无效: {result.invalid_count}")
    click.echo(f"  ⚠️  待复核: {result.review_count}")
    click.echo("")

    invalid_records = get_invalid_records(records)
    review_records = get_review_records(records)

    if invalid_records:
        click.echo("❌ 无效记录详情 (前5条):")
        for r in invalid_records[:5]:
            click.echo(f"  [{r.source_file}:{r.source_row}] {r.member_name} - {'; '.join(r.errors)}")
        if len(invalid_records) > 5:
            click.echo(f"  ... 共 {len(invalid_records)} 条无效记录")
        click.echo("")

    if review_records:
        click.echo("⚠️  待复核记录 (前5条):")
        for r in review_records[:5]:
            click.echo(f"  [{r.source_file}:{r.source_row}] {r.member_name} - {r.course_name}")
        if len(review_records) > 5:
            click.echo(f"  ... 共 {len(review_records)} 条待复核记录")
        click.echo("")

    bad_file = export_bad_records(invalid_records, output_dir)
    click.echo(f"📁 坏行文件已导出: {bad_file}")

    review_file = export_review_pending(review_records, output_dir)
    click.echo(f"📁 待复核文件已导出: {review_file}")

    log_file = export_operation_log(batch, result, {}, output_dir)
    click.echo(f"📁 操作日志已导出: {log_file}")

    click.echo("")
    click.echo("✅ 校验完成")


@cli.command()
@click.argument("files", nargs=-1, required=True)
@click.option("--mapping", "-m", type=click.Path(exists=True), help="字段映射JSON文件")
@click.option("--start-date", type=str, default="", help="日期范围起始 (YYYY-MM-DD)")
@click.option("--end-date", type=str, default="", help="日期范围结束 (YYYY-MM-DD)")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--format", "-f", "format_type", type=click.Choice(["csv", "json", "excel"]), default="csv", help="导出格式")
@click.option("--operator", default="system", help="操作人")
@click.option("--remark", default="", help="批次备注")
@click.option("--skip-review", is_flag=True, help="跳过待复核记录，直接生成排期")
def generate(files, mapping, start_date, end_date, output_dir, format_type, operator, remark, skip_review):
    """生成排期，幂等执行，重复提交无新增数据不会产生差异。

    FILES: 一个或多个原始数据文件 (CSV/Excel)
    """
    date_range = _parse_date_range(start_date, end_date)
    field_mapping = load_field_mapping(mapping)

    click.echo("=" * 60)
    click.echo("🏋️ 排期生成")
    click.echo("=" * 60)
    click.echo(f"输入文件: {len(files)} 个")
    for f in files:
        click.echo(f"  - {f}")
    click.echo(f"输出目录: {output_dir}")
    click.echo(f"导出格式: {format_type}")
    if date_range:
        click.echo(f"日期范围: {date_range[0]} ~ {date_range[1]}")
    click.echo("")

    batch = BatchInfo.create(list(files), operator=operator, remark=remark or "generate")

    records = load_records(list(files), field_mapping, date_range, batch.batch_id)
    click.echo(f"📥 共加载 {len(records)} 条记录")

    validation_result = validate_batch(records)
    click.echo(f"  ✅ 有效: {validation_result.valid_count}")
    click.echo(f"  ❌ 无效: {validation_result.invalid_count}")
    click.echo(f"  ⚠️  待复核: {validation_result.review_count}")
    click.echo("")

    invalid_records = get_invalid_records(records)
    review_records = get_review_records(records)

    if skip_review:
        valid_for_generate = get_valid_records(records) + review_records
        click.echo(f"⚡ 跳过复核模式: 跳过 {len(review_records)} 条待复核记录将直接生成排期")
    else:
        valid_for_generate = get_valid_records(records)
        click.echo(f"📌 将使用 {len(valid_for_generate)} 条有效记录生成排期")
    click.echo("")

    store = _get_store(output_dir)
    diffs, diff_summary = idempotent_generate(valid_for_generate, store, batch.batch_id)
    import_all_records(records, store, batch.batch_id)

    click.echo("🔄 差异对比结果:")
    click.echo(f"  🆕 新增: {diff_summary.get('new', 0)}")
    click.echo(f"  ✏️  更新: {diff_summary.get('updated', 0)}")
    click.echo(f"  ➡️  无变化: {diff_summary.get('unchanged', 0)}")
    click.echo(f"  🗑️  删除: {diff_summary.get('deleted', 0)}")
    click.echo("")

    new_diffs = [d for d in diffs if d.diff_type == DiffType.NEW]
    updated_diffs = [d for d in diffs if d.diff_type == DiffType.UPDATED]

    if new_diffs:
        click.echo("🆕 新增记录 (前5条):")
        for d in new_diffs[:5]:
            r = d.record
            click.echo(f"  [{r.source_file}:{r.source_row}] {r.member_name} - {r.course_name} @ {r.course_date} {r.course_time}")
        if len(new_diffs) > 5:
            click.echo(f"  ... 共 {len(new_diffs)} 条新增")
        click.echo("")

    if updated_diffs:
        click.echo("✏️  更新记录 (前5条):")
        for d in updated_diffs[:5]:
            r = d.record
            click.echo(f"  [{r.source_file}:{r.source_row}] {r.member_name} - 变更字段: {', '.join(d.changed_fields)}")
        if len(updated_diffs) > 5:
            click.echo(f"  ... 共 {len(updated_diffs)} 条更新")
        click.echo("")

    bad_file = export_bad_records(invalid_records, output_dir)
    diff_file = export_diff_table(diffs, output_dir, format_type)

    scheduled_records = [d.record for d in diffs if d.diff_type in (DiffType.NEW, DiffType.UPDATED, DiffType.UNCHANGED)
    ]
    schedule_file = export_schedules(scheduled_records, output_dir, format_type, prefix="schedules")

    log_file = export_operation_log(batch, validation_result, diff_summary, output_dir)
    store.append_batch_log(batch, {
        "validation": validation_result.to_dict(),
        "diff_summary": diff_summary,
    })

    click.echo("📁 输出文件:")
    click.echo(f"  成功结果: {schedule_file}")
    click.echo(f"  坏行文件: {bad_file}")
    click.echo(f"  差异表: {diff_file}")
    click.echo(f"  操作日志: {log_file}")
    click.echo("")
    click.echo(f"🎯 批次号: {batch.batch_id}")
    click.echo("✅ 排期生成完成")


@cli.command()
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--format", "-f", "format_type", type=click.Choice(["csv", "json", "excel"]), default="csv", help="导出格式")
@click.option("--status", "-s", type=str, default="all", help="按状态筛选 (all/valid/scheduled/exported/review/invalid")
@click.option("--batch-id", type=str, default="", help="按批次号筛选")
def export(output_dir, format_type, status, batch_id):
    """导出已生成的排期数据。
    """
    store = _get_store(output_dir)
    all_records = store.load_all()
    records = list(all_records.values())

    if status != "all":
        try:
            filter_status = RecordStatus(status)
            records = [r for r in records if r.status == filter_status]
        except ValueError:
            raise click.BadParameter(f"无效的状态值: {status}")

    if batch_id:
        records = [r for r in records if r.batch_id == batch_id]

    click.echo(f"共 {len(records)} 条记录待导出")
    filepath = export_schedules(records, output_dir, format_type, prefix="export")
    click.echo(f"📁 已导出到: {filepath}")


@cli.command()
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--batch-id", type=str, default="", help="查看指定批次摘要")
@click.option("--all-batches", is_flag=True, help="列出所有历史批次")
def summary(output_dir, batch_id, all_batches):
    """查看处理摘要和批次历史。
    """
    store = _get_store(output_dir)

    if all_batches:
        batches = store.list_batches()
        if not batches:
            click.echo("暂无历史批次")
            return
        click.echo("=" * 80)
        click.echo("📋 历史批次列表")
        click.echo("=" * 80)
        for i, b in enumerate(batches, 1):
            batch_info = b["batch"]
            summary = b.get("summary", {})
            val = summary.get("validation", {})
            diff = summary.get("diff_summary", {})
            click.echo(f"{i}. 批次号: {batch_info['batch_id']}")
            click.echo(f"   时间: {batch_info['batch_time']}")
            click.echo(f"   操作人: {batch_info['operator']}")
            click.echo(f"   源文件: {', '.join(batch_info['source_files'])}")
            if val:
                click.echo(f"   校验: 总计{val.get('total_count', 0)} | 有效{val.get('valid_count', 0)} | 无效{val.get('invalid_count', 0)} | 复核{val.get('review_count', 0)}")
            if diff:
                click.echo(f"   差异: 新增{diff.get('new', 0)} | 更新{diff.get('updated', 0)} | 无变化{diff.get('unchanged', 0)}")
            click.echo("")
        return

    all_records = store.load_all()
    records = list(all_records.values())

    if batch_id:
        records = [r for r in records if r.batch_id == batch_id]
        click.echo(f"批次 {batch_id} 的记录数: {len(records)}")
    else:
        click.echo(f"总记录总数: {len(records)}")
    click.echo("")

    status_counts = {}
    for r in records:
        status_counts[r.status.value] = status_counts.get(r.status.value, 0) + 1

    click.echo("📊 状态统计:")
    for status, count in sorted(status_counts.items()):
        click.echo(f"  {status}: {count}")

    batch_counts = {}
    for r in records:
        batch_counts[r.batch_id] = batch_counts.get(r.batch_id, 0) + 1

    click.echo("")
    click.echo("📦 批次统计 (前10):")
    for bid, count in sorted(batch_counts.items(), key=lambda x: -x[1])[:10]:
        click.echo(f"  {bid}: {count} 条")


@cli.group()
def review():
    """人工复核管理"""
    pass


@review.command("list")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--status", "-s", type=click.Choice(["pending", "invalid", "all"]), default="pending", help="查看类型")
def review_list(output_dir, status):
    """列出待复核/无效记录。
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)

    if status == "pending":
        records = manager.get_pending_review()
        click.echo(f"待复核记录: {len(records)} 条")
    elif status == "invalid":
        records = manager.get_invalid_records()
        click.echo(f"无效记录: {len(records)} 条")
    else:
        all_records = store.load_all()
        records = [r for r in all_records.values() if r.status in (RecordStatus.REVIEW, RecordStatus.INVALID)]
        click.echo(f"待处理记录: {len(records)} 条")

    if not records:
        click.echo("暂无记录")
        return

    click.echo("")
    click.echo("-" * 80)
    for r in records:
        click.echo(f"ID: {r.record_id}")
        click.echo(f"  状态: {r.status.value}")
        click.echo(f"  会员: {r.member_name} ({r.member_phone})")
        click.echo(f"  教练: {r.coach_name}")
        click.echo(f"  课程: {r.course_name}")
        click.echo(f"  时间: {r.course_date} {r.course_time} ({r.duration_minutes}分钟)")
        click.echo(f"  来源: {r.source_file}:{r.source_row}")
        if r.errors:
            click.echo(f"  问题: {'; '.join(r.errors)}")
        if r.review_comment:
            click.echo(f"  复核备注: {r.review_comment}")
        click.echo("")


@review.command("approve")
@click.argument("record_id")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--comment", "-c", default="", help="复核备注")
def review_approve(record_id, output_dir, comment):
    """通过单条复核记录。
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)
    record = manager.approve_review(record_id, comment)
    if not record:
        click.echo(f"❌ 未找到记录或状态不是待复核: {record_id}")
        sys.exit(1)
    click.echo(f"✅ 已通过复核: {record.member_name} - {record.course_name}")


@review.command("reject")
@click.argument("record_id")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--comment", "-c", default="", help="驳回原因")
def review_reject(record_id, output_dir, comment):
    """驳回单条复核记录。
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)
    record = manager.reject_review(record_id, comment)
    if not record:
        click.echo(f"❌ 未找到记录或状态不是待复核: {record_id}")
        sys.exit(1)
    click.echo(f"❌ 已驳回: {record.member_name} - {record.course_name}")
    if comment:
        click.echo(f"   原因: {comment}")


@review.command("approve-all")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--comment", "-c", default="", help="复核备注")
def review_approve_all(output_dir, comment):
    """批量通过所有待复核记录。
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)
    count = manager.approve_all(comment)
    click.echo(f"✅ 已通过 {count} 条复核记录")


@review.command("reject-all")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--comment", "-c", default="", help="驳回原因")
def review_reject_all(output_dir, comment):
    """批量驳回所有待复核记录。
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)
    count = manager.reject_all(comment)
    click.echo(f"❌ 已驳回 {count} 条复核记录")


@review.command("fix")
@click.argument("record_id")
@click.option("--output-dir", "-o", type=click.Path(), default="./output", help="输出目录")
@click.option("--field", "-f", "fields", multiple=True, help="字段更新，格式 field=value，可多次指定")
@click.option("--comment", "-c", default="", help="备注")
def review_fix(record_id, output_dir, fields, comment):
    """修复无效记录并重新校验。

    示例: gym-scheduler review fix abc123 -f course_time=09:00 -f duration_minutes=60
    """
    store = _get_store(output_dir)
    manager = ReviewManager(store)

    updates = {}
    for f in fields:
        if "=" in f:
            key, value = f.split("=", 1)
            updates[key.strip()] = value.strip()

    if not updates:
        click.echo("❌ 请指定要更新的字段，使用 -f field=value 格式")
        sys.exit(1)

    record = manager.fix_invalid(record_id, updates, comment)
    if not record:
        click.echo(f"❌ 未找到记录: {record_id}")
        sys.exit(1)

    click.echo(f"🔧 已更新记录: {record_id}")
    click.echo(f"   新状态: {record.status.value}")
    if record.errors:
        click.echo(f"   问题: {'; '.join(record.errors)}")


if __name__ == "__main__":
    cli()
