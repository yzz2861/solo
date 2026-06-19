from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict
from enum import Enum


class InvoiceStatus(str, Enum):
    APPROVED = "可报销"
    NEED_REVIEW = "需人工核验"
    DUPLICATE = "疑似重复"


class InvoiceType(str, Enum):
    VAT_SPECIAL = "增值税专用发票"
    VAT_GENERAL = "增值税普通发票"
    VAT_ELECTRONIC = "增值税电子普通发票"
    VAT_ELECTRONIC_SPECIAL = "增值税电子专用发票"
    DIGITAL = "全面数字化的电子发票"
    UNKNOWN = "未知类型"


class SealStatus(str, Enum):
    VALID = "有效"
    INVALID = "无效"
    NOT_FOUND = "未找到印章"
    SCANNED = "扫描件无法核验"
    RED_FLUSH = "红冲发票"


@dataclass
class InvoiceData:
    file_path: str
    invoice_code: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    invoice_type: InvoiceType = InvoiceType.UNKNOWN
    buyer_name: Optional[str] = None
    buyer_tax_code: Optional[str] = None
    seller_name: Optional[str] = None
    seller_tax_code: Optional[str] = None
    amount_without_tax: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    total_amount_cn: Optional[str] = None
    project_remark: Optional[str] = None
    check_code: Optional[str] = None
    seal_status: SealStatus = SealStatus.NOT_FOUND
    is_scanned: bool = False
    is_red_flush: bool = False
    red_flush_reason: Optional[str] = None
    raw_text: str = ""
    parse_confidence: float = 0.0
    ocr_used: bool = False
    issues: List[str] = field(default_factory=list)


@dataclass
class ReimbursementEntry:
    row_index: int
    buyer_name: str
    amount: float
    project_remark: str
    invoice_number: Optional[str] = None
    applicant: Optional[str] = None
    department: Optional[str] = None
    file_path: Optional[str] = None


@dataclass
class VerificationResult:
    invoice: InvoiceData
    reimbursement: Optional[ReimbursementEntry] = None
    status: InvoiceStatus = InvoiceStatus.NEED_REVIEW
    issues: List[str] = field(default_factory=list)
    matched_invoice_numbers: List[str] = field(default_factory=list)
    matched_projects: List[str] = field(default_factory=list)
    amount_match: bool = False
    buyer_match: bool = False
    seal_valid: bool = False
    duplicate_found: bool = False
    cross_project_duplicate: bool = False

    @property
    def total_amount(self) -> float:
        return self.invoice.total_amount or 0.0


@dataclass
class VerificationReport:
    generated_at: datetime = field(default_factory=datetime.now)
    total_invoices: int = 0
    approved_count: int = 0
    need_review_count: int = 0
    duplicate_count: int = 0
    approved: List[VerificationResult] = field(default_factory=list)
    need_review: List[VerificationResult] = field(default_factory=list)
    duplicates: List[VerificationResult] = field(default_factory=list)
    high_value_threshold: float = 10000.0
