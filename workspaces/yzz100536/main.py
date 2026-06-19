#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF发票验章批处理工具
"""
import os
import sys
import logging
import click
from pathlib import Path

from invoice_checker import (
    InvoiceVerifier,
    VerificationReport,
    Config,
)
from invoice_checker.report_generator import ReportGenerator
from invoice_checker.reimbursement_reader import ReimbursementReader

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('invoice_checker.log', encoding='utf-8'),
    ]
)
logger = logging.getLogger(__name__)


@click.group()
@click.version_option(version='1.0.0')
def cli():
    """PDF发票验章批处理工具"""
    pass


@cli.command()
@click.option('--invoices', '-i', required=True, type=click.Path(exists=True, file_okay=False),
              help='发票PDF所在目录')
@click.option('--reimbursement', '-r', required=True, type=click.Path(exists=True, dir_okay=False),
              help='报销表文件路径 (Excel或CSV)')
@click.option('--output', '-o', default='./output', type=click.Path(),
              help='报告输出目录 (默认: ./output)')
@click.option('--high-value', default=10000.0, type=float,
              help='高金额阈值 (默认: 10000元)')
@click.option('--formats', '-f', multiple=True, default=['xlsx', 'txt', 'md'],
              type=click.Choice(['xlsx', 'txt', 'md']),
              help='输出格式 (可多选，默认: xlsx txt md)')
@click.option('--no-console', is_flag=True,
              help='不打印控制台汇总')
def verify(invoices, reimbursement, output, high_value, formats, no_console):
    """批量核验发票并生成报告"""
    try:
        click.echo(f"开始核验...")
        click.echo(f"  发票目录: {invoices}")
        click.echo(f"  报销表: {reimbursement}")
        click.echo(f"  输出目录: {output}")
        click.echo(f"  高金额阈值: ¥{high_value:,.2f}")
        click.echo("")

        config = Config()
        config.HIGH_VALUE_THRESHOLD = high_value

        verifier = InvoiceVerifier(config)

        with click.progressbar(label="正在解析和核验发票", length=100) as bar:
            report = verifier.verify_batch(invoices, reimbursement, output)
            bar.update(100)

        report_generator = ReportGenerator(config)

        if not no_console:
            report_generator.print_console_summary(report)

        click.echo("正在生成报告...")
        output_files = report_generator.generate(report, output, list(formats))

        click.echo("")
        click.echo(click.style("核验完成！", fg='green', bold=True))
        click.echo("")
        click.echo("报告文件:")
        for fmt, path in output_files.items():
            click.echo(f"  {fmt.upper()}: {path}")

        total_approved = sum(r.total_amount for r in report.approved)
        total_review = sum(r.total_amount for r in report.need_review)
        total_dup = sum(r.total_amount for r in report.duplicates)

        click.echo("")
        click.echo("金额汇总:")
        click.echo(f"  可报销: ¥{total_approved:,.2f}")
        if total_review > 0:
            click.echo(f"  待核验: ¥{total_review:,.2f}")
        if total_dup > 0:
            click.echo(f"  疑似重复: ¥{total_dup:,.2f}")

        return 0

    except Exception as e:
        logger.error(f"核验失败: {str(e)}", exc_info=True)
        click.echo(click.style(f"错误: {str(e)}", fg='red'), err=True)
        return 1


@cli.command()
@click.option('--reimbursement', '-r', required=True, type=click.Path(exists=True, dir_okay=False),
              help='报销表文件路径')
@click.option('--rows', default=5, type=int, help='预览行数')
def preview(reimbursement, rows):
    """预览报销表结构和数据"""
    try:
        reader = ReimbursementReader()
        info = reader.preview(reimbursement, rows)

        click.echo(f"报销表: {reimbursement}")
        click.echo(f"表头行: 第 {info['header_row'] + 1} 行")
        click.echo("")
        click.echo("检测到的列:")
        for field, col in info['column_mapping'].items():
            field_cn = {
                'buyer_name': '购方抬头',
                'amount': '金额',
                'project_remark': '项目备注',
                'invoice_number': '发票号码',
                'applicant': '申请人',
                'department': '部门',
            }.get(field, field)
            click.echo(f"  {field_cn} -> 列「{col}」")

        click.echo("")
        click.echo(f"前 {rows} 行数据:")
        for i, row in enumerate(info['sample_data'], 1):
            click.echo(f"  行 {i}: {row}")

        return 0

    except Exception as e:
        logger.error(f"预览失败: {str(e)}", exc_info=True)
        click.echo(click.style(f"错误: {str(e)}", fg='red'), err=True)
        return 1


@cli.command()
@click.option('--pdf', '-p', required=True, type=click.Path(exists=True, dir_okay=False),
              help='单个发票PDF文件路径')
@click.option('--reimbursement', '-r', type=click.Path(exists=True, dir_okay=False),
              help='对应的报销表（可选）')
def parse(pdf, reimbursement):
    """解析单个发票PDF，查看识别结果"""
    try:
        from invoice_checker.pdf_parser import PDFInvoiceParser
        from invoice_checker.seal_verifier import SealVerifier
        from rich.console import Console
        from rich.table import Table

        config = Config()
        parser = PDFInvoiceParser(config)
        seal_verifier = SealVerifier(config)

        click.echo(f"解析发票: {pdf}")
        click.echo("")

        invoice = parser.parse(pdf)
        invoice.seal_status = seal_verifier.verify(invoice)

        console = Console()

        table = Table(title="发票信息")
        table.add_column("字段", style="cyan")
        table.add_column("值")

        table.add_row("文件路径", invoice.file_path)
        table.add_row("发票号码", invoice.invoice_number or "未识别")
        table.add_row("发票代码", invoice.invoice_code or "未识别")
        table.add_row("开票日期", invoice.invoice_date.strftime('%Y-%m-%d') if invoice.invoice_date else "未识别")
        table.add_row("发票类型", invoice.invoice_type.value if invoice.invoice_type else "未知")
        table.add_row("购方名称", invoice.buyer_name or "未识别")
        table.add_row("购方税号", invoice.buyer_tax_code or "未识别")
        table.add_row("销方名称", invoice.seller_name or "未识别")
        table.add_row("销方税号", invoice.seller_tax_code or "未识别")
        table.add_row("不含税金额", f"¥{invoice.amount_without_tax:,.2f}" if invoice.amount_without_tax else "未识别")
        table.add_row("税额", f"¥{invoice.tax_amount:,.2f}" if invoice.tax_amount else "未识别")
        table.add_row("价税合计(小写)", f"¥{invoice.total_amount:,.2f}" if invoice.total_amount else "未识别")
        table.add_row("价税合计(大写)", invoice.total_amount_cn or "未识别")
        table.add_row("发票章状态", invoice.seal_status.value)
        table.add_row("是否扫描件", "是" if invoice.is_scanned else "否")
        table.add_row("是否OCR识别", "是" if invoice.ocr_used else "否")
        table.add_row("是否红冲", "是" if invoice.is_red_flush else "否")
        table.add_row("解析可信度", f"{invoice.parse_confidence:.0%}")

        console.print(table)

        if invoice.raw_text:
            with console.pager():
                console.print("原始文本:")
                console.print(invoice.raw_text[:2000] + "..." if len(invoice.raw_text) > 2000 else invoice.raw_text)

        return 0

    except Exception as e:
        logger.error(f"解析失败: {str(e)}", exc_info=True)
        click.echo(click.style(f"错误: {str(e)}", fg='red'), err=True)
        return 1


def main():
    try:
        return cli(standalone_mode=False)
    except click.exceptions.Abort:
        click.echo("\n已取消操作")
        return 0
    except Exception as e:
        logger.error(f"程序异常: {str(e)}", exc_info=True)
        click.echo(click.style(f"\n程序异常: {str(e)}", fg='red'), err=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
