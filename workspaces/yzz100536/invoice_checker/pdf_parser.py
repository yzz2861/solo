import os
import re
import logging
from datetime import datetime
from typing import Optional, Tuple
from pathlib import Path

import pdfplumber
from PyPDF2 import PdfReader

from .models import InvoiceData, InvoiceType, SealStatus
from .config import Config

logger = logging.getLogger(__name__)


class PDFInvoiceParser:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self._ocr_available = False
        self._init_ocr()

    def _init_ocr(self):
        try:
            import pytesseract
            from PIL import Image
            import cv2
            import numpy as np
            self._ocr_available = True
            self._pytesseract = pytesseract
            self._Image = Image
            self._cv2 = cv2
            self._np = np
        except ImportError:
            logger.warning("OCR dependencies not installed. Scanned invoices may not parse correctly.")
            self._ocr_available = False

    def parse(self, pdf_path: str) -> InvoiceData:
        invoice = InvoiceData(file_path=pdf_path)

        if not os.path.exists(pdf_path):
            logger.error(f"File not found: {pdf_path}")
            invoice.parse_confidence = 0.0
            return invoice

        try:
            text, is_scanned = self._extract_text(pdf_path)
            invoice.raw_text = text
            invoice.is_scanned = is_scanned
            invoice.ocr_used = is_scanned and self._ocr_available

            self._parse_invoice_fields(invoice, text)
            self._detect_invoice_type(invoice, text)
            self._detect_red_flush(invoice, text)
            invoice.parse_confidence = self._calculate_confidence(invoice)

        except Exception as e:
            logger.error(f"Error parsing {pdf_path}: {str(e)}")
            invoice.issues = [f"解析错误: {str(e)}"]

        return invoice

    def _extract_text(self, pdf_path: str) -> Tuple[str, bool]:
        text = ""
        is_scanned = False

        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"

            if len(text.strip()) < 50:
                is_scanned = True
                if self._ocr_available:
                    ocr_text = self._ocr_extract(pdf_path)
                    if len(ocr_text.strip()) > len(text.strip()):
                        text = ocr_text

        except Exception as e:
            logger.warning(f"pdfplumber failed, trying PyPDF2: {str(e)}")
            try:
                reader = PdfReader(pdf_path)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            except Exception as e2:
                logger.error(f"PyPDF2 also failed: {str(e2)}")
                if self._ocr_available:
                    text = self._ocr_extract(pdf_path)
                    is_scanned = True

        return text, is_scanned

    def _ocr_extract(self, pdf_path: str) -> str:
        if not self._ocr_available:
            return ""

        try:
            from pdf2image import convert_from_path
            images = convert_from_path(pdf_path)
            text = ""
            for image in images:
                image_np = self._np.array(image)
                gray = self._cv2.cvtColor(image_np, self._cv2.COLOR_RGB2GRAY)
                _, binary = self._cv2.threshold(gray, 0, 255, self._cv2.THRESH_BINARY + self._cv2.THRESH_OTSU)
                denoised = self._cv2.medianBlur(binary, 3)
                pil_image = self._Image.fromarray(denoised)
                page_text = self._pytesseract.image_to_string(pil_image, lang='chi_sim+eng')
                text += page_text + "\n"
            return text
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return ""

    def _parse_invoice_fields(self, invoice: InvoiceData, text: str):
        for field_name, patterns in self.config.INVOICE_PATTERNS.items():
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    value = match.group(1).strip() if match.groups() else match.group().strip()
                    self._set_field(invoice, field_name, value)
                    break

        if '合' in text and '计' in text:
            self._parse_amounts_from_table(invoice, text)

    def _set_field(self, invoice: InvoiceData, field_name: str, value: str):
        try:
            if field_name == 'invoice_code':
                invoice.invoice_code = re.sub(r'[^0-9]', '', value)
            elif field_name == 'invoice_number':
                invoice.invoice_number = re.sub(r'[^0-9]', '', value)
            elif field_name == 'invoice_date':
                invoice.invoice_date = self._parse_date(value)
            elif field_name == 'buyer_name':
                invoice.buyer_name = self._clean_name(value)
            elif field_name == 'buyer_tax_code':
                invoice.buyer_tax_code = re.sub(r'[^0-9A-Z]', '', value.upper())
            elif field_name == 'seller_name':
                invoice.seller_name = self._clean_name(value)
            elif field_name == 'seller_tax_code':
                invoice.seller_tax_code = re.sub(r'[^0-9A-Z]', '', value.upper())
            elif field_name == 'total_amount':
                invoice.total_amount = self._parse_amount(value)
            elif field_name == 'total_amount_cn':
                invoice.total_amount_cn = value.strip()
            elif field_name == 'amount_without_tax':
                pass
            elif field_name == 'check_code':
                invoice.check_code = re.sub(r'[^0-9]', '', value)
        except Exception as e:
            logger.warning(f"Error setting field {field_name}: {str(e)}")

    def _parse_amounts_from_table(self, invoice: InvoiceData, text: str):
        amount_pattern = r'[¥￥]\s*([\d,]+\.?\d*)\s*[¥￥]\s*([\d,]+\.?\d*)'
        match = re.search(amount_pattern, text)
        if match:
            try:
                amount1 = self._parse_amount(match.group(1))
                amount2 = self._parse_amount(match.group(2))
                invoice.amount_without_tax = amount1
                invoice.tax_amount = amount2
                if invoice.total_amount is None:
                    invoice.total_amount = amount1 + amount2
            except:
                pass

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        date_str = re.sub(r'[年月日/\.\-]', ' ', date_str).strip()
        date_str = re.sub(r'\s+', '-', date_str)

        for fmt in ['%Y-%m-%d', '%Y-%m-%d', '%Y%m%d']:
            try:
                return datetime.strptime(date_str.replace('-', ''), '%Y%m%d')
            except:
                try:
                    return datetime.strptime(date_str, fmt)
                except:
                    continue
        return None

    def _parse_amount(self, amount_str: str) -> float:
        cleaned = re.sub(r'[¥￥,\s]', '', amount_str)
        try:
            return float(cleaned)
        except:
            return 0.0

    def _clean_name(self, name: str) -> str:
        name = re.sub(r'\s+', '', name)
        name = re.sub(r'[:：].*$', '', name)
        return name.strip()

    def _detect_invoice_type(self, invoice: InvoiceData, text: str):
        for type_name in self.config.SUPPORTED_INVOICE_TYPES.keys():
            if type_name in text:
                invoice.invoice_type = InvoiceType(type_name)
                return

        if '专用发票' in text:
            if '电子' in text:
                invoice.invoice_type = InvoiceType.VAT_ELECTRONIC_SPECIAL
            else:
                invoice.invoice_type = InvoiceType.VAT_SPECIAL
        elif '普通发票' in text:
            if '电子' in text:
                invoice.invoice_type = InvoiceType.VAT_ELECTRONIC
            else:
                invoice.invoice_type = InvoiceType.VAT_GENERAL
        elif '数电' in text or '全面数字化' in text:
            invoice.invoice_type = InvoiceType.DIGITAL

    def _detect_red_flush(self, invoice: InvoiceData, text: str):
        for pattern in self.config.RED_FLUSH_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                invoice.is_red_flush = True
                invoice.seal_status = SealStatus.RED_FLUSH
                invoice.red_flush_reason = "检测到红冲/负数发票标识"
                return

        if invoice.total_amount is not None and invoice.total_amount < 0:
            invoice.is_red_flush = True
            invoice.seal_status = SealStatus.RED_FLUSH
            invoice.red_flush_reason = "发票金额为负数"

    def _calculate_confidence(self, invoice: InvoiceData) -> float:
        score = 0.0
        total = 0

        checks = [
            (invoice.invoice_number, 0.2),
            (invoice.buyer_name, 0.15),
            (invoice.total_amount is not None and invoice.total_amount > 0, 0.2),
            (invoice.invoice_date is not None, 0.1),
            (invoice.seller_name, 0.1),
            (invoice.buyer_tax_code, 0.1),
            (invoice.invoice_code, 0.1),
            (invoice.total_amount_cn, 0.05),
        ]

        for value, weight in checks:
            total += weight
            if value:
                score += weight

        if invoice.is_scanned:
            score *= 0.7

        return round(score / total if total > 0 else 0, 2)
