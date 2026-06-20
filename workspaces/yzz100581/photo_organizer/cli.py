"""工程照片命名整理器 CLI 入口"""

import sys
import traceback
from pathlib import Path
from typing import Optional

import click

from .conflict_detector import ConflictDetector
from .preview_manager import PreviewManager, PreviewDisplay
from .file_organizer import FileOrganizer
from .report_generator import ReportGenerator
from .location_mapper import LocationMapper


@click.group()
@click.version_option(version='1.0.0', prog_name='photo-organizer')
def main():
    """工程照片命名整理器 - 按项目、楼栋、楼层、部位和拍摄日期自动整理现场照片"""
    pass


@main.command()
@click.argument('photo_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument('map_file', type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.option('--output', '-o', required=True, type=click.Path(file_okay=False, dir_okay=True),
              help='整理后的输出目录')
@click.option('--building', '-b', help='按楼栋筛选，只处理指定楼栋的照片')
@click.option('--min-size', '-m', default=100, type=int,
              help='最小照片大小(KB)，小于此值的照片进入待确认，默认100KB')
@click.option('--name-template', help='自定义命名模板，默认: {project}_{building}_{floor}_{position}_{shoot_time}')
@click.option('--copy', is_flag=True, help='复制模式，不移动原文件')
@click.option('--preview-only', is_flag=True, help='仅预览，不执行实际整理')
@click.option('--yes', '-y', is_flag=True, help='自动确认，跳过交互提示')
@click.option('--report-format', type=click.Choice(['md', 'csv', 'txt']), default='md',
              help='报告格式，默认 md')
