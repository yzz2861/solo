import logging
import os
from datetime import datetime
from typing import List, Optional

from .config import AppConfig


class OperationLogger:
    def __init__(self, config: AppConfig):
        self.config = config
        self._logs: List[str] = []
        self._logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger(f"noise_complaint_{self.config.batch_no}")
        logger.setLevel(logging.DEBUG)
        logger.handlers.clear()

        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(batch_no)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        class BatchFilter(logging.Filter):
            def __init__(self, batch_no: str):
                super().__init__()
                self.batch_no = batch_no

            def filter(self, record):
                record.batch_no = self.batch_no
                return True

        batch_filter = BatchFilter(self.config.batch_no)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(batch_filter)
        logger.addHandler(console_handler)

        if not self.config.dry_run:
            os.makedirs(self.config.output.output_dir, exist_ok=True)
            log_path = os.path.join(
                self.config.output.output_dir, self.config.output.log_file
            )
            file_handler = logging.FileHandler(
                log_path, encoding=self.config.output.encoding
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            file_handler.addFilter(batch_filter)
            logger.addHandler(file_handler)

        return logger

    def _log(self, level: str, message: str):
        log_msg = f"[{self.config.source_system}] {message}"
        if level == "info":
            self._logger.info(log_msg)
        elif level == "warning":
            self._logger.warning(log_msg)
        elif level == "error":
            self._logger.error(log_msg)
        elif level == "debug":
            self._logger.debug(log_msg)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._logs.append(f"{timestamp} | {level.upper()} | {log_msg}")

    def info(self, message: str):
        self._log("info", message)

    def warning(self, message: str):
        self._log("warning", message)

    def error(self, message: str):
        self._log("error", message)

    def debug(self, message: str):
        self._log("debug", message)

    def get_all_logs(self) -> List[str]:
        return list(self._logs)

    def summary(self, total_rows: int, success_count: int, bad_count: int,
                diff_added: int, diff_removed: int, diff_updated: int):
        self.info("=" * 60)
        self.info("处理汇总")
        self.info("=" * 60)
        self.info(f"批次号: {self.config.batch_no}")
        self.info(f"来源系统: {self.config.source_system}")
        self.info(f"运行模式: {'DRY-RUN(预览)' if self.config.dry_run else '正式执行'}")
        self.info(f"总数据行数: {total_rows}")
        self.info(f"成功处理: {success_count}")
        self.info(f"坏行数量: {bad_count}")
        self.info(f"差异-新增: {diff_added}")
        self.info(f"差异-移除: {diff_removed}")
        self.info(f"差异-更新: {diff_updated}")
        self.info(f"输出目录: {self.config.output.output_dir}")
        self.info("=" * 60)
