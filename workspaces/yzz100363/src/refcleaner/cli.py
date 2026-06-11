"""CLI 主入口"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import click

from .formatter import OutputFormat, get_available_formats
from .parsers import parse_file, parse_text
from .pipeline import ReferencePipeline
from .report import ReportGenerator


@click.group()
@click.version_option(version='0.1.0')
def main() -> None:
    """参考文献清洗补全工具 - 规范 DOI、去重、按格式输出"""
    pass


@main.command()
@click.argument('input_file', type=click.Path(exists=True, dir_okay=False))
@click.option('--output', '-o', type=click.Path(dir_okay=False), help='输出参考文献列表文件')
@click.option('--report', '-r', type=click.Path(dir_okay=False), help='输出处理报告文件')
@click.option(
    '--format', '-f',
    'output_format',
    default=OutputFormat.GB7714,
    type=click.Choice([OutputFormat.GB7714, OutputFormat.APA, OutputFormat.MLA, OutputFormat.SIMPLE]),
    help=f'输出格式，默认: {OutputFormat.GB7714}',
)
@click.option('--threshold', '-t', default=75.0, type=float, help='重复检测相似度阈值 (0-100)，默认: 75')
@click.option('--bibtex-output', '-b', type=click.Path(dir_okay=False), help='输出 BibTeX 文件')
@click.option('--include-original-position/--no-original-position', default=False, help='在输出中包含原始位置标记')
@click.option('--json-report', type=click.Path(dir_okay=False), help='输出 JSON 格式报告')
@click.option('--quiet', '-q', is_flag=True, help='不打印报告到控制台')
def clean(
    input_file: str,
    output: Optional[str],
    report: Optional[str],
    output_format: str,
    threshold: float,
    bibtex_output: Optional[str],
    include_original_position: bool,
    json_report: Optional[str],
    quiet: bool,
) -> None:
    """清洗参考文献文件，支持纯文本和 BibTeX 格式"""

    click.echo(f"📖 读取文件: {input_file}")

    try:
        entries = parse_file(input_file)
    except Exception as e:
        click.echo(f"❌ 解析文件失败: {e}", err=True)
        sys.exit(1)

    click.echo(f"✅ 解析到 {len(entries)} 条参考文献")

    pipeline = ReferencePipeline(
        output_format=output_format,
        similarity_threshold=threshold,
        preserve_original_order=True,
        include_original_position=include_original_position,
    )

    with click.progressbar(length=100, label='处理中') as bar:  # type: ignore
        result = pipeline.process(entries)
        bar.update(100)

    rep_generator = ReportGenerator()
    report_text = rep_generator.generate_text_report(result)

    if not quiet:
        click.echo("")
        click.echo(report_text)

    formatted_output = pipeline.format_output(result)

    if output:
        Path(output).write_text(formatted_output, encoding='utf-8')
        click.echo(f"💾 参考文献列表已保存到: {output}")
    elif not quiet:
        click.echo("")
        click.echo("=" * 70)
        click.echo("输出参考文献列表（可直接粘贴到 Word）:")
        click.echo("=" * 70)
        click.echo("")
        click.echo(formatted_output)

    if report:
        rep_generator.save_report(result, report, 'text')
        click.echo(f"💾 处理报告已保存到: {report}")

    if json_report:
        rep_generator.save_report(result, json_report, 'json')
        click.echo(f"💾 JSON 报告已保存到: {json_report}")

    if bibtex_output:
        bibtex = pipeline.format_bibtex(result)
        Path(bibtex_output).write_text(bibtex, encoding='utf-8')
        click.echo(f"💾 BibTeX 文件已保存到: {bibtex_output}")

    rpt = result.report
    if rpt.consult_advisor_count > 0:
        click.echo("")
        click.echo(
            click.style(
                f"⚠️  有 {rpt.consult_advisor_count} 条文献需要咨询导师，请查看报告",
                fg='yellow',
                bold=True,
            )
        )


@main.command('clean-text')
@click.argument('input_text', required=False)
@click.option('--input-file', type=click.Path(exists=True, dir_okay=False), help='从文件读取文本')
@click.option('--output', '-o', type=click.Path(dir_okay=False), help='输出参考文献列表文件')
@click.option(
    '--format', '-f',
    'output_format',
    default=OutputFormat.GB7714,
    type=click.Choice([OutputFormat.GB7714, OutputFormat.APA, OutputFormat.MLA, OutputFormat.SIMPLE]),
    help='输出格式',
)
@click.option('--threshold', '-t', default=75.0, type=float, help='重复检测相似度阈值')
@click.option('--include-original-position/--no-original-position', default=False, help='包含原始位置标记')
def clean_text(
    input_text: Optional[str],
    input_file: Optional[str],
    output: Optional[str],
    output_format: str,
    threshold: float,
    include_original_position: bool,
) -> None:
    """直接清洗文本内容，支持从标准输入或文件读取"""

    if input_file:
        text = Path(input_file).read_text(encoding='utf-8')
    elif input_text:
        text = input_text
    else:
        text = click.get_text_stream('stdin').read()

    if not text.strip():
        click.echo("❌ 没有输入内容", err=True)
        sys.exit(1)

    entries = parse_text(text, 'text')
    click.echo(f"✅ 解析到 {len(entries)} 条参考文献")

    pipeline = ReferencePipeline(
        output_format=output_format,
        similarity_threshold=threshold,
        preserve_original_order=True,
        include_original_position=include_original_position,
    )

    result = pipeline.process(entries)
    formatted_output = pipeline.format_output(result)

    rep_generator = ReportGenerator()
    click.echo("")
    click.echo(rep_generator.generate_text_report(result))

    if output:
        Path(output).write_text(formatted_output, encoding='utf-8')
        click.echo(f"💾 参考文献列表已保存到: {output}")
    else:
        click.echo("")
        click.echo("=" * 70)
        click.echo("输出参考文献列表:")
        click.echo("=" * 70)
        click.echo("")
        click.echo(formatted_output)


@main.command('formats')
def list_formats() -> None:
    """列出支持的输出格式"""
    formats = get_available_formats()
    click.echo("支持的输出格式:")
    click.echo("")
    for fmt, desc in formats.items():
        click.echo(f"  {fmt:<10} - {desc}")


@main.command()
@click.argument('input_file', type=click.Path(exists=True, dir_okay=False))
@click.option('--output', '-o', type=click.Path(dir_okay=False), help='输出文件')
@click.option('--entry-type', type=click.Choice(['article', 'book', 'thesis', 'all']), default='all', help='按类型筛选')
@click.option('--sort-by', type=click.Choice(['original', 'author', 'year']), default='original', help='排序方式')
def filter(
    input_file: str,
    output: Optional[str],
    entry_type: str,
    sort_by: str,
) -> None:
    """筛选和排序参考文献（不进行去重等处理）"""

    entries = parse_file(input_file)

    if entry_type != 'all':
        entries = [e for e in entries if e.entry_type.value == entry_type]

    if sort_by == 'author':
        entries.sort(key=lambda e: (e.authors[0] if e.authors else ''))
    elif sort_by == 'year':
        entries.sort(key=lambda e: (e.year or 0))

    pipeline = ReferencePipeline(preserve_original_order=(sort_by == 'original'))
    result = pipeline.process(entries)
    formatted = pipeline.format_output(result)

    if output:
        Path(output).write_text(formatted, encoding='utf-8')
        click.echo(f"💾 已保存到: {output}")
    else:
        click.echo(formatted)


@main.command()
def info() -> None:
    """显示工具信息和使用说明"""
    click.echo("""
