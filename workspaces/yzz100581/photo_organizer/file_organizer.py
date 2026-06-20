"""文件整理执行器 - 实际执行文件重命名和移动操作"""

import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from .naming_engine import NameGenerationResult
from .conflict_detector import ProcessingResult


@dataclass
class ExecutionResult:
    """执行结果"""
    success_count: int = 0
    failed_count: int = 0
    pending_count: int = 0
    unrecognized_count: int = 0
    success_files: List[tuple] = field(default_factory=list)
    failed_files: List[tuple] = field(default_factory=list)
    pending_files: List[tuple] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    execution_time: datetime = field(default_factory=datetime.now)

    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count

    def add_success(self, original: str, new: str, category: str = "success"):
        self.success_count += 1
        self.success_files.append((original, new, category))

    def add_failed(self, original: str, error: str):
        self.failed_count += 1
        self.failed_files.append((original, error))
        self.errors.append(f"{original}: {error}")

    def add_pending(self, original: str, new: str):
        self.pending_count += 1
        self.pending_files.append((original, new))


class FileOrganizer:
    """文件整理执行器"""

    def __init__(self, dry_run: bool = False, copy_mode: bool = False):
        self.dry_run = dry_run
        self.copy_mode = copy_mode
        self.created_dirs = set()

    def execute(
        self,
        processing_result: ProcessingResult,
        include_pending: bool = True,
    ) -> ExecutionResult:
        """执行文件整理"""
        exec_result = ExecutionResult()

        for result in processing_result.success_results:
            self._process_single(result, exec_result, "success")

        if include_pending:
            for result in processing_result.pending_results:
                self._process_single(result, exec_result, "pending")

            for result in processing_result.conflicts:
                self._process_single(result, exec_result, "pending")

        exec_result.unrecognized_count = processing_result.unrecognized_count

        return exec_result

    def _process_single(
        self,
        result: NameGenerationResult,
        exec_result: ExecutionResult,
        category: str,
    ) -> None:
        """处理单个文件"""
        try:
            src_path = Path(result.original_path)
            dst_path = Path(result.new_full_path)

            if not src_path.exists():
                raise FileNotFoundError(f"源文件不存在: {src_path}")

            if not self.dry_run:
                self._ensure_directory(dst_path.parent)

                if self.copy_mode:
                    shutil.copy2(str(src_path), str(dst_path))
                else:
                    shutil.move(str(src_path), str(dst_path))

            if category == "success":
                exec_result.add_success(
                    str(src_path),
                    str(dst_path),
                    "success"
                )
            else:
                exec_result.add_pending(
                    str(src_path),
                    str(dst_path)
                )
                exec_result.add_success(
                    str(src_path),
                    str(dst_path),
                    "pending"
                )

        except Exception as e:
            exec_result.add_failed(result.original_path, str(e))

    def _ensure_directory(self, dir_path: Path) -> None:
        """确保目录存在"""
        if str(dir_path) not in self.created_dirs:
            dir_path.mkdir(parents=True, exist_ok=True)
            self.created_dirs.add(str(dir_path))

    def print_execution_summary(self, exec_result: ExecutionResult) -> None:
        """打印执行摘要"""
        print(f"\n{'='*60}")
        print(f"{self.dry_run and '[预览模式] ' or ''}整理完成！")
        print(f"{'='*60}")
        print(f"执行时间: {exec_result.execution_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"\n统计:")
        print(f"  ✅ 成功处理: {exec_result.success_count} 张")
        if exec_result.pending_count > 0:
            print(f"  ⚠️  移动到待确认: {exec_result.pending_count} 张")
        if exec_result.unrecognized_count > 0:
            print(f"  ❌ 保留在源目录(未识别): {exec_result.unrecognized_count} 张")
        if exec_result.failed_count > 0:
            print(f"  ❌ 失败: {exec_result.failed_count} 张")

        if exec_result.errors:
            print(f"\n错误详情:")
            for error in exec_result.errors[:10]:
                print(f"  - {error}")
            if len(exec_result.errors) > 10:
                print(f"  ... 还有 {len(exec_result.errors) - 10} 个错误")

        if self.dry_run:
            print(f"\n这是预览模式，未实际移动文件。")
