#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
煤矿瓦斯巡检 CLI 工具
读取多个原始文件、字段映射、日期范围和导出格式，
输出成功结果、坏行文件、差异表和操作日志。
"""

import os
import sys
import uuid
from datetime import datetime

import click

from .validator import (
    validate_input_files,
    validate_date_range,
    validate_mapping_config,
    validate_export_format,
    validate_output_dir,
    ValidationError,
)
from .reader import FileReader
from .processor import DataProcessor, DiffGenerator
from .exporter import DataExporter
from .logger import OperationLogger


def generate_batch_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    short_uuid = uuid.uuid4().hex[:8]
    return f"GAS_{timestamp}_{short_uuid}"


@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.option(
    "-f", "--files",
    type=click.Path(exists=False),
    multiple=True,
    required=True,
    help="原始数据文件路径，可多次指定（支持 CSV/Excel）",
)
@click.option(
    "-m", "--mapping",
    type=click.Path(exists=False),
    required=True,
    help="字段映射配置文件（JSON格式）",
)
@click.option(
    "-s", "--start-date",
    type=str,
    required=True,
    help="起始日期（YYYY-MM-DD）",
)
@click.option(
    "-e", "--end-date",
    type=str,
    required=True,
    help="结束日期（YYYY-MM-DD）",
)
@click.option(
    "-F", "--format", "export_format",
    type=str,
    default="csv",
    show_default=True,
    help="导出格式：csv / excel / json",
)
@click.option(
    "-o", "--output-dir",
    type=click.Path(),
    default="./output",
    show_default=True,
    help="输出目录",
)
@click.option(
    "-b", "--batch-id",
    type=str,
    default=None,
    help="手动指定批次号（默认自动生成）",
)
@click.option(
    "--dry-run",
    is_flag=True,
    default=False,
    help="预览模式，只输出统计信息不生成正式结果文件",
)
def main(files, mapping, start_date, end_date, export_format, output_dir, batch_id, dry_run):
    """
    煤矿瓦斯巡检数据处理工具。

    读取多个原始文件、应用字段映射、按日期范围过滤，
    输出成功结果、坏行文件、差异表和操作日志。
    """

    batch_id = batch_id or generate_batch_id()
    file_list = list(files)

    try:
        validate_output_dir(output_dir)

        logger = OperationLogger(output_dir, batch_id, dry_run=dry_run)
        logger.info(f"煤矿瓦斯巡检数据处理开始 - 批次号: {batch_id}")

        if dry_run:
            logger.info("运行模式: DRY-RUN (预览模式，不写入正式结果文件)")

        existing_files, missing_files = validate_input_files(file_list)
        if missing_files:
            for mf in missing_files:
                logger.error(f"输入文件不存在: {mf}")
            raise ValidationError(f"有 {len(missing_files)} 个输入文件不存在")

        logger.info(f"有效输入文件: {len(existing_files)} 个")

        start_dt, end_dt = validate_date_range(start_date, end_date)
        logger.info(f"日期范围: {start_date} 至 {end_date}")

        mapping_config = validate_mapping_config(mapping)
        logger.info(f"字段映射配置加载成功: {mapping}")

        export_fmt = validate_export_format(export_format)
        logger.info(f"导出格式: {export_fmt}")

        config_info = {
            "input_files": existing_files,
            "start_date": start_date,
            "end_date": end_date,
            "export_format": export_fmt,
            "mapping_file": mapping,
        }

        reader = FileReader(mapping_config)
        raw_df, read_bad_rows = reader.read_files(existing_files, batch_id)
        logger.info(f"读取完成，共 {len(raw_df)} 行原始数据")

        processor = DataProcessor(mapping_config, start_dt, end_dt)
        good_df, bad_df, stats = processor.process(raw_df)
        logger.info(f"数据校验完成 - 有效: {stats['valid']} 行, 坏行: {stats['bad']} 行")

        diff_gen = DiffGenerator(mapping_config)
        diff_df = diff_gen.generate_diff(good_df)
        diff_count = len(diff_df)
        stats["diff_count"] = diff_count
        logger.info(f"差异表生成完成，共 {diff_count} 条差异记录")

        if not dry_run:
            exporter = DataExporter(output_dir, export_fmt, batch_id)

            success_path = exporter.export_success(good_df)
            logger.info(f"成功结果已导出: {success_path}")

            bad_path = exporter.export_bad_rows(bad_df)
            logger.info(f"坏行文件已导出: {bad_path}")

            diff_path = exporter.export_diff(diff_df)
            logger.info(f"差异表已导出: {diff_path}")

            summary_path = exporter.export_summary(stats, config_info)
            logger.info(f"处理摘要已导出: {summary_path}")
        else:
            logger.info("[DRY-RUN] 预览模式 - 不写入正式结果文件")
            logger.info(f"[DRY-RUN] 将生成文件:")
            logger.info(f"  - success_{batch_id}.{export_fmt} ({stats['valid']} 行)")
            logger.info(f"  - bad_rows_{batch_id}.{export_fmt} ({stats['bad']} 行)")
            logger.info(f"  - diff_{batch_id}.{export_fmt} ({diff_count} 条)")
            logger.info(f"  - summary_{batch_id}.json")
            logger.info(f"  - operation_{batch_id}.log")

        logger.log_summary(stats, config_info)

        if not bad_df.empty:
            logger.warning(f"发现 {len(bad_df)} 条坏行，请查看坏行文件进行复核")
            logger.warning(f"坏行复核入口: bad_rows_{batch_id}.{export_fmt}")

        logger.info("处理完成！")

        click.echo()
        click.echo(f"批次号: {batch_id}")
        click.echo(f"状态: {'预览完成' if dry_run else '处理完成'}")
        click.echo(f"总记录: {stats['total']}")
        click.echo(f"有效记录: {stats['valid']}")
        click.echo(f"坏行记录: {stats['bad']}")
        click.echo(f"差异记录: {diff_count}")
        click.echo(f"操作日志: {logger.get_log_file()}")
        if not dry_run:
            click.echo(f"输出目录: {os.path.abspath(output_dir)}")
            if stats.get("bad", 0) > 0:
                click.echo()
                click.echo(f"⚠  坏行复核入口: bad_rows_{batch_id}.{export_fmt}")
                click.echo(f"   可根据 _source_file 和 _row_number 返回原始数据复盘")

    except ValidationError as e:
        click.echo(f"参数校验错误: {e}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"处理失败: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
