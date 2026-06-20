"""报告生成器 - 生成原名到新名的对照报告"""

import csv
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List
from datetime import datetime

from .file_organizer import ExecutionResult
from .conflict_detector import ProcessingResult
from .naming_engine import NameGenerationResult


@dataclass
class ReportGenerator:
    """报告生成器"""

    OUTPUT_FORMATS = ['txt', 'csv', 'md']

    def generate(
        self,
        execution_result: ExecutionResult,
        processing_result: ProcessingResult,
        output_dir: str,
        format: str = 'md',
    ) -> str:
        """生成对照报告"""
        if format not in self.OUTPUT_FORMATS:
            raise ValueError(f"不支持的报告格式: {format}，支持: {', '.join(self.OUTPUT_FORMATS)}")

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = output_path / f"照片整理报告_{timestamp}.{format}"

        if format == 'md':
            content = self._generate_markdown(execution_result, processing_result)
        elif format == 'csv':
            content = self._generate_csv(execution_result, processing_result)
        else:
            content = self._generate_text(execution_result, processing_result)

        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(content)

        return str(report_file)

    def _generate_markdown(
        self,
        exec_result: ExecutionResult,
        proc_result: ProcessingResult,
    ) -> str:
        """生成 Markdown 格式报告"""
        lines = []

        lines.append("# 工程照片整理报告")
        lines.append("")
        lines.append(f"**生成时间**: {exec_result.execution_time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("## 整理统计")
        lines.append("")
        lines.append("| 类别 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| ✅ 成功处理 | {exec_result.success_count} |")
        lines.append(f"| ⚠️  移动到待确认 | {exec_result.pending_count} |")
        lines.append(f"| ❌ 保留在源目录(未识别) | {exec_result.unrecognized_count} |")
        lines.append(f"| ❌ 失败 | {exec_result.failed_count} |")
        lines.append(f"| **总计** | **{proc_result.total_count}** |")
        lines.append("")

        if exec_result.success_files:
            lines.append("## 成功处理的照片")
            lines.append("")
            lines.append("| 序号 | 原文件名 | 新文件名 | 新路径 | 类别 |")
            lines.append("|------|----------|----------|--------|------|")
            for i, (orig, new, category) in enumerate(exec_result.success_files, 1):
                cat_label = "✅ 成功" if category == "success" else "⚠️ 待确认"
                lines.append(f"| {i} | `{Path(orig).name}` | `{Path(new).name}` | `{new}` | {cat_label} |")
            lines.append("")

        if proc_result.unrecognized_results:
            lines.append("## 未识别位置的照片（保留在源目录）")
            lines.append("")
            lines.append("| 序号 | 原文件名 | 文件大小 | 拍摄时间 |")
            lines.append("|------|----------|----------|----------|")
            for i, result in enumerate(proc_result.unrecognized_results, 1):
                lines.append(
                    f"| {i} | `{result.original_name}` | "
                    f"{result.metadata.file_size_str} | "
                    f"{result.metadata.shoot_time_str} |"
                )
            lines.append("")

        if exec_result.failed_files:
            lines.append("## 处理失败的照片")
            lines.append("")
            lines.append("| 序号 | 原文件名 | 错误信息 |")
            lines.append("|------|----------|----------|")
            for i, (orig, error) in enumerate(exec_result.failed_files, 1):
                lines.append(f"| {i} | `{Path(orig).name}` | {error} |")
            lines.append("")

        lines.append("## 备注")
        lines.append("")
        lines.append("- 未识别位置的照片保留在源目录，需要补充位置对照表后重新整理")
        lines.append("- 待确认目录的照片需要人工核对后手动归类")
        lines.append("- 报告中所有路径均为绝对路径")
        lines.append("")

        return "\n".join(lines)

    def _generate_csv(
        self,
        exec_result: ExecutionResult,
        proc_result: ProcessingResult,
    ) -> str:
        """生成 CSV 格式报告"""
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["工程照片整理报告"])
        writer.writerow([f"生成时间: {exec_result.execution_time.strftime('%Y-%m-%d %H:%M:%S')}"])
        writer.writerow([])

        writer.writerow(["类别", "数量"])
        writer.writerow(["成功处理", exec_result.success_count])
        writer.writerow(["移动到待确认", exec_result.pending_count])
        writer.writerow(["保留在源目录(未识别)", exec_result.unrecognized_count])
        writer.writerow(["失败", exec_result.failed_count])
        writer.writerow(["总计", proc_result.total_count])
        writer.writerow([])

        writer.writerow(["=== 成功处理的照片 ==="])
        writer.writerow(["序号", "原文件名", "原路径", "新文件名", "新路径", "类别"])
        for i, (orig, new, category) in enumerate(exec_result.success_files, 1):
            writer.writerow([
                i,
                Path(orig).name,
                orig,
                Path(new).name,
                new,
                category
            ])
        writer.writerow([])

        if proc_result.unrecognized_results:
            writer.writerow(["=== 未识别位置的照片（保留在源目录） ==="])
            writer.writerow(["序号", "原文件名", "原路径", "文件大小", "拍摄时间"])
            for i, result in enumerate(proc_result.unrecognized_results, 1):
                writer.writerow([
                    i,
                    result.original_name,
                    result.original_path,
                    result.metadata.file_size_str,
                    result.metadata.shoot_time_str
                ])
            writer.writerow([])

        if exec_result.failed_files:
            writer.writerow(["=== 处理失败的照片 ==="])
            writer.writerow(["序号", "原文件名", "原路径", "错误信息"])
            for i, (orig, error) in enumerate(exec_result.failed_files, 1):
                writer.writerow([i, Path(orig).name, orig, error])

        return output.getvalue()

    def _generate_text(
        self,
        exec_result: ExecutionResult,
        proc_result: ProcessingResult,
    ) -> str:
        """生成纯文本格式报告"""
        lines = []

        lines.append("=" * 60)
        lines.append("工程照片整理报告")
        lines.append("=" * 60)
        lines.append(f"生成时间: {exec_result.execution_time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("-" * 60)
        lines.append("整理统计")
        lines.append("-" * 60)
        lines.append(f"✅ 成功处理: {exec_result.success_count} 张")
        lines.append(f"⚠️  移动到待确认: {exec_result.pending_count} 张")
        lines.append(f"❌ 保留在源目录(未识别): {exec_result.unrecognized_count} 张")
        lines.append(f"❌ 失败: {exec_result.failed_count} 张")
        lines.append(f"总计: {proc_result.total_count} 张")
        lines.append("")

        if exec_result.success_files:
            lines.append("-" * 60)
            lines.append("成功处理的照片")
            lines.append("-" * 60)
            for i, (orig, new, category) in enumerate(exec_result.success_files, 1):
                cat = "✅" if category == "success" else "⚠️"
                lines.append(f"{i}. {cat} {Path(orig).name}")
                lines.append(f"   → {new}")
            lines.append("")

        if proc_result.unrecognized_results:
            lines.append("-" * 60)
            lines.append("未识别位置的照片（保留在源目录）")
            lines.append("-" * 60)
            for i, result in enumerate(proc_result.unrecognized_results, 1):
                lines.append(
                    f"{i}. ❌ {result.original_name} "
                    f"({result.metadata.file_size_str}, {result.metadata.shoot_time_str})"
                )
            lines.append("")

        if exec_result.failed_files:
            lines.append("-" * 60)
            lines.append("处理失败的照片")
            lines.append("-" * 60)
            for i, (orig, error) in enumerate(exec_result.failed_files, 1):
                lines.append(f"{i}. ❌ {Path(orig).name}")
                lines.append(f"   错误: {error}")
            lines.append("")

        lines.append("=" * 60)
        lines.append("备注:")
        lines.append("  - 未识别位置的照片保留在源目录，需要补充位置对照表后重新整理")
        lines.append("  - 待确认目录的照片需要人工核对后手动归类")
        lines.append("=" * 60)

        return "\n".join(lines)
