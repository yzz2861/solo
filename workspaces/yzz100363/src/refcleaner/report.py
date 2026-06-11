"""处理报告生成器"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .models import (
    ConfirmationSeverity,
    ConfirmationType,
    ProcessedResult,
    ProcessingReport,
    ProcessingStatus,
    ReferenceEntry,
)


class ReportGenerator:
    def __init__(self, show_details: bool = True) -> None:
        self.show_details = show_details

    def generate_text_report(self, result: ProcessedResult) -> str:
        lines = []
        report = result.report

        lines.append("=" * 70)
        lines.append("参考文献清洗补全 - 处理报告")
        lines.append("=" * 70)
        lines.append("")

        lines.append(self._format_summary(report))
        lines.append("")

        lines.append("-" * 70)
        lines.append("一、自动处理情况")
        lines.append("-" * 70)
        lines.append("")
        lines.extend(self._format_auto_fixes(result))
        lines.append("")

        lines.append("-" * 70)
        lines.append("二、待确认清单")
        lines.append("-" * 70)
        lines.append("")
        lines.extend(self._format_confirmation_items(result))
        lines.append("")

        lines.append("-" * 70)
        lines.append("三、疑似重复文献")
        lines.append("-" * 70)
        lines.append("")
        lines.extend(self._format_duplicates(result))
        lines.append("")

        lines.append("-" * 70)
        lines.append("四、按原始位置索引")
        lines.append("-" * 70)
        lines.append("")
        lines.extend(self._format_original_position_index(result))
        lines.append("")

        lines.append("=" * 70)
        lines.append(f"处理完成，耗时: {report.processing_time:.2f} 秒")
        lines.append("=" * 70)

        return '\n'.join(lines)

    def _format_summary(self, report: ProcessingReport) -> str:
        lines = [
            "📊 处理概览",
            f"  总条目数:       {report.total_entries}",
            f"  正常处理:       {report.processed_entries} 条",
            f"  自动修复:       {report.auto_fixed_entries} 条 ({report.auto_fixes_count} 处)",
            f"  待确认:         {report.needs_confirmation_entries} 条 ({report.confirmation_items_count} 项)",
            f"  需咨询导师:     {report.consult_advisor_count} 条",
            f"  重复文献:       {report.duplicate_entries} 条 ({len(report.duplicate_groups)} 组)",
        ]
        return '\n'.join(lines)

    def _format_auto_fixes(self, result: ProcessedResult) -> list[str]:
        lines = []
        auto_fixed_entries = [e for e in result.entries if e.auto_fixes]

        if not auto_fixed_entries:
            lines.append("  无自动修复项")
            return lines

        lines.append(f"  共 {len(auto_fixed_entries)} 条文献进行了自动修复:")
        lines.append("")

        for entry in auto_fixed_entries:
            lines.append(f"  [原始位置 {entry.original_position + 1}] {self._get_entry_preview(entry)}")
            for fix in entry.auto_fixes:
                lines.append(
                    f"    ✓ {fix.field}: \"{fix.original_value}\" → \"{fix.new_value}\""
                )
                lines.append(f"      原因: {fix.reason}")
            lines.append("")

        return lines

    def _format_confirmation_items(self, result: ProcessedResult) -> list[str]:
        lines = []

        consult_entries = []
        info_entries = []

        for entry in result.entries:
            if entry.status == ProcessingStatus.DUPLICATE:
                continue

            consult_items = [c for c in entry.confirmation_items if c.consult_advisor]
            info_items = [c for c in entry.confirmation_items if not c.consult_advisor]

            if consult_items:
                consult_entries.append((entry, consult_items))
            if info_items:
                info_entries.append((entry, info_items))

        if consult_entries:
            lines.append("  🔴 需咨询导师的项:")
            lines.append("")
            for entry, items in consult_entries:
                lines.append(f"  [原始位置 {entry.original_position + 1}] {self._get_entry_preview(entry)}")
                for item in items:
                    severity_icon = self._get_severity_icon(item.severity)
                    lines.append(
                        f"    {severity_icon} [{item.type.value}] {item.message}"
                    )
                    if item.original_value and item.suggested_value:
                        lines.append(
                            f"       原值: \"{item.original_value}\""
                        )
                        lines.append(
                            f"       建议: \"{item.suggested_value}\""
                        )
                lines.append("")

        if info_entries:
            lines.append("  🟡 建议确认的项（不影响使用）:")
            lines.append("")
            for entry, items in info_entries:
                lines.append(f"  [原始位置 {entry.original_position + 1}] {self._get_entry_preview(entry)}")
                for item in items:
                    severity_icon = self._get_severity_icon(item.severity)
                    lines.append(
                        f"    {severity_icon} [{item.type.value}] {item.message}"
                    )
                lines.append("")

        if not consult_entries and not info_entries:
            lines.append("  无待确认项")

        return lines

    def _format_duplicates(self, result: ProcessedResult) -> list[str]:
        lines = []
        report = result.report

        if not report.duplicate_groups:
            lines.append("  未检测到重复文献")
            return lines

        lines.append(f"  检测到 {len(report.duplicate_groups)} 组重复文献，共 {report.duplicate_entries} 条:")
        lines.append("")

        for group in report.duplicate_groups:
            primary = result.entries[group.primary_index]
            lines.append(
                f"  组 {group.group_id}: 置信度 {group.confidence:.1f}%"
            )
            lines.append(
                f"    保留条目: [原始位置 {group.primary_index + 1}] {self._get_entry_preview(primary)}"
            )

            for dup_idx in group.duplicate_indices:
                dup = result.entries[dup_idx]
                lines.append(
                    f"    移除条目: [原始位置 {dup_idx + 1}] {self._get_entry_preview(dup)}"
                )
            lines.append(f"    原因: {group.reason}")
            lines.append("")

        return lines

    def _format_original_position_index(self, result: ProcessedResult) -> list[str]:
        lines = []
        lines.append("  原始位置 → 输出位置 映射:")
        lines.append("")

        for entry in result.entries:
            orig_pos = entry.original_position + 1
            if entry.status == ProcessingStatus.DUPLICATE:
                status = "【重复，已移除】"
            else:
                status = f"输出位置: [{entry.output_position + 1}]"

            preview = self._get_entry_preview(entry, max_len=40)
            lines.append(f"  原始位置 {orig_pos:3d} → {status}  {preview}")

        return lines

    def _get_entry_preview(self, entry: ReferenceEntry, max_len: int = 60) -> str:
        if entry.title:
            text = entry.title
        elif entry.authors:
            text = ', '.join(entry.authors)
        else:
            text = entry.original_text

        if len(text) > max_len:
            text = text[:max_len] + "..."

        return text.replace('\n', ' ')

    def _get_severity_icon(self, severity: ConfirmationSeverity) -> str:
        return {
            ConfirmationSeverity.INFO: "ℹ️",
            ConfirmationSeverity.WARNING: "⚠️",
            ConfirmationSeverity.CRITICAL: "❌",
        }.get(severity, "•")

    def generate_json_report(self, result: ProcessedResult) -> str:
        data = {
            "report": result.report.to_dict(),
            "entries": [e.to_dict() for e in result.entries],
        }
        return json.dumps(data, ensure_ascii=False, indent=2)

    def save_report(
        self,
        result: ProcessedResult,
        filepath: str | Path,
        format_type: str = "text",
    ) -> None:
        path = Path(filepath)

        if format_type == "json":
            content = self.generate_json_report(result)
        else:
            content = self.generate_text_report(result)

        path.write_text(content, encoding='utf-8')


def generate_report(
    result: ProcessedResult,
    output_path: Optional[str] = None,
    format_type: str = "text",
) -> str:
    generator = ReportGenerator()
    report_text = generator.generate_text_report(result)

    if output_path:
        generator.save_report(result, output_path, format_type)

    return report_text
