import os
import re
import logging
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import InvoiceData, ReimbursementEntry, VerificationResult, SealStatus
from .config import Config

logger = logging.getLogger(__name__)


class AnomalyDetector:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()

    def detect_all(self, result: VerificationResult) -> List[str]:
        issues = []
        invoice = result.invoice

        issues.extend(self.detect_scanned(invoice))
        issues.extend(self.detect_red_flush(invoice))
        issues.extend(self.detect_amount_mismatch(invoice))
        issues.extend(self.detect_seal_issues(invoice))
        issues.extend(self.detect_parse_quality(invoice))

        return issues

    def detect_scanned(self, invoice: InvoiceData) -> List[str]:
        issues = []
        if invoice.is_scanned:
            issues.append("扫描版发票，需人工核验")
            if invoice.ocr_used:
                issues.append("已使用OCR识别，识别结果可能存在误差")
            else:
                issues.append("未安装OCR组件，扫描件无法自动识别")
        return issues

    def detect_red_flush(self, invoice: InvoiceData) -> List[str]:
        issues = []
        if invoice.is_red_flush:
            reason = invoice.red_flush_reason or "检测到红冲发票"
            issues.append(f"红冲发票：{reason}，不可报销")
        return issues

    def detect_amount_mismatch(self, invoice: InvoiceData) -> List[str]:
        issues = []

        if invoice.total_amount is None:
            return issues

        if invoice.total_amount_cn:
            cn_amount = self._chinese_amount_to_number(invoice.total_amount_cn)
            if cn_amount is not None:
                diff = abs(cn_amount - invoice.total_amount)
                if diff > self.config.AMOUNT_TOLERANCE:
                    issues.append(
                        f"金额大小写不一致：大写「{invoice.total_amount_cn}({cn_amount:.2f}」"
                        f" vs 小写「¥{invoice.total_amount:.2f}」，差额¥{diff:.2f}"
                    )

        if (invoice.amount_without_tax is not None
                and invoice.tax_amount is not None
                and invoice.total_amount is not None):
            calc_total = invoice.amount_without_tax + invoice.tax_amount
            diff = abs(calc_total - invoice.total_amount)
            if diff > self.config.AMOUNT_TOLERANCE:
                issues.append(
                    f"金额计算不一致：不含税金额+税额={calc_total:.2f} "
                    f"≠ 价税合计{invoice.total_amount:.2f}，差额¥{diff:.2f}"
                )

        if invoice.total_amount < 0:
            issues.append(f"发票金额为负数：¥{invoice.total_amount:.2f}")

        return issues

    def detect_seal_issues(self, invoice: InvoiceData) -> List[str]:
        issues = []

        if invoice.seal_status == SealStatus.NOT_FOUND:
            issues.append("未找到发票专用章")
        elif invoice.seal_status == SealStatus.INVALID:
            issues.append("发票章无效或不完整")
        elif invoice.seal_status == SealStatus.SCANNED:
            issues.append("扫描件发票章需人工核验")
        elif invoice.seal_status == SealStatus.RED_FLUSH:
            pass

        return issues

    def detect_parse_quality(self, invoice: InvoiceData) -> List[str]:
        issues = []

        missing_fields = []
        if not invoice.invoice_number:
            missing_fields.append("发票号码")
        if not invoice.buyer_name:
            missing_fields.append("购方名称")
        if invoice.total_amount is None or invoice.total_amount <= 0:
            missing_fields.append("发票金额")
        if not invoice.invoice_date:
            missing_fields.append("开票日期")
        if not invoice.seller_name:
            missing_fields.append("销方名称")

        if missing_fields:
            issues.append(f"未能识别关键字段：{', '.join(missing_fields)}")

        if invoice.parse_confidence < 0.5:
            issues.append(
                f"发票解析可信度低（{invoice.parse_confidence:.0%}），建议人工核验"
            )

        return issues

    def detect_duplicate_patterns(
        self,
        invoices: List[InvoiceData],
        reimbursements: List[ReimbursementEntry],
    ) -> Dict[str, Dict]:
        patterns = defaultdict(list)

        number_map = defaultdict(list)
        for inv in invoices:
            if inv.invoice_number:
                number_map[inv.invoice_number].append(inv)

        reimbursement_number_map = defaultdict(list)
        for entry in reimbursements:
            if entry.invoice_number:
                reimbursement_number_map[entry.invoice_number].append(entry)

        for inv_num, inv_list in number_map.items():
            if len(inv_list) > 1:
                patterns['same_number_multiple_files'].append({
                    'invoice_number': inv_num,
                    'count': len(inv_list),
                    'files': [inv.file_path for inv in inv_list],
                })

            projects = set()
            for entry in reimbursement_number_map.get(inv_num, []):
                if entry.project_remark:
                    projects.add(entry.project_remark)

            if len(projects) > 1:
                patterns['cross_project_duplicate'].append({
                    'invoice_number': inv_num,
                    'projects': list(projects),
                    'files': [inv.file_path for inv in inv_list],
                })

        amount_map = defaultdict(list)
        for inv in invoices:
            if inv.total_amount and inv.total_amount > 0:
                key = (round(inv.total_amount, 2), inv.buyer_name)
                amount_map[key].append(inv)

        for key, inv_list in amount_map.items():
            if len(inv_list) > 1:
                amount, buyer = key
                if buyer and amount > 1000:
                    patterns['same_amount_buyer'].append({
                        'amount': amount,
                        'buyer': buyer,
                        'count': len(inv_list),
                        'invoice_numbers': [inv.invoice_number for inv in inv_list],
                    })

        return dict(patterns)

    def _chinese_amount_to_number(self, cn_amount: str) -> Optional[float]:
        try:
            cn_amount = re.sub(r'[\s人民币]', '', cn_amount)
            if not cn_amount:
                return None

            total = 0.0
            section = 0.0
            digit = 0

            for char in cn_amount:
                if char in self.config.CN_NUM_MAP:
                    digit = self.config.CN_NUM_MAP[char]
                elif char in self.config.CN_UNIT_MAP:
                    unit = self.config.CN_UNIT_MAP[char]
                    if unit >= 10000:
                        section = (section + digit) * unit
                        total += section
                        section = 0
                        digit = 0
                    elif unit >= 1:
                        if digit == 0 and unit > 1:
                            digit = 1
                        section += digit * unit
                        digit = 0
                    elif unit in (0.1, 0.01):
                        if digit == 0:
                            digit = 1
                        total += section + digit * unit
                        section = 0
                        digit = 0

            total += section + digit
            return round(total, 2)
        except Exception as e:
            logger.warning(f"Failed to parse Chinese amount '{cn_amount}': {str(e)}")
            return None

    def generate_anomaly_summary(
        self,
        results: List[VerificationResult],
    ) -> Dict:
        summary = {
            'total_anomalies': 0,
            'by_type': defaultdict(int),
            'high_value_anomalies': [],
            'anomaly_details': [],
        }

        for result in results:
            if result.issues:
                summary['total_anomalies'] += len(result.issues)
                for issue in result.issues:
                    if '红冲' in issue:
                        summary['by_type']['red_flush'] += 1
                    elif '扫描' in issue:
                        summary['by_type']['scanned'] += 1
                    elif '大小写' in issue:
                        summary['by_type']['amount_mismatch'] += 1
                    elif '重复' in issue or '跨项目' in issue:
                        summary['by_type']['duplicate'] += 1
                    elif '章' in issue:
                        summary['by_type']['seal_issue'] += 1
                    elif '匹配' in issue:
                        summary['by_type']['mismatch'] += 1
                    else:
                        summary['by_type']['other'] += 1

                if result.total_amount >= self.config.HIGH_VALUE_THRESHOLD:
                    summary['high_value_anomalies'].append({
                        'invoice_number': result.invoice.invoice_number,
                        'amount': result.total_amount,
                        'issues': result.issues,
                        'file': result.invoice.file_path,
                    })

        summary['by_type'] = dict(summary['by_type'])
        summary['high_value_anomalies'].sort(key=lambda x: x['amount'], reverse=True)

        return summary
