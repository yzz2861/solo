import logging
import sys
from datetime import datetime
from pathlib import Path


class ComplianceLogger:
    def __init__(self, log_dir=None, verbose=False):
        self.logger = logging.getLogger("compliance_check")
        self.logger.setLevel(logging.DEBUG if verbose else logging.INFO)
        self.logger.handlers.clear()

        fmt = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        console = logging.StreamHandler(sys.stdout)
        console.setFormatter(fmt)
        console.setLevel(logging.DEBUG if verbose else logging.INFO)
        self.logger.addHandler(console)

        if log_dir:
            log_dir = Path(log_dir)
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / f"compliance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            file_handler.setFormatter(fmt)
            file_handler.setLevel(logging.DEBUG)
            self.logger.addHandler(file_handler)
            self.log_file = log_file
        else:
            self.log_file = None

        self.stats = {
            "total": 0,
            "normal": 0,
            "abnormal": 0,
            "review": 0,
            "missing_field": 0,
            "duplicate": 0,
            "risk_labels": {},
        }

    def info(self, msg):
        self.logger.info(msg)

    def warn(self, msg):
        self.logger.warning(msg)

    def error(self, msg):
        self.logger.error(msg)

    def debug(self, msg):
        self.logger.debug(msg)

    def inc_stat(self, key, value=1):
        if key in self.stats and isinstance(self.stats[key], int):
            self.stats[key] += value

    def add_risk_label(self, label):
        self.stats["risk_labels"][label] = self.stats["risk_labels"].get(label, 0) + 1

    def print_summary(self):
        self.info("=" * 50)
        self.info("合规检查汇总")
        self.info("=" * 50)
        self.info(f"总记录数:     {self.stats['total']}")
        self.info(f"正常记录:     {self.stats['normal']}")
        self.info(f"异常记录:     {self.stats['abnormal']}")
        self.info(f"待复核记录:   {self.stats['review']}")
        self.info(f"缺字段记录:   {self.stats['missing_field']}")
        self.info(f"重复记录:     {self.stats['duplicate']}")
        self.info("-" * 50)
        self.info("风险标签分布:")
        if self.stats["risk_labels"]:
            for label, count in sorted(self.stats["risk_labels"].items()):
                self.info(f"  {label}: {count}")
        else:
            self.info("  无")
        self.info("=" * 50)

        if self.log_file:
            self.info(f"日志文件: {self.log_file}")
