import os
import logging
from datetime import datetime
from typing import Dict


class OperationLogger:
    def __init__(self, output_dir: str, batch_id: str, dry_run: bool = False):
        self.output_dir = output_dir
        self.batch_id = batch_id
        self.dry_run = dry_run
        self.log_entries = []

        os.makedirs(output_dir, exist_ok=True)

        log_suffix = "_dryrun" if dry_run else ""
        log_file = os.path.join(output_dir, f"operation_{batch_id}{log_suffix}.log")

        self.logger = logging.getLogger(f"gas_inspection_{batch_id}")
        self.logger.setLevel(logging.INFO)
        self.logger.handlers.clear()

        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setLevel(logging.INFO)

        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)

        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

        self.log_file = log_file

    def info(self, message: str):
        self.logger.info(message)
        self._add_entry("INFO", message)

    def warning(self, message: str):
        self.logger.warning(message)
        self._add_entry("WARNING", message)

    def error(self, message: str):
        self.logger.error(message)
        self._add_entry("ERROR", message)

    def _add_entry(self, level: str, message: str):
        self.log_entries.append({
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "level": level,
            "message": message,
        })

    def log_summary(self, stats: Dict, config: Dict):
        self.info("=" * 60)
        self.info(f"批次号: {self.batch_id}")
        if self.dry_run:
            self.info("模式: DRY-RUN (预览模式，不写入正式结果)")
        self.info(f"输入文件: {', '.join(config.get('input_files', []))}")
        self.info(f"日期范围: {config.get('start_date')} ~ {config.get('end_date')}")
        self.info(f"导出格式: {config.get('export_format')}")
        self.info("-" * 60)
        self.info(f"处理总行数: {stats.get('total', 0)}")
        self.info(f"有效数据: {stats.get('valid', 0)}")
        self.info(f"坏行数量: {stats.get('bad', 0)}")
        if stats.get('diff_count') is not None:
            self.info(f"差异记录: {stats.get('diff_count', 0)}")
        self.info("=" * 60)

    def get_log_file(self) -> str:
        return self.log_file
