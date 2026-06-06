import sys
import os

from .config import AppConfig
from .logger import OperationLogger
from .validator import ConfigValidator, load_config_from_args, ValidationError
from .reader import DataReader
from .bad_row_detector import BadRowDetector
from .merger import ComplaintMerger
from .diff import DiffComparator
from .exporter import DataExporter


class ComplaintMergePipeline:
    def __init__(self, config: AppConfig):
        self.config = config
        self.logger = OperationLogger(config)
        self.reader = DataReader(config, self.logger)
        self.bad_detector = BadRowDetector(config, self.logger)
        self.merger = ComplaintMerger(config, self.logger)
        self.diff = DiffComparator(config, self.logger)
        self.exporter = DataExporter(config, self.logger)

    def validate(self) -> bool:
        self.logger.info("开始参数校验")
        validator = ConfigValidator()
        is_valid, errors, warnings = validator.validate(self.config)

        for warning in warnings:
            self.logger.warning(f"参数警告: {warning}")

        if errors:
            self.logger.error("参数校验失败:")
            for error in errors:
                self.logger.error(f"  - {error}")
            return False

        self.logger.info("参数校验通过")
        return True

    def run(self) -> bool:
        try:
            if not self.validate():
                self.logger.error("参数校验失败，终止执行")
                return False

            self.logger.info(f"装修噪声投诉归并处理开始")
            self.logger.info(f"批次号: {self.config.batch_no}")
            self.logger.info(f"运行模式: {'DRY-RUN(预览)' if self.config.dry_run else '正式执行'}")

            raw_rows = self.reader.read_business_ledger()
            total_rows = len(raw_rows)

            last_results = self.reader.read_last_result()

            good_rows, bad_rows = self.bad_detector.detect_and_isolate(raw_rows)

            merged_results = self.merger.merge_and_classify(good_rows)

            diff_results, added_count, removed_count, updated_count = (
                self.diff.compare(merged_results, last_results)
            )

            self.exporter.export_all(merged_results, bad_rows, diff_results)

            self.logger.summary(
                total_rows=total_rows,
                success_count=len(merged_results),
                bad_count=len(bad_rows),
                diff_added=added_count,
                diff_removed=removed_count,
                diff_updated=updated_count,
            )

            self.logger.info("装修噪声投诉归并处理完成")
            return True

        except Exception as e:
            self.logger.error(f"处理过程中发生错误: {e}")
            import traceback
            self.logger.debug(traceback.format_exc())
            return False


def run_cli(args=None):
    import argparse

    parser = argparse.ArgumentParser(
        description="装修噪声投诉归并CLI - 归并装修噪声投诉数据，进行风险分级和差异对比",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本使用
  python -m noise_complaint.cli -l business.csv -p params.json

  # 带筛选条件和上次结果
  python -m noise_complaint.cli -l business.csv -p params.json -f filters.json -r last_result.csv

  # dry-run 预览模式
  python -m noise_complaint.cli -l business.csv -p params.json --dry-run

  # 指定输出目录和批次号
  python -m noise_complaint.cli -l business.csv -p params.json -o ./output -b BATCH20240101001
        """,
    )

    parser.add_argument(
        "-l", "--ledger",
        required=True,
        help="业务台账文件路径 (CSV或Excel)",
    )
    parser.add_argument(
        "-p", "--params",
        required=True,
        help="参数文件路径 (JSON格式)",
    )
    parser.add_argument(
        "-r", "--last-result",
        default=None,
        help="上次结果文件路径，用于差异对比 (CSV或Excel)",
    )
    parser.add_argument(
        "-f", "--filter",
        default=None,
        help="筛选条件文件路径 (JSON格式)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="预览模式，只预览不落正式结果",
    )
    parser.add_argument(
        "-b", "--batch-no",
        default=None,
        help="处理批次号，不指定则自动生成",
    )
    parser.add_argument(
        "-o", "--output-dir",
        default=None,
        help="输出目录，默认为 ./output",
    )
    parser.add_argument(
        "-s", "--source-system",
        default="decoration_noise_complaint",
        help="来源系统标识，默认为 decoration_noise_complaint",
    )

    if args is None:
        args = sys.argv[1:]

    parsed = parser.parse_args(args)

    try:
        config = load_config_from_args(
            business_ledger=parsed.ledger,
            params_file=parsed.params,
            last_result=parsed.last_result,
            filter_file=parsed.filter,
            dry_run=parsed.dry_run,
            batch_no=parsed.batch_no,
            output_dir=parsed.output_dir,
            source_system=parsed.source_system,
        )
    except Exception as e:
        print(f"加载配置失败: {e}", file=sys.stderr)
        return 1

    pipeline = ComplaintMergePipeline(config)
    success = pipeline.run()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(run_cli())
