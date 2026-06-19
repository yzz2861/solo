import os
import re
import logging
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .models import (
    InvoiceData,
    ReimbursementEntry,
    VerificationResult,
    VerificationReport,
    InvoiceStatus,
    SealStatus,
)
from .config import Config
from .pdf_parser import PDFInvoiceParser
from .seal_verifier import SealVerifier
from .reimbursement_reader import ReimbursementReader

logger = logging.getLogger(__name__)


class InvoiceVerifier:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.parser = PDFInvoiceParser(self.config)
        self.seal_verifier = SealVerifier(self.config)
        self.reimbursement_reader = ReimbursementReader(self.config)

    def verify_batch(
        self,
        invoice_dir: str,
        reimbursement_file: str,
        output_dir: Optional[str] = None,
    ) -> VerificationReport:
        report = VerificationReport(high_value_threshold=self.config.HIGH_VALUE_THRESHOLD)

        if not os.path.exists(invoice_dir):
            raise FileNotFoundError(f"Invoice directory not found: {invoice_dir}")

        reimbursement_entries = self.reimbursement_reader.read(reimbursement_file)
        invoice_files = self._find_invoice_files(invoice_dir)

        logger.info(f"Found {len(invoice_files)} invoice files and {len(reimbursement_entries)} reimbursement entries")

        parsed_invoices = []
        for invoice_file in invoice_files:
            try:
                invoice = self.parser.parse(invoice_file)
                invoice.seal_status = self.seal_verifier.verify(invoice)
                parsed_invoices.append(invoice)
            except Exception as e:
                logger.error(f"Error parsing {invoice_file}: {str(e)}")
                continue

        invoice_to_reimbursement = self._match_invoices_to_reimbursement(
            parsed_invoices, reimbursement_entries
        )

        duplicate_info = self._detect_duplicates(parsed_invoices, reimbursement_entries)

        results = []
        for invoice in parsed_invoices:
            reimbursement = invoice_to_reimbursement.get(invoice.file_path)
            result = self._verify_single(invoice, reimbursement, duplicate_info)
            results.append(result)

        report.total_invoices = len(results)
        for result in results:
            if result.status == InvoiceStatus.APPROVED:
                report.approved.append(result)
                report.approved_count += 1
            elif result.status == InvoiceStatus.DUPLICATE:
                report.duplicates.append(result)
                report.duplicate_count += 1
            else:
                report.need_review.append(result)
                report.need_review_count += 1

        report.approved.sort(key=lambda r: r.total_amount, reverse=True)
        report.need_review.sort(key=lambda r: r.total_amount, reverse=True)
        report.duplicates.sort(key=lambda r: r.total_amount, reverse=True)

        return report

    def _find_invoice_files(self, invoice_dir: str) -> List[str]:
        invoice_files = []
        for root, dirs, files in os.walk(invoice_dir):
            for file in files:
                if file.lower().endswith('.pdf'):
                    invoice_files.append(os.path.join(root, file))
        return sorted(invoice_files)

    def _match_invoices_to_reimbursement(
        self,
        invoices: List[InvoiceData],
        reimbursements: List[ReimbursementEntry],
    ) -> Dict[str, ReimbursementEntry]:
        mapping = {}

        invoice_by_number = {}
        for inv in invoices:
            if inv.invoice_number:
                invoice_by_number[inv.invoice_number] = inv

        for entry in reimbursements:
            matched_invoice = None

            if entry.invoice_number and entry.invoice_number in invoice_by_number:
                matched_invoice = invoice_by_number[entry.invoice_number]

            if not matched_invoice:
                for inv in invoices:
                    if inv.file_path in mapping:
                        continue
                    if self._names_match(inv.buyer_name, entry.buyer_name):
                        if abs((inv.total_amount or 0) - entry.amount) <= self.config.AMOUNT_TOLERANCE:
                            matched_invoice = inv
                            break

            if matched_invoice and matched_invoice.file_path not in mapping:
                mapping[matched_invoice.file_path] = entry
                entry.file_path = matched_invoice.file_path

        return mapping

    def _names_match(self, name1: Optional[str], name2: Optional[str]) -> bool:
        if not name1 or not name2:
            return False

        n1 = re.sub(r'[\s（）()]', '', name1)
        n2 = re.sub(r'[\s（）()]', '', name2)

        if n1 == n2:
            return True

        if n1 in n2 or n2 in n1:
            return True

        s1 = set(n1)
        s2 = set(n2)
        intersection = len(s1 & s2)
        union = len(s1 | s2)
        if union > 0:
            similarity = intersection / union
            if similarity >= self.config.BUYER_NAME_FUZZY_THRESHOLD:
                return True

        return False

    def _detect_duplicates(
        self,
        invoices: List[InvoiceData],
        reimbursements: List[ReimbursementEntry],
    ) -> Dict[str, Dict]:
        duplicate_info = defaultdict(lambda: {
            'count': 0,
            'projects': set(),
            'files': [],
            'invoices': [],
        })

        number_to_entries = defaultdict(list)
        for entry in reimbursements:
            if entry.invoice_number:
                number_to_entries[entry.invoice_number].append(entry)

        for invoice in invoices:
            inv_num = invoice.invoice_number
            if not inv_num:
                continue

            entries = number_to_entries.get(inv_num, [])
            duplicate_info[inv_num]['count'] += 1
            duplicate_info[inv_num]['files'].append(invoice.file_path)
            duplicate_info[inv_num]['invoices'].append(invoice)

            for entry in entries:
                if entry.project_remark:
                    duplicate_info[inv_num]['projects'].add(entry.project_remark)

        result = {}
        for inv_num, info in duplicate_info.items():
            if info['count'] > 1 or len(info['projects']) > 1:
                result[inv_num] = {
                    'is_duplicate': True,
                    'cross_project': len(info['projects']) > 1,
                    'count': info['count'],
                    'projects': list(info['projects']),
                    'files': info['files'],
                }

        return result

    def _verify_single(
        self,
        invoice: InvoiceData,
        reimbursement: Optional[ReimbursementEntry],
        duplicate_info: Dict[str, Dict],
    ) -> VerificationResult:
        result = VerificationResult(
            invoice=invoice,
            reimbursement=reimbursement,
        )

        result.seal_valid = invoice.seal_status == SealStatus.VALID

        if invoice.invoice_number and invoice.invoice_number in duplicate_info:
            dup = duplicate_info[invoice.invoice_number]
            result.duplicate_found = True
            result.matched_invoice_numbers = [invoice.invoice_number]
            result.matched_projects = dup['projects']

            if dup['cross_project']:
                result.cross_project_duplicate = True
                result.issues.append(
                    f"跨项目重复报销：发票号「{invoice.invoice_number}」已在以下项目出现：{', '.join(dup['projects'])}"
                )
            else:
                result.issues.append(
                    f"发票重复出现：发票号「{invoice.invoice_number}」共出现 {dup['count']} 次"
                )

        if invoice.is_red_flush:
            result.issues.append("红冲发票，不可报销")
            if result.duplicate_found:
                result.status = InvoiceStatus.DUPLICATE
            else:
                result.status = InvoiceStatus.NEED_REVIEW
            return result

        if result.duplicate_found:
            result.status = InvoiceStatus.DUPLICATE
            return result

        if invoice.is_scanned:
            result.issues.append("扫描版发票，需人工核验")
            invoice.seal_status = SealStatus.SCANNED

        if invoice.seal_status == SealStatus.NOT_FOUND:
            result.issues.append("未找到发票章")
        elif invoice.seal_status == SealStatus.INVALID:
            result.issues.append("发票章无效")
        elif invoice.seal_status == SealStatus.SCANNED:
            result.issues.append("扫描件发票章需人工核验")

        if reimbursement:
            result.buyer_match = self._names_match(invoice.buyer_name, reimbursement.buyer_name)
            if not result.buyer_match:
                result.issues.append(
                    f"购方名称不匹配：发票「{invoice.buyer_name or '未知'}」vs 报销表「{reimbursement.buyer_name}」"
                )

            inv_amount = invoice.total_amount or 0
            result.amount_match = abs(inv_amount - reimbursement.amount) <= self.config.AMOUNT_TOLERANCE
            if not result.amount_match:
                result.issues.append(
                    f"金额不匹配：发票「¥{inv_amount:.2f}」vs 报销表「¥{reimbursement.amount:.2f}」"
                )

            if invoice.total_amount_cn:
                cn_amount = self._chinese_amount_to_number(invoice.total_amount_cn)
                if cn_amount is not None and abs(cn_amount - inv_amount) > self.config.AMOUNT_TOLERANCE:
                    result.issues.append(
                        f"金额大小写不一致：大写「{invoice.total_amount_cn}」vs 小写「¥{inv_amount:.2f}」"
                    )

            if reimbursement.project_remark:
                invoice.project_remark = reimbursement.project_remark

        else:
            result.issues.append("未找到对应的报销记录")

        if (
            result.seal_valid
            and result.buyer_match
            and result.amount_match
            and not invoice.is_scanned
            and not invoice.is_red_flush
            and invoice.parse_confidence >= 0.7
            and len(result.issues) == 0
        ):
            result.status = InvoiceStatus.APPROVED
        else:
            if invoice.parse_confidence < 0.5:
                result.issues.append(f"发票解析可信度低（{invoice.parse_confidence:.0%}），需人工核验")

            if not invoice.invoice_number:
                result.issues.append("未能识别发票号码，需人工核验")

            if not invoice.buyer_name:
                result.issues.append("未能识别购方名称，需人工核验")

            if invoice.total_amount is None or invoice.total_amount <= 0:
                result.issues.append("未能识别发票金额，需人工核验")

        return result

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
