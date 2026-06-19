import os
import re
import logging
from typing import Optional, Tuple, List
from pathlib import Path

from .models import InvoiceData, SealStatus
from .config import Config

logger = logging.getLogger(__name__)


class SealVerifier:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self._image_available = False
        self._init_image_libs()

    def _init_image_libs(self):
        try:
            import fitz
            from PIL import Image
            import cv2
            import numpy as np
            self._image_available = True
            self._fitz = fitz
            self._Image = Image
            self._cv2 = cv2
            self._np = np
        except ImportError:
            logger.warning("Image processing libraries not available. Seal verification will be limited.")
            self._image_available = False

    def verify(self, invoice: InvoiceData) -> SealStatus:
        if invoice.is_red_flush:
            return SealStatus.RED_FLUSH

        if invoice.is_scanned:
            return self._verify_scanned_seal(invoice)

        return self._verify_electronic_seal(invoice)

    def _verify_electronic_seal(self, invoice: InvoiceData) -> SealStatus:
        text = invoice.raw_text
        pdf_path = invoice.file_path

        text_score = self._check_seal_in_text(text)
        signature_score = self._check_digital_signature(pdf_path)
        visual_score = self._check_visual_seal(pdf_path) if self._image_available else 0

        if text_score >= 0.5 and signature_score >= 0.3:
            return SealStatus.VALID

        if visual_score > 0:
            total_score = text_score * 0.3 + signature_score * 0.4 + visual_score * 0.3
        else:
            total_score = text_score * 0.5 + signature_score * 0.5

        logger.debug(f"Seal scores - text: {text_score}, signature: {signature_score}, visual: {visual_score}, total: {total_score}")

        if total_score >= 0.6:
            return SealStatus.VALID
        elif total_score >= 0.3:
            return SealStatus.INVALID
        else:
            return SealStatus.NOT_FOUND

    def _check_seal_in_text(self, text: str) -> float:
        if not text:
            return 0.0

        score = 0.0
        patterns_found = 0

        for pattern in self.config.SEAL_PATTERNS:
            if re.search(pattern, text):
                patterns_found += 1

        if patterns_found > 0:
            score = min(patterns_found / len(self.config.SEAL_PATTERNS), 1.0)

        if '发票专用章' in text:
            score += 0.2
        if '全国统一发票监制章' in text:
            score += 0.2
        if '销售方' in text and '章' in text:
            score += 0.1

        return min(score, 1.0)

    def _check_digital_signature(self, pdf_path: str) -> float:
        try:
            reader = None
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(pdf_path)
            except:
                pass

            if reader and hasattr(reader, 'get_fields'):
                fields = reader.get_fields()
                if fields:
                    for field_name, field in fields.items():
                        if '/Sig' in str(field.get('/FT', '')) or 'signature' in field_name.lower():
                            return 0.8

            try:
                import fitz
                doc = fitz.open(pdf_path)
                signatures = doc.get_sigflags()
                if signatures > 0:
                    return 0.9
            except:
                pass

            return 0.5

        except Exception as e:
            logger.warning(f"Error checking digital signature: {str(e)}")
            return 0.3

    def _check_visual_seal(self, pdf_path: str) -> float:
        if not self._image_available:
            return 0.0

        try:
            doc = self._fitz.open(pdf_path)
            seal_score = 0.0
            page_count = min(len(doc), 2)

            for page_num in range(page_count):
                page = doc[page_num]
                pix = page.get_pixmap(alpha=False)
                img = self._Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img_np = self._np.array(img)

                hsv = self._cv2.cvtColor(img_np, self._cv2.COLOR_RGB2HSV)

                lower_red1 = self._np.array([0, 50, 50])
                upper_red1 = self._np.array([10, 255, 255])
                lower_red2 = self._np.array([170, 50, 50])
                upper_red2 = self._np.array([180, 255, 255])

                mask1 = self._cv2.inRange(hsv, lower_red1, upper_red1)
                mask2 = self._cv2.inRange(hsv, lower_red2, upper_red2)
                mask = mask1 + mask2

                red_pixels = self._np.count_nonzero(mask)
                total_pixels = mask.size
                red_ratio = red_pixels / total_pixels

                contours, _ = self._cv2.findContours(mask, self._cv2.RETR_EXTERNAL, self._cv2.CHAIN_APPROX_SIMPLE)

                circular_seals = 0
                for contour in contours:
                    area = self._cv2.contourArea(contour)
                    if area > 1000:
                        perimeter = self._cv2.arcLength(contour, True)
                        if perimeter > 0:
                            circularity = 4 * 3.14159 * area / (perimeter * perimeter)
                            if circularity > 0.6:
                                circular_seals += 1

                page_score = 0.0
                if red_ratio > 0.005:
                    page_score += 0.3
                if circular_seals > 0:
                    page_score += min(circular_seals * 0.3, 0.5)

                text = page.get_text()
                if '章' in text or '发票专用' in text:
                    page_score += 0.2

                seal_score = max(seal_score, page_score)

            doc.close()
            return min(seal_score, 1.0)

        except Exception as e:
            logger.warning(f"Error checking visual seal: {str(e)}")
            return 0.0

    def _verify_scanned_seal(self, invoice: InvoiceData) -> SealStatus:
        text = invoice.raw_text
        pdf_path = invoice.file_path

        text_score = self._check_seal_in_text(text)
        visual_score = self._check_visual_seal(pdf_path) if self._image_available else 0

        total_score = text_score * 0.4 + visual_score * 0.6

        if total_score >= 0.5:
            return SealStatus.SCANNED
        elif text_score >= 0.3:
            return SealStatus.SCANNED
        else:
            return SealStatus.SCANNED

    def get_seal_info(self, invoice: InvoiceData) -> dict:
        status = self.verify(invoice)
        return {
            'status': status,
            'is_scanned': invoice.is_scanned,
            'is_red_flush': invoice.is_red_flush,
            'has_text_seal': self._check_seal_in_text(invoice.raw_text) > 0.3,
            'has_visual_seal': self._check_visual_seal(invoice.file_path) > 0.3 if self._image_available else False,
        }
