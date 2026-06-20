"""预览管理器 - 展示预览结果并处理用户确认流程"""

from dataclasses import dataclass
from typing import List
from pathlib import Path

from .conflict_detector import ProcessingResult
from .naming_engine import NameGenerationResult, NamingEngine


@dataclass
class PreviewDisplay:
    """预览展示配置"""
    show_success: bool = True
    show_pending: bool = True
    show_unrecognized: bool = True
    show_conflicts: bool = True
    max_items_per_group: int = 50


class PreviewManager:
    """预览管理器"""

    COLORS = {
        'green': '\033[92m',
        'yellow': '\033[93m',
        'red': '\033[91m',
        'cyan': '\033[96m',
        'reset': '\033[0m',
        'bold': '\033[1m',
    }

    def __init__(self, display: PreviewDisplay = None):
        self.display = display or PreviewDisplay()

    def show_preview(self, result: ProcessingResult) -> None:
        """展示预览结果"""
        self._print_header(result)

        if self.display.show_success and result.success_results:
            self._print_group("成功处理", result.success_results, 'green')

        if self.display.show_pending and result.pending_results:
            self._print_group("待确认", result.pending_results, 'yellow')

        if self.display.show_unrecognized and result.unrecognized_results:
            self._print_group("未识别位置（将留在待整理目录）", result.unrecognized_results, 'red')

        if self.display.show_conflicts and result.conflicts:
            self._print_group("文件名冲突", result.conflicts, 'red')

        self._print_summary(result)

    def confirm_execution(self, result: ProcessingResult, auto_confirm: bool = False) -> bool:
        """询问用户是否确认执行"""
        if result.total_count == 0:
            print("\n没有找到需要处理的照片。")
            return False

        if auto_confirm:
            return True

        if result.unrecognized_count > 0:
            print(f"\n{self.COLORS['yellow']}⚠️  有 {result.unrecognized_count} 张照片未识别位置，")
            print(f"   将保留在源目录中，不会被移动。{self.COLORS['reset']}")

        if result.pending_count > 0:
            print(f"\n{self.COLORS['yellow']}⚠️  有 {result.pending_count} 张照片需要人工确认，")
            print(f"   将移动到 _待确认 目录。{self.COLORS['reset']}")

        if result.success_count > 0:
            print(f"\n{self.COLORS['green']}✅  有 {result.success_count} 张照片将被自动整理。{self.COLORS['reset']}")

        while True:
            response = input(f"\n{self.COLORS['bold']}是否继续执行整理？(y/N): {self.COLORS['reset']}").strip().lower()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no', '']:
                return False
            else:
                print("请输入 y 或 n。")

    def confirm_individual(self, results: List[NameGenerationResult]) -> List[NameGenerationResult]:
        """逐个确认待处理项目"""
        confirmed = []
        for i, result in enumerate(results, 1):
            print(f"\n{self.COLORS['bold']}--- 第 {i}/{len(results)} 项 ---{self.COLORS['reset']}")
            self._print_single_result(result)

            while True:
                response = input(f"{self.COLORS['bold']}确认重命名此文件？(y/N/s): {self.COLORS['reset']}").strip().lower()
                if response in ['y', 'yes']:
                    confirmed.append(result)
                    break
                elif response in ['n', 'no', '']:
                    break
                elif response in ['s', 'skip']:
                    break
                else:
                    print("请输入 y（确认）、n（跳过）或 s（全部跳过）。")
                    if response in ['s', 'skip']:
                        return confirmed

        return confirmed

    def _print_header(self, result: ProcessingResult) -> None:
        """打印预览头部"""
        print(f"\n{self.COLORS['bold']}{self.COLORS['cyan']}═══════════════════════════════════════════════════════════{self.COLORS['reset']}")
        print(f"{self.COLORS['bold']}{self.COLORS['cyan']}              工程照片命名整理器 - 预览结果{self.COLORS['reset']}")
        print(f"{self.COLORS['bold']}{self.COLORS['cyan']}═══════════════════════════════════════════════════════════{self.COLORS['reset']}\n")
        print(f"共扫描到 {result.total_count} 张照片：")
        print(f"  ✅ 成功: {result.success_count} 张")
        print(f"  ⚠️  待确认: {result.pending_count} 张")
        print(f"  ❌ 未识别位置: {result.unrecognized_count} 张")
        if result.conflicts:
            print(f"  ⚠️  冲突: {len(result.conflicts)} 张")

    def _print_group(self, title: str, results: List[NameGenerationResult], color: str) -> None:
        """打印一组结果"""
        color_code = self.COLORS.get(color, '')
        print(f"\n{color_code}{self.COLORS['bold']}--- {title} ({len(results)} 张) ---{self.COLORS['reset']}")

        display_results = results[:self.display.max_items_per_group]
        for result in display_results:
            self._print_single_result(result)

        if len(results) > self.display.max_items_per_group:
            print(f"  ... 还有 {len(results) - self.display.max_items_per_group} 张未显示")

    def _print_single_result(self, result: NameGenerationResult) -> None:
        """打印单个结果"""
        original_name = result.original_name
        new_path = result.new_full_path

        if result.needs_confirmation:
            status = f"{self.COLORS['yellow']}[待确认]{self.COLORS['reset']}"
        else:
            status = f"{self.COLORS['green']}[成功]{self.COLORS['reset']}"

        if NamingEngine.ISSUE_NO_LOCATION in result.issues:
            status = f"{self.COLORS['red']}[未识别]{self.COLORS['reset']}"

        print(f"\n  {status} {original_name}")

        if NamingEngine.ISSUE_NO_LOCATION in result.issues:
            print(f"     → 保留在源目录 (未识别位置)")
        else:
            print(f"     → {new_path}")

        if result.issues:
            for issue in result.issues:
                print(f"     {self.COLORS['yellow']}原因: {issue}{self.COLORS['reset']}")

        if result.location_info and result.location_info.is_partial():
            loc = result.location_info
            print(f"     位置信息: {loc.project} / {loc.building} / {loc.floor} / {loc.position}")

    def _print_summary(self, result: ProcessingResult) -> None:
        """打印总结"""
        print(f"\n{self.COLORS['bold']}{self.COLORS['cyan']}───────────────────────────────────────────────────────────{self.COLORS['reset']}")
        print(f"{self.COLORS['bold']}汇总:{self.COLORS['reset']}")
        print(f"  待整理目录: 未识别位置的 {result.unrecognized_count} 张照片将保留在源目录")
        if result.pending_count > 0:
            print(f"  _待确认目录: {result.pending_count} 张照片需要人工确认")
        if result.success_count > 0:
            print(f"  目标目录: {result.success_count} 张照片将自动归类到项目/楼栋/楼层/部位")
