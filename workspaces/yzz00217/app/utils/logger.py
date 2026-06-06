import sys
from datetime import datetime
from typing import Optional, TextIO
from enum import Enum


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"


class ConsoleLogger:
    def __init__(self, name: str = "inspection", level: LogLevel = LogLevel.INFO):
        self.name = name
        self.level = level
        self._level_order = {
            LogLevel.DEBUG: 10,
            LogLevel.INFO: 20,
            LogLevel.WARN: 30,
            LogLevel.ERROR: 40,
            LogLevel.SUCCESS: 25,
        }

    def _format_msg(self, level: LogLevel, message: str) -> str:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"[{timestamp}] [{self.name}] [{level.value}] {message}"

    def _print(self, level: LogLevel, message: str, file: Optional[TextIO] = None):
        if self._level_order.get(level, 0) < self._level_order.get(self.level, 0):
            return

        formatted = self._format_msg(level, message)
        output = file or sys.stdout
        print(formatted, file=output, flush=True)

    def debug(self, message: str):
        self._print(LogLevel.DEBUG, message)

    def info(self, message: str):
        self._print(LogLevel.INFO, message)

    def warn(self, message: str):
        self._print(LogLevel.WARN, message, file=sys.stderr)

    def error(self, message: str):
        self._print(LogLevel.ERROR, message, file=sys.stderr)

    def success(self, message: str):
        self._print(LogLevel.SUCCESS, message)

    def print_banner(self, title: str):
        line = "=" * 60
        print(line)
        print(f"  {title}")
        print(line)

    def print_summary(self, summary: dict):
        print()
        print("-" * 50)
        print("  巡检处理汇总")
        print("-" * 50)
        print(f"  批次ID:       {summary.get('batch_id', 'N/A')}")
        print(f"  总记录数:     {summary.get('total_records', 0)}")
        print(f"  成功处理:     {summary.get('successful_processed', 0)}")
        print(f"  坏行隔离:     {summary.get('bad_rows_count', 0)}")
        print()
        counts = summary.get('conclusion_counts', {})
        print(f"  通过(pass):         {counts.get('pass', 0)}")
        print(f"  待复核(review):     {counts.get('review_required', 0)}")
        print(f"  拒绝(reject):       {counts.get('reject', 0)}")
        print(f"  挂起(pending):      {counts.get('pending', 0)}")
        print()
        risks = summary.get('risk_counts', {})
        print("  风险分布:")
        for risk, count in risks.items():
            print(f"    - {risk}: {count}")
        print("-" * 50)
        print()


_default_logger = None


def get_logger(name: str = "inspection") -> ConsoleLogger:
    global _default_logger
    if _default_logger is None:
        _default_logger = ConsoleLogger(name)
    return _default_logger
