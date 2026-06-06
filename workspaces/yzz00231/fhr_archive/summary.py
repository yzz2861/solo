import os
import sys
from datetime import datetime
from typing import List, Dict
from .models import ArchiveSummary, DetailRecord, ReviewItem, ValidationResult


class ConsoleSummary:
    def __init__(self, use_color: bool = True):
        self.use_color = use_color and sys.stdout.isatty()

    def _color(self, text: str, color: str) -> str:
        if not self.use_color:
            return text

        colors = {
            "red": "\033[91m",
            "green": "\033[92m",
            "yellow": "\033[93m",
            "blue": "\033[94m",
            "magenta": "\033[95m",
            "cyan": "\033[96m",
            "white": "\033[97m",
            "bold": "\033[1m",
            "reset": "\033[0m",
        }

        return f"{colors.get(color, '')}{text}{colors['reset']}"

    def print_summary(self, summary: ArchiveSummary):
        print()
        print(self._color("=" * 60, "bold"))
        print(self._color("  产房胎心监护归档 - 处理摘要", "bold"))
        print(self._color("=" * 60, "bold"))
        print()

        print(f"  批次ID: {self._color(summary.batch_id, 'cyan')}")
        print(f"  来源标识: {self._color(summary.source_identifier, 'cyan')}")
        print(f"  生成时间: {summary.generated_at}")
        print()

        print(self._color("-" * 40, "blue"))
        print("  📊 汇总统计")
        print(self._color("-" * 40, "blue"))
        print()

        print(f"    总记录数:    {self._color(str(summary.total_records), 'bold')}")
        print(f"    正常记录:    {self._color(str(summary.valid_records), 'green')}")
        print(f"    异常记录:    {self._color(str(summary.invalid_records), 'yellow')}")
        print(f"    需复核记录:  {self._color(str(summary.review_required), 'red')}")
        print(f"    材料缺失:    {self._color(str(summary.missing_material_count), 'yellow')}")
        print(f"    超阈值:      {self._color(str(summary.over_threshold_count), 'red')}")
        print()

        print("  风险等级分布:")
        for level in ["critical", "high", "medium", "low", "normal"]:
            count = summary.risk_counts.get(level, 0)
            label = self._risk_label(level)
            color = self._risk_color(level)
            bar = "█" * min(count, 20)
            print(f"    {self._color(label, color):<8} {count:>4}  {bar}")
        print()

    def print_review_list(self, review_items: List[ReviewItem], limit: int = 10):
        if not review_items:
            print(self._color("  ✅ 暂无需要复核的记录", "green"))
            print()
            return

        print(self._color("-" * 40, "yellow"))
        print(f"  ⚠️  需复核列表 (共 {len(review_items)} 条，显示前 {min(limit, len(review_items))} 条)")
        print(self._color("-" * 40, "yellow"))
        print()

        for i, item in enumerate(review_items[:limit], 1):
            color = self._risk_color(item.risk_level)
            label = self._risk_label(item.risk_level)
            print(f"  {i}. [{self._color(label, color)}] {item.patient_name}")
            print(f"     记录ID: {item.record_id} | 检查时间: {item.exam_time}")
            print(f"     原因: {item.review_reason}")
            if item.risk_tags:
                print(f"     标签: {', '.join(item.risk_tags)}")
            print()

        if len(review_items) > limit:
            print(f"  ... 还有 {len(review_items) - limit} 条记录，请查看明细文件")
            print()

    def print_details(self, details: List[DetailRecord], limit: int = 5):
        print(self._color("-" * 40, "blue"))
        print(f"  📋 明细记录 (共 {len(details)} 条，显示前 {min(limit, len(details))} 条)")
        print(self._color("-" * 40, "blue"))
        print()

        for i, d in enumerate(details[:limit], 1):
            status_color = "red" if d.needs_review else "green"
            status = "需复核" if d.needs_review else "正常"
            print(f"  {i}. {d.patient_name} - {self._color(status, status_color)}")
            print(f"     ID: {d.record_id} | 住院号: {d.admission_no}")
            print(f"     检查时间: {d.exam_time}")
            print(f"     风险等级: {self._color(self._risk_label(d.risk_level), self._risk_color(d.risk_level))}")
            if d.risk_tags:
                print(f"     风险标签: {', '.join(d.risk_tags)}")
            print()

        if len(details) > limit:
            print(f"  ... 还有 {len(details) - limit} 条记录")
            print()

    def print_validation_detail(self, results: List[ValidationResult], record_id: str):
        print()
        print(self._color("=" * 50, "bold"))
        print(f"  校验详情 - 记录 {record_id}")
        print(self._color("=" * 50, "bold"))
        print()

        failed = [r for r in results if not r.passed]
        passed = [r for r in results if r.passed]

        print(f"  通过: {self._color(str(len(passed)), 'green')}  "
              f"未通过: {self._color(str(len(failed)), 'red')}")
        print()

        if failed:
            print(self._color("  未通过规则:", "red"))
            for r in failed:
                color = self._risk_color(r.risk_level)
                print(f"    - [{self._color(r.rule_name, color)}] {r.message}")
            print()

        if passed:
            print(self._color("  通过规则:", "green"))
            for r in passed[:10]:
                print(f"    - {r.rule_name}")
            if len(passed) > 10:
                print(f"    ... 还有 {len(passed) - 10} 条通过规则")
            print()

    def print_batch_history(self, batches: List):
        print()
        print(self._color("=" * 60, "bold"))
        print("  历史批次记录")
        print(self._color("=" * 60, "bold"))
        print()

        if not batches:
            print("  暂无历史批次记录")
            print()
            return

        for i, batch in enumerate(batches, 1):
            print(f"  {i}. {self._color(batch.batch_id, 'cyan')}")
            print(f"     处理时间: {batch.processed_at}")
            print(f"     来源标识: {batch.source_identifier}")
            print(f"     记录数: {batch.record_count}")
            print(f"     校验和: {batch.checksum}")
            print()

    def _risk_label(self, level: str) -> str:
        labels = {
            "critical": "危重",
            "high": "高风险",
            "medium": "中风险",
            "low": "低风险",
            "normal": "正常",
        }
        return labels.get(level, level)

    def _risk_color(self, level: str) -> str:
        colors = {
            "critical": "red",
            "high": "magenta",
            "medium": "yellow",
            "low": "blue",
            "normal": "green",
        }
        return colors.get(level, "white")


class ProcessLogger:
    def __init__(self, log_dir: str, batch_id: str):
        self.log_dir = log_dir
        self.batch_id = batch_id
        self.log_entries = []
        os.makedirs(log_dir, exist_ok=True)

    def info(self, message: str):
        self._add_log("INFO", message)
        print(f"[INFO] {message}")

    def warning(self, message: str):
        self._add_log("WARNING", message)
        print(f"[WARN] {message}")

    def error(self, message: str):
        self._add_log("ERROR", message)
        print(f"[ERROR] {message}")

    def _add_log(self, level: str, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "batch_id": self.batch_id,
        }
        self.log_entries.append(entry)

    def save(self, filename: str = None):
        if not filename:
            filename = f"log_{self.batch_id}.log"

        filepath = os.path.join(self.log_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            for entry in self.log_entries:
                f.write(f"[{entry['timestamp']}] [{entry['level']}] [{entry['batch_id']}] {entry['message']}\n")

        return filepath