📚 参考文献清洗补全工具 (refcleaner)
======================================

功能特性:
  📝 读取纯文本或 BibTeX 格式参考文献
  🔗 规范 DOI 格式，自动提取并统一大小写
  🔍 智能检测重复文献（DOI、标题、作者相似度）
  ✅ 自动修复中文标点等常见问题
  ⚠️  生成待确认清单，标记需要咨询导师的条目
  📄 按学校要求输出格式（GB/T 7714、APA、MLA 等）
  🔢 保留原始顺序，重复运行结果一致
  📍 保留原始位置索引，方便回溯

使用示例:

  1. 清洗一个文本文件，输出 GB7714 格式:
     $ refcleaner clean references.txt -o cleaned.txt

  2. 清洗 BibTeX 文件，同时输出报告和 BibTeX:
     $ refcleaner clean refs.bib -o cleaned.txt -r report.txt -b cleaned.bib

  3. 使用 APA 格式，设置更高的重复检测阈值:
     $ refcleaner clean refs.txt -f apa -t 85

  4. 从标准输入读取文本:
     $ cat refs.txt | refcleaner clean-text

  5. 列出支持的格式:
     $ refcleaner formats

返回码:
  0 - 成功
  1 - 错误
""")


if __name__ == '__main__':
    main()
