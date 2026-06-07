"""处理流水线编排。

串联读取 -> 校验 -> 导出 -> 日志 全流程。
"""
import os
from typing import List

from .config import (
    ProcessContext,
    TaskStatus,
    RiskLevel,
    ExportFormat,
)
from .models import ProcessResult
from .reader import (
    read_source_files,
    read_field_mapping,
    read_banned_list,
    filter_by_date,
)
from .checker import BannedChecker, build_diff_records, summarize_risks
from .exporter import ResultExporter
from .logger import OperationLogger, log_result_summary


class ValidationError(Exception):
    """参数校验错误。"""
    pass


def validate_params(
    source_files: List[str],
    banned_file: str,
    output_dir: str,
    start_date: str = None,
    end_date: str = None,
    fmt: str = "csv",
) -> List[str]:
    """校验输入参数，返回错误列表。"""
    errors = []

    if not source_files:
        errors.append("请至少指定一个原始文件")
    else:
        for f in source_files:
            if not os.path.exists(f):
                errors.append(f"原始文件不存在: {f}")
            ext = os.path.splitext(f)[1].lower()
            if ext not in (".csv", ".xlsx", ".xls", ".json"):
                errors.append(f"不支持的文件格式: {f}")

    if banned_file:
        if not os.path.exists(banned_file):
            errors.append(f"禁用料清单不存在: {banned_file}")
    else:
        errors.append("请指定禁用料清单文件")

    if fmt not in ("csv", "excel", "json"):
        errors.append(f"不支持的导出格式: {fmt}")

    if start_date:
        if not _is_valid_date(start_date):
            errors.append(f"开始日期格式不正确: {start_date}")

    if end_date:
        if not _is_valid_date(end_date):
            errors.append(f"结束日期格式不正确: {end_date}")

    if start_date and end_date:
        from datetime import datetime
        if datetime.strptime(start_date, "%Y-%m-%d") > datetime.strptime(end_date, "%Y-%m-%d"):
            errors.append("开始日期不能晚于结束日期")

    return errors


def _is_valid_date(date_str: str) -> bool:
    from datetime import datetime
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def run_pipeline(
    source_files: List[str],
    banned_file: str,
    output_dir: str,
    mapping_file: str = None,
    start_date: str = None,
    end_date: str = None,
    fmt: str = "csv",
    dry_run: bool = False,
    batch_id: str = None,
) -> ProcessResult:
    """运行完整处理流水线。"""
    export_fmt = ExportFormat(fmt)

    ctx = ProcessContext(
        source_files=source_files,
        start_date=start_date,
        end_date=end_date,
        export_format=export_fmt,
        dry_run=dry_run,
        task_status=TaskStatus.RUNNING,
    )
    if batch_id:
        ctx.batch_id = batch_id

    log_dir = os.path.join(output_dir, "logs")
    logger = OperationLogger(log_dir, ctx)
    logger.info("任务启动", f"dry_run={dry_run}, 格式={fmt}")

    result = ProcessResult(
        batch_id=ctx.batch_id,
        source_files=[os.path.basename(f) for f in source_files],
        task_status=TaskStatus.RUNNING,
    )

    try:
        logger.info("读取字段映射", mapping_file or "使用默认映射")
        field_mapping = read_field_mapping(mapping_file)
        ctx.field_mapping = field_mapping

        logger.info("读取禁用料清单", banned_file)
        banned_list = read_banned_list(banned_file)
        logger.info("禁用料清单加载完成", f"共 {len(banned_list)} 条")

        logger.info("读取原始文件", f"共 {len(source_files)} 个文件")
        formula_rows, bad_rows = read_source_files(source_files, field_mapping, ctx)
        result.formula_rows = formula_rows
        result.bad_rows_list = bad_rows
        ctx.total_rows = len(formula_rows) + len(bad_rows)
        ctx.valid_rows = len(formula_rows)
        ctx.bad_rows = len(bad_rows)
        result.total_rows = ctx.total_rows
        result.valid_rows = ctx.valid_rows
        result.bad_rows = ctx.bad_rows

        logger.info("文件读取完成", f"有效行 {len(formula_rows)}, 坏行 {len(bad_rows)}")

        if start_date or end_date:
            logger.info("按日期范围过滤", f"{start_date or '开始'} ~ {end_date or '结束'}")
            before = len(formula_rows)
            formula_rows = filter_by_date(formula_rows, start_date, end_date)
            after = len(formula_rows)
            logger.info("日期过滤完成", f"过滤掉 {before - after} 行，剩余 {after} 行")
            result.formula_rows = formula_rows

        logger.info("开始禁用料校验")
        checker = BannedChecker(banned_list, ctx)
        check_results = checker.check_all(formula_rows)
        result.check_results = check_results

        banned_count = sum(1 for cr in check_results if cr.is_banned)
        ctx.banned_found = banned_count
        result.banned_count = banned_count
        logger.info("禁用料校验完成", f"命中 {banned_count} 条")

        risk_counts = summarize_risks(check_results)
        result.high_risk_count = risk_counts.get(RiskLevel.HIGH.value, 0)
        result.medium_risk_count = risk_counts.get(RiskLevel.MEDIUM.value, 0)
        result.low_risk_count = risk_counts.get(RiskLevel.LOW.value, 0)
        result.unknown_risk_count = risk_counts.get(RiskLevel.UNKNOWN.value, 0)

        logger.info("生成差异表")
        diff_records = build_diff_records(check_results, ctx)
        result.diff_records = diff_records
        logger.info("差异表生成完成", f"共 {len(diff_records)} 条差异记录")

        result.errors = ctx.errors
        result.warnings = ctx.warnings

        if ctx.errors and ctx.valid_rows == 0:
            result.task_status = TaskStatus.FAILED
        elif ctx.errors:
            result.task_status = TaskStatus.PARTIAL
        else:
            result.task_status = TaskStatus.SUCCESS
        ctx.task_status = result.task_status

        if dry_run:
            logger.info("dry-run模式", "仅预览，不生成导出文件")
        else:
            logger.info("开始导出结果")
            exporter = ResultExporter(output_dir, export_fmt, ctx)
            output_files = exporter.export_all(result)
            result.output_files = output_files
            logger.info("导出完成", f"共 {len(output_files)} 个文件")
        log_result_summary(logger, result)

        if not dry_run:
            log_path = logger.save()
            result.log_file = log_path

    except Exception as e:
        result.task_status = TaskStatus.FAILED
        ctx.task_status = TaskStatus.FAILED
        result.errors.append(f"处理异常: {str(e)}")
        logger.error("处理失败", str(e))
        if not dry_run:
            log_path = logger.save()
            result.log_file = log_path
        raise

    return result