@click.option('--no-report', is_flag=True, help='不生成报告')
def organize(
    photo_dir: str,
    map_file: str,
    output: str,
    building: Optional[str],
    min_size: int,
    name_template: Optional[str],
    copy: bool,
    preview_only: bool,
    yes: bool,
    report_format: str,
    no_report: bool,
):
    """扫描照片目录并按位置对照表整理照片"""
    try:
        click.echo(f"\n🚀 开始扫描照片...")
        click.echo(f"   照片目录: {photo_dir}")
        click.echo(f"   位置对照表: {map_file}")
        click.echo(f"   输出目录: {output}")
        if building:
            click.echo(f"   楼栋筛选: {building}")
        click.echo(f"   最小照片大小: {min_size}KB")

        detector = ConflictDetector(
            photo_dir=photo_dir,
            map_file=map_file,
            output_dir=output,
            min_size_kb=min_size,
            name_template=name_template,
            building_filter=building,
        )

        click.echo(f"\n⏳ 正在处理照片，请稍候...")
        processing_result = detector.process()

        if processing_result.total_count == 0:
            click.echo("\n⚠️  没有找到需要处理的照片。")
            click.echo("   请确认照片目录中存在以 IMG 开头的图片文件，")
            click.echo("   并且位置对照表中有对应的关键词。")
            return

        preview = PreviewManager()
        preview.show_preview(processing_result)

        if preview_only:
            click.echo("\nℹ️  预览模式结束，未执行任何文件操作。")
            return

        if not preview.confirm_execution(processing_result, auto_confirm=yes):
            click.echo("\n❌ 用户取消操作。")
            return

        click.echo(f"\n⚡ 开始执行整理...")

        organizer = FileOrganizer(dry_run=False, copy_mode=copy)
        execution_result = organizer.execute(
            processing_result,
            include_pending=True,
        )

        COLORS = {
            'green': '\033[92m',
            'yellow': '\033[93m',
            'red': '\033[91m',
            'cyan': '\033[96m',
            'reset': '\033[0m',
            'bold': '\033[1m',
        }

        click.echo(f"\n{COLORS['cyan']}{'='*60}{COLORS['reset']}")
        click.echo(f"{COLORS['bold']}{COLORS['cyan']}整理完成！{COLORS['reset']}")
        click.echo(f"{COLORS['cyan']}{'='*60}{COLORS['reset']}")
        click.echo(f"执行时间: {execution_result.execution_time.strftime('%Y-%m-%d %H:%M:%S')}")
        click.echo("")
        click.echo(f"{COLORS['green']}✅ 成功处理: {execution_result.success_count} 张{COLORS['reset']}")
        if execution_result.pending_count > 0:
            click.echo(f"{COLORS['yellow']}⚠️  移动到待确认: {execution_result.pending_count} 张{COLORS['reset']}")
        if execution_result.unrecognized_count > 0:
            click.echo(f"{COLORS['red']}❌ 保留在源目录(未识别): {execution_result.unrecognized_count} 张{COLORS['reset']}")
        if execution_result.failed_count > 0:
            click.echo(f"{COLORS['red']}❌ 失败: {execution_result.failed_count} 张{COLORS['reset']}")

        if execution_result.errors:
            click.echo(f"\n{COLORS['red']}错误详情:{COLORS['reset']}")
            for error in execution_result.errors[:10]:
                click.echo(f"  - {error}")
            if len(execution_result.errors) > 10:
                click.echo(f"  ... 还有 {len(execution_result.errors) - 10} 个错误")

        if not no_report and (execution_result.success_count > 0 or execution_result.pending_count > 0):
            try:
                report_gen = ReportGenerator()
                report_file = report_gen.generate(
                    execution_result,
                    processing_result,
                    output_dir=output,
                    format=report_format,
                )
                click.echo(f"\n{COLORS['green']}📄 对照报告已生成: {report_file}{COLORS['reset']}")
            except Exception as e:
                click.echo(f"\n{COLORS['yellow']}⚠️  报告生成失败: {e}{COLORS['reset']}")

        if execution_result.unrecognized_count > 0:
            click.echo(f"\n{COLORS['yellow']}💡 提示: 有 {execution_result.unrecognized_count} 张照片未识别位置，")
            click.echo(f"   它们保留在源目录中。请补充位置对照表后重新运行。{COLORS['reset']}")

        if execution_result.pending_count > 0:
            pending_dir = Path(output) / "_待确认"
            click.echo(f"\n{COLORS['yellow']}💡 提示: 有 {execution_result.pending_count} 张照片需要人工确认，")
            click.echo(f"   请查看 {pending_dir} 目录。{COLORS['reset']}")

    except Exception as e:
        click.echo(f"\n❌ 发生错误: {e}", err=True)
        click.echo("\n详细错误信息:", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command(name='list-buildings')
@click.argument('map_file', type=click.Path(exists=True, file_okay=True, dir_okay=False))
def list_buildings(map_file: str):
    """列出位置对照表中的所有楼栋"""
    try:
        mapper = LocationMapper(map_file)
        location_map = mapper.parse()
        buildings = location_map.get_all_buildings()

        if not buildings:
            click.echo("❌ 位置对照表中没有找到楼栋信息。")
            return

        click.echo(f"\n📋 位置对照表中的楼栋列表 ({len(buildings)} 个):")
        click.echo("-" * 40)
        for i, building in enumerate(buildings, 1):
            click.echo(f"  {i}. {building}")
        click.echo("")
        click.echo(f"💡 使用 --building 参数可以筛选指定楼栋的照片，例如:")
        click.echo(f"   photo-organizer organize 照片目录 对照表.xlsx -o 输出目录 -b \"{buildings[0]}\"")

    except Exception as e:
        click.echo(f"\n❌ 发生错误: {e}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command(name='preview')
@click.argument('photo_dir', type=click.Path(exists=True, file_okay=False, dir_okay=True))
@click.argument('map_file', type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.option('--output', '-o', required=True, type=click.Path(file_okay=False, dir_okay=True),
              help='整理后的输出目录（用于计算目标路径）')
@click.option('--building', '-b', help='按楼栋筛选')
@click.option('--min-size', '-m', default=100, type=int, help='最小照片大小(KB)')
@click.option('--name-template', help='自定义命名模板')
def preview_only(
    photo_dir: str,
    map_file: str,
    output: str,
    building: Optional[str],
    min_size: int,
    name_template: Optional[str],
):
    """仅预览整理结果，不执行实际操作"""
    try:
        detector = ConflictDetector(
            photo_dir=photo_dir,
            map_file=map_file,
            output_dir=output,
            min_size_kb=min_size,
            name_template=name_template,
            building_filter=building,
        )

        click.echo(f"\n🔍 正在扫描照片并生成预览...")
        processing_result = detector.process()

        preview = PreviewManager()
        preview.show_preview(processing_result)

        click.echo("\nℹ️  这是预览模式，未执行任何文件操作。")
        click.echo("   如果确认无误，请使用 organize 命令执行整理。")

    except Exception as e:
        click.echo(f"\n❌ 发生错误: {e}", err=True)
        traceback.print_exc()
        sys.exit(1)


@main.command()
def template():
    """显示位置对照表模板说明"""
    click.echo("""
📋 位置对照表格式说明

位置对照表支持 Excel (.xlsx) 和 CSV (.csv) 格式，必须包含以下列：

┌─────────────┬─────────────────────────────────────┐
│ 列名        │ 说明                                │
├─────────────┼─────────────────────────────────────┤
│ 原始文件名  │ 照片原始文件名（如 IMG_1234）       │
│ 项目        │ 项目名称                            │
│ 楼栋        │ 楼栋号（如 1号楼、A栋）             │
│ 楼层        │ 楼层（如 3层、地下室1层）           │
│ 部位        │ 具体部位（如 客厅、卫生间、梁）      │
└─────────────┴─────────────────────────────────────┘

关键词列支持模糊匹配，使用 * 代表任意字符：
- IMG_1234      精确匹配
- IMG_12*       匹配 IMG_12 开头的所有文件
- *客厅*        匹配文件名包含"客厅"的所有文件

示例 CSV 内容：

原始文件名,项目,楼栋,楼层,部位
IMG_0001,幸福花园,1号楼,3层,客厅
IMG_0002,幸福花园,1号楼,3层,主卧
IMG_0003,幸福花园,2号楼,5层,厨房
IMG_*,幸福花园,3号楼,*,卫生间

使用方式：
  photo-organizer organize ./照片 ./对照表.xlsx -o ./整理后
""")


if __name__ == '__main__':
    main()
