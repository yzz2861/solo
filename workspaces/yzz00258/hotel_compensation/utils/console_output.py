import sys
from typing import List, Dict, Any
from datetime import datetime
from ..models import CompensationResult, CompensationRecord


class ConsoleOutput:
    COLORS = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "cyan": "\033[96m",
        "bold": "\033[1m",
        "reset": "\033[0m"
    }

    def __init__(self, use_color: bool = True):
        self.use_color = use_color
        self._indent = 0

    def _color(self, text: str, color: str) -> str:
        if not self.use_color:
            return text
        return f"{self.COLORS.get(color, '')}{text}{self.COLORS['reset']}"

    def _indent_str(self) -> str:
        return "  " * self._indent

    def title(self, text: str) -> None:
        line = "=" * 60
        print(self._color(f"\n{line}", "bold"))
        print(self._color(f"  {text}", "bold"))
        print(self._color(line, "bold"))

    def section(self, text: str) -> None:
        print(f"\n{self._indent_str()}[{text}]")
        self._indent += 1

    def end_section(self) -> None:
        if self._indent > 0:
            self._indent -= 1

    def success(self, text: str) -> None:
        print(f"{self._indent_str()}{self._color('✓', 'green')} {text}")

    def error(self, text: str) -> None:
        print(f"{self._indent_str()}{self._color('✗', 'red')} {text}")

    def warning(self, text: str) -> None:
        print(f"{self._indent_str()}{self._color('⚠', 'yellow')} {text}")

    def info(self, text: str) -> None:
        print(f"{self._indent_str()}{self._color('ℹ', 'blue')} {text}")

    def result_line(self, label: str, value: str, color: str = None) -> None:
        formatted_value = self._color(value, color) if color else value
        print(f"{self._indent_str()}{label}: {formatted_value}")

    def print_result(self, result: CompensationResult) -> None:
        self.section(f"业务编号: {result.business_no}")

        if result.success:
            conclusion_color = "green" if result.conclusion.value == "APPROVE" else "yellow"
            self.result_line("业务结论", result.conclusion.value, conclusion_color)
            self.result_line("风险标签", result.risk_label.value,
                           "red" if result.risk_label.value == "HIGH" else "yellow")
            self.result_line("下一步动作", result.next_action.value, "cyan")
            self.result_line("审计编号", result.audit_id)

            if result.review_required:
                self.warning(f"需要复核: {result.review_reason}")
            if result.missing_materials:
                self.warning(f"缺少材料: {', '.join(result.missing_materials)}")
            if result.is_duplicate:
                self.warning("重复提交")
        else:
            self.error(f"处理失败: {result.error_message}")

        self.end_section()

    def print_batch_summary(self, results: List[CompensationResult],
                           bad_rows: List[Dict[str, Any]] = None) -> None:
        total = len(results)
        success_count = sum(1 for r in results if r.success and not r.is_duplicate)
        failed_count = sum(1 for r in results if not r.success)
        review_count = sum(1 for r in results if r.success and r.review_required)
        duplicate_count = sum(1 for r in results if r.is_duplicate)

        self.title("批量处理汇总")
        self.result_line("总记录数", str(total))
        self.result_line("成功通过", str(success_count), "green")
        self.result_line("需复核", str(review_count), "yellow")
        self.result_line("失败", str(failed_count), "red")
        self.result_line("重复提交", str(duplicate_count), "yellow")

        if bad_rows:
            self.warning(f"坏行数量: {len(bad_rows)} (已隔离)")

    def print_review_entry(self, record: CompensationRecord) -> None:
        self.title("复核入口")
        self.info(f"业务编号: {record.business_no}")
        self.info(f"当前状态: {record.current_status}")

        latest = record.latest_result()
        if latest and latest.review_required:
            self.warning(f"复核原因: {latest.review_reason}")
            print(f"\n  操作选项:")
            print(f"    1. 复核通过")
            print(f"    2. 复核拒绝")
            print(f"    3. 补充材料后重审")
