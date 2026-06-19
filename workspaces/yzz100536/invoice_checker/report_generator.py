import os
import logging
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

import pandas as pd

from .models import (
    VerificationReport,
    VerificationResult,
    InvoiceStatus,
    SealStatus,
)
from .config import Config
from .anomaly_detector import AnomalyDetector

logger = logging.getLogger(__name__)


class ReportGenerator:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.anomaly_detector = AnomalyDetector(self.config)

    def generate(
        self,
        report: VerificationReport,
        output_dir: str,
        formats: Optional[List[str]] = None,
    ) -> Dict[str, str]:
        formats = formats or ['xlsx', 'txt', 'md']

        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_files = {}

        anomaly_summary = self.anomaly_detector.generate_anomaly_summary(
            report.approved + report.need_review + report.duplicates
        )

        all_results = report.approved + report.need_review + report.duplicates

        for fmt in formats:
            base_name = f"发票核验报告_{timestamp}"
            if fmt == 'xlsx':
                file_path = os.path.join(output_dir, f"{base_name}.xlsx")
                self._generate_excel(report, file_path, anomaly_summary)
                output_files['excel'] = file_path
            elif fmt == 'txt':
                file_path = os.path.join(output_dir, f"{base_name}.txt")
                self._generate_text(report, file_path, anomaly_summary)
                output_files['text'] = file_path
            elif fmt == 'md':
                file_path = os.path.join(output_dir, f"{base_name}.md")
                self._generate_markdown(report, file_path, anomaly_summary)
                output_files['markdown'] = file_path

        logger.info(f"Generated {len(output_files)} report files to {output_dir}")
        return output_files

    def _generate_excel(
        self,
        report: VerificationReport,
        file_path: str,
        anomaly_summary: Dict,
    ):
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            self._write_summary_sheet(writer, report, anomaly_summary)
            self._write_result_sheet(writer, '可报销清单', report.approved, report.high_value_threshold)
            self._write_result_sheet(writer, '需人工核验', report.need_review, report.high_value_threshold, is_review=True)
            self._write_result_sheet(writer, '疑似重复', report.duplicates, report.high_value_threshold, is_duplicate=True)
            self._write_anomaly_sheet(writer, anomaly_summary)

    def _write_summary_sheet(self, writer, report: VerificationReport, anomaly_summary: Dict):
        data = {
            '项目': [
                '生成时间',
                '发票总数',
                '可报销数量',
                '需人工核验数量',
                '疑似重复数量',
                '',
                '高金额阈值',
                '异常总数',
                '- 红冲发票',
                '- 扫描版发票',
                '- 金额大小写不一致',
                '- 重复/跨项目报销',
                '- 发票章问题',
                '- 信息不匹配',
                '- 其他问题',
            ],
            '数值': [
                report.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
                report.total_invoices,
                report.approved_count,
                report.need_review_count,
                report.duplicate_count,
                '',
                f"¥{report.high_value_threshold:,.2f}",
                anomaly_summary.get('total_anomalies', 0),
                anomaly_summary.get('by_type', {}).get('red_flush', 0),
                anomaly_summary.get('by_type', {}).get('scanned', 0),
                anomaly_summary.get('by_type', {}).get('amount_mismatch', 0),
                anomaly_summary.get('by_type', {}).get('duplicate', 0),
                anomaly_summary.get('by_type', {}).get('seal_issue', 0),
                anomaly_summary.get('by_type', {}).get('mismatch', 0),
                anomaly_summary.get('by_type', {}).get('other', 0),
            ],
        }
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='统计概览', index=False)

        high_value = anomaly_summary.get('high_value_anomalies', [])
        if high_value:
            hv_data = {
                '发票号码': [h.get('invoice_number', '') for h in high_value],
                '金额': [h.get('amount', 0) for h in high_value],
                '问题': ['; '.join(h.get('issues', [])) for h in high_value],
                '文件路径': [h.get('file', '') for h in high_value],
            }
            df_hv = pd.DataFrame(hv_data)
            df_hv.to_excel(writer, sheet_name='高金额疑点', index=False, startrow=len(df) + 3)

    def _write_result_sheet(
        self,
        writer,
        sheet_name: str,
        results: List[VerificationResult],
        high_value_threshold: float,
        is_review: bool = False,
        is_duplicate: bool = False,
    ):
        if not results:
            df = pd.DataFrame(columns=['无数据'])
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            return

        rows = []
        for result in results:
            inv = result.invoice
            reimb = result.reimbursement

            is_high_value = (result.total_amount >= high_value_threshold)

            row = {
                '序号': len(rows) + 1,
                '高金额': '是' if is_high_value else '否',
                '发票号码': inv.invoice_number or '未知',
                '发票代码': inv.invoice_code or '',
                '开票日期': inv.invoice_date.strftime('%Y-%m-%d') if inv.invoice_date else '',
                '发票类型': inv.invoice_type.value if inv.invoice_type else '未知',
                '购方名称': inv.buyer_name or '未知',
                '销方名称': inv.seller_name or '',
                '价税合计': f"¥{result.total_amount:,.2f}",
                '税额': f"¥{inv.tax_amount:,.2f}" if inv.tax_amount else '',
                '不含税金额': f"¥{inv.amount_without_tax:,.2f}" if inv.amount_without_tax else '',
                '大写金额': inv.total_amount_cn or '',
                '项目备注': reimb.project_remark if reimb else '',
                '申请人': reimb.applicant if reimb else '',
                '部门': reimb.department if reimb else '',
                '发票章状态': inv.seal_status.value,
                '是否扫描件': '是' if inv.is_scanned else '否',
                '是否红冲': '是' if inv.is_red_flush else '否',
                '解析可信度': f"{inv.parse_confidence:.0%}",
                '文件路径': inv.file_path,
            }

            if is_review:
                row['问题列表'] = '; '.join(result.issues) if result.issues else ''
                row['状态'] = '; '.join(result.issues) if result.issues else ''

            if is_duplicate:
                row['关联发票号'] = ', '.join(result.matched_invoice_numbers) if result.matched_invoice_numbers else ''
                row['关联项目'] = ', '.join(result.matched_projects) if result.matched_projects else ''
                row['跨项目'] = '是' if result.cross_project_duplicate else '否'
                row['问题'] = '; '.join(result.issues) if result.issues else ''

            rows.append(row)

        df = pd.DataFrame(rows)
        df['_sort_amount'] = df['价税合计'].str.replace(r'[¥,]', '', regex=True).astype(float)
        df = df.sort_values(by='_sort_amount', ascending=False).drop(columns=['_sort_amount'])
        df.to_excel(writer, sheet_name=sheet_name, index=False)

    def _write_anomaly_sheet(self, writer, anomaly_summary: Dict):
        high_value = anomaly_summary.get('high_value_anomalies', [])
        if high_value:
            data = {
                '发票号码': [h.get('invoice_number', '') for h in high_value],
                '金额': [f"¥{h.get('amount', 0):,.2f}" for h in high_value],
                '问题描述': ['; '.join(h.get('issues', [])) for h in high_value],
                '文件路径': [h.get('file', '') for h in high_value],
            }
            df = pd.DataFrame(data)
            df['_sort_amount'] = df['金额'].str.replace(r'[¥,]', '', regex=True).astype(float)
            df = df.sort_values(by='_sort_amount', ascending=False).drop(columns=['_sort_amount'])
            df.to_excel(writer, sheet_name='异常汇总', index=False)

    def _generate_text(
        self,
        report: VerificationReport,
        file_path: str,
        anomaly_summary: Dict,
    ):
        lines = []
        lines.append("=" * 80)
        lines.append("发票核验报告")
        lines.append("=" * 80)
        lines.append(f"生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("【统计概览】")
        lines.append("-" * 40)
        lines.append(f"发票总数: {report.total_invoices}")
        lines.append(f"可报销: {report.approved_count} 张")
        lines.append(f"需人工核验: {report.need_review_count} 张")
        lines.append(f"疑似重复: {report.duplicate_count} 张")
        lines.append(f"高金额阈值: ¥{report.high_value_threshold:,.2f}")
        lines.append("")

        lines.append("【异常统计】")
        lines.append("-" * 40)
        by_type = anomaly_summary.get('by_type', {})
        lines.append(f"异常总数: {anomaly_summary.get('total_anomalies', 0)}")
        for type_name, count in by_type.items():
            type_cn = {
                'red_flush': '红冲发票',
                'scanned': '扫描版发票',
                'amount_mismatch': '金额大小写不一致',
                'duplicate': '重复/跨项目报销',
                'seal_issue': '发票章问题',
                'mismatch': '信息不匹配',
                'other': '其他问题',
            }.get(type_name, type_name)
            lines.append(f"  {type_cn}: {count}")
        lines.append("")

        high_value = anomaly_summary.get('high_value_anomalies', [])
        if high_value:
            lines.append(f"【高金额疑点（¥{report.high_value_threshold:,.2f}以上）】")
            lines.append("-" * 40)
            for hv in high_value:
                lines.append(f"  发票号: {hv.get('invoice_number', '未知')}")
                lines.append(f"  金额: ¥{hv.get('amount', 0):,.2f}")
                for issue in hv.get('issues', []):
                    lines.append(f"    - {issue}")
                lines.append("")

        for title, results in [
            ("可报销清单", report.approved),
            ("需人工核验", report.need_review),
            ("疑似重复", report.duplicates),
        ]:
            if results:
                lines.append("")
                lines.append(f"【{title}】")
                lines.append("-" * 60)
                for i, result in enumerate(results, 1):
                    inv = result.invoice
                    reimb = result.reimbursement
                    is_high = result.total_amount >= report.high_value_threshold
                    high_marker = " ★" if is_high else ""
                    lines.append(f"{i}.{high_marker} 发票号: {inv.invoice_number or '未知'}")
                    lines.append(f"   购方: {inv.buyer_name or '未知'}")
                    lines.append(f"   金额: ¥{result.total_amount:,.2f}")
                    if inv.invoice_date:
                        lines.append(f"   日期: {inv.invoice_date.strftime('%Y-%m-%d')}")
                    if reimb:
                        lines.append(f"   项目: {reimb.project_remark}")
                    lines.append(f"   印章: {inv.seal_status.value}")
                    if inv.is_scanned:
                        lines.append(f"   扫描件")
                    if inv.is_red_flush:
                        lines.append(f"   红冲发票")
                    if result.issues:
                        lines.append(f"   问题:")
                        for issue in result.issues:
                            lines.append(f"     - {issue}")
                    lines.append(f"   文件: {inv.file_path}")
                    lines.append("")

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

    def _generate_markdown(
        self,
        report: VerificationReport,
        file_path: str,
        anomaly_summary: Dict,
    ):
        lines = []
        lines.append("# 发票核验报告")
        lines.append("")
        lines.append(f"> 生成时间：{report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("## 统计概览")
        lines.append("")
        lines.append("| 项目 | 数值 |")
        lines.append("|------|------|")
        lines.append(f"| 发票总数 | {report.total_invoices} |")
        lines.append(f"| 可报销 | {report.approved_count} |")
        lines.append(f"| 需人工核验 | {report.need_review_count} |")
        lines.append(f"| 疑似重复 | {report.duplicate_count} |")
        lines.append(f"| 高金额阈值 | ¥{report.high_value_threshold:,.2f} |")
        lines.append("")

        lines.append("## 异常统计")
        lines.append("")
        by_type = anomaly_summary.get('by_type', {})
        type_cn = {
            'red_flush': '红冲发票',
            'scanned': '扫描版发票',
            'amount_mismatch': '金额大小写不一致',
            'duplicate': '重复/跨项目报销',
            'seal_issue': '发票章问题',
            'mismatch': '信息不匹配',
            'other': '其他问题',
        }
        lines.append("| 异常类型 | 数量 |")
        lines.append("|----------|------|")
        for type_name, count in by_type.items():
            cn_name = type_cn.get(type_name, type_name)
            lines.append(f"| {cn_name} | {count} |")
        lines.append("")

        high_value = anomaly_summary.get('high_value_anomalies', [])
        if high_value:
            lines.append(f"## 高金额疑点（¥{report.high_value_threshold:,.2f}以上）")
            lines.append("")
            lines.append("| 发票号码 | 金额 | 问题 | 文件 |")
            lines.append("|----------|------|------|------|")
            for hv in high_value:
                lines.append(f"| {hv.get('invoice_number', '')} | ¥{hv.get('amount', 0):,.2f} | {'<br>'.join(hv.get('issues', []))} | {hv.get('file', '')} |")
            lines.append("")

        for title, results in [
            ("可报销清单", report.approved),
            ("需人工核验", report.need_review),
            ("疑似重复", report.duplicates),
        ]:
            if results:
                lines.append(f"## {title}")
                lines.append("")
                lines.append("| 序号 | 高金额 | 发票号码 | 购方名称 | 金额 | 印章 | 扫描件 | 问题 |")
                lines.append("|------|--------|----------|----------|------|------|--------|------|")
                for i, result in enumerate(results, 1):
                    inv = result.invoice
                    is_high = "★" if result.total_amount >= report.high_value_threshold else ""
                    issues = "<br>".join(result.issues) if result.issues else ""
                    scanned = "是" if inv.is_scanned else "否"
                    lines.append(f"| {i} | {is_high} | {inv.invoice_number or ''} | {inv.buyer_name or ''} | ¥{result.total_amount:,.2f} | {inv.seal_status.value} | {scanned} | {issues} |")
                lines.append("")

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

    def print_console_summary(self, report: VerificationReport):
        from rich.console import Console
        from rich.table import Table
        from rich import print as rprint

        console = Console()

        console.print("\n[bold cyan]===== 发票核验结果 =====[/bold cyan]\n")

        table = Table(title="统计概览")
        table.add_column("项目", style="cyan")
        table.add_column("数值", justify="right")
        table.add_row("发票总数", str(report.total_invoices))
        table.add_row("可报销", f"[green]{report.approved_count}[/green]")
        table.add_row("需人工核验", f"[yellow]{report.need_review_count}[/yellow]")
        table.add_row("疑似重复", f"[red]{report.duplicate_count}[/red]")
        console.print(table)

        if report.need_review:
            console.print(f"\n[bold yellow]需人工核验 Top 5（按金额排序）：[/bold yellow]")
            for result in report.need_review[:5]:
                console.print(f"  • ¥{result.total_amount:,.2f} - {result.invoice.invoice_number or '未知号'}")
                if result.issues:
                    console.print(f"    [dim]{result.issues[0]}[/dim]")

        if report.duplicates:
            console.print(f"\n[bold red]疑似重复 Top 5（按金额排序）：[/bold red]")
            for result in report.duplicates[:5]:
                console.print(f"  • ¥{result.total_amount:,.2f} - {result.invoice.invoice_number or '未知号'}")
                if result.issues:
                    console.print(f"    [dim]{result.issues[0]}[/dim]")

        total_approved = sum(r.total_amount for r in report.approved)
        console.print(f"\n[bold green]可报销总金额：¥{total_approved:,.2f}[/bold green]")
        console.print("\n[bold cyan]======================[/bold cyan]\n")
