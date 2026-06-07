"""操作日志与数据回放机制。"""
import os
import json
from datetime import datetime
from typing import List, Dict, Any

from .config import ProcessContext, TaskStatus
from .models import ProcessResult


class OperationLogger:
    """操作日志记录器。

    记录处理过程中的关键事件，支持按批次回放数据。
    """

    def __init__(self, log_dir: str, ctx: ProcessContext):
        self.log_dir = log_dir
        self.ctx = ctx
        self.entries: List[Dict[str, Any]] = []
        os.makedirs(log_dir, exist_ok=True)

    def log(self, level: str, event: str, detail: str = "", data: dict = None):
        """记录一条日志。"""
        entry = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
            "batch_id": self.ctx.batch_id,
            "level": level,
            "event": event,
            "detail": detail,
            "data": data or {},
        }
        self.entries.append(entry)

    def info(self, event: str, detail: str = "", data: dict = None):
        self.log("INFO", event, detail, data)

    def warn(self, event: str, detail: str = "", data: dict = None):
        self.log("WARN", event, detail, data)

    def error(self, event: str, detail: str = "", data: dict = None):
        self.log("ERROR", event, detail, data)

    def save(self) -> str:
        """保存日志文件。"""
        path = os.path.join(self.log_dir, f"{self.ctx.batch_id}_操作日志.json")
        log_data = {
            "batch_id": self.ctx.batch_id,
            "task_status": self.ctx.task_status.value,
            "source_files": self.ctx.source_files,
            "dry_run": self.ctx.dry_run,
            "start_time": self.ctx.processed_at.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_rows": self.ctx.total_rows,
            "valid_rows": self.ctx.valid_rows,
            "bad_rows": self.ctx.bad_rows,
            "banned_found": self.ctx.banned_found,
            "entries": self.entries,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)
        return path


class DataReplay:
    """数据回放器：根据日志或结果文件还原处理过程。"""

    @staticmethod
    def load_log(log_file: str) -> dict:
        """加载日志文件。"""
        with open(log_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def replay_summary(log_file: str) -> str:
        """生成回放摘要。"""
        data = DataReplay.load_log(log_file)
        lines = [
            f"批次: {data['batch_id']}",
            f"状态: {data['task_status']}",
            f"源文件: {', '.join(data['source_files'])}",
            f"开始时间: {data['start_time']}",
            f"结束时间: {data['end_time']}",
            f"总行数: {data['total_rows']}",
            f"有效行: {data['valid_rows']}",
            f"坏行: {data['bad_rows']}",
            f"命中禁用料: {data['banned_found']}",
            "",
            "事件回放:",
        ]
        for e in data["entries"]:
            lines.append(f"  [{e['level']}] {e['timestamp']} {e['event']}: {e['detail']}")
        return "\n".join(lines)


def log_result_summary(logger: OperationLogger, result: ProcessResult):
    """将处理结果摘要写入日志。"""
    logger.info("处理完成", "任务结束", {
        "task_status": result.task_status.value,
        "total_rows": result.total_rows,
        "valid_rows": result.valid_rows,
        "bad_rows": result.bad_rows,
        "banned_count": result.banned_count,
        "high_risk": result.high_risk_count,
        "medium_risk": result.medium_risk_count,
        "low_risk": result.low_risk_count,
        "unknown_risk": result.unknown_risk_count,
    })
    for err in result.errors:
        logger.error("处理错误", err)
    for warn in result.warnings:
        logger.warn("处理警告", warn)
