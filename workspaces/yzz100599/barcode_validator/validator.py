import re
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional
from .rules import SupplierRule


@dataclass
class ValidationIssue:
    code: str
    message: str


@dataclass
class BarcodeRecord:
    raw_line_number: int
    raw_barcode: str
    clean_barcode: str
    supplier_code: str
    box_id: str = ""
    scan_time: str = ""
    issues: list[ValidationIssue] = field(default_factory=list)
    is_bad_row: bool = False

    @property
    def is_valid(self) -> bool:
        return not self.is_bad_row and len(self.issues) == 0


def _calc_mod10(payload: str) -> int:
    digits = "".join(ch for ch in payload if ch.isdigit())
    if not digits:
        raise ValueError("no digits in payload")
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return (10 - (total % 10)) % 10


def _calc_mod11(payload: str) -> int:
    digits = "".join(ch for ch in payload if ch.isdigit())
    if not digits:
        raise ValueError("no digits in payload")
    weights = list(range(2, 8))
    total = 0
    for i, ch in enumerate(reversed(digits)):
        total += int(ch) * weights[i % len(weights)]
    remainder = total % 11
    if remainder == 0:
        return 0
    if remainder == 1:
        return -1
    return 11 - remainder


def _extract_date(barcode: str, rule) -> Optional[datetime]:
    if rule is None:
        return None
    segment = barcode[rule.start : rule.end]
    try:
        return datetime.strptime(segment, rule.format)
    except (ValueError, IndexError):
        return None


def validate_barcode(record: BarcodeRecord, rule: Optional[SupplierRule]) -> None:
    barcode = record.clean_barcode

    if rule is None:
        record.issues.append(
            ValidationIssue("UNKNOWN_SUPPLIER", f"供应商 {record.supplier_code} 无匹配规则")
        )
        return

    if rule.prefix and not barcode.startswith(rule.prefix):
        record.issues.append(
            ValidationIssue(
                "PREFIX_MISMATCH",
                f"前缀不匹配: 期望 '{rule.prefix}', 实际 '{barcode[:len(rule.prefix)]}'",
            )
        )

    if rule.length and len(barcode) != rule.length:
        record.issues.append(
            ValidationIssue(
                "LENGTH_MISMATCH",
                f"长度不匹配: 期望 {rule.length}, 实际 {len(barcode)}",
            )
        )

    if rule.length_range and len(barcode) not in range(
        rule.length_range[0], rule.length_range[1] + 1
    ):
        record.issues.append(
            ValidationIssue(
                "LENGTH_RANGE_MISMATCH",
                f"长度不在范围: 期望 {rule.length_range[0]}-{rule.length_range[1]}, 实际 {len(barcode)}",
            )
        )

    if rule.check_digit and rule.check_digit.algorithm != "none":
        pos = rule.check_digit.position
        payload = barcode[:pos] if pos >= 0 else barcode[:pos]
        expected_char = barcode[pos]
        if rule.check_digit.algorithm == "mod10":
            try:
                calculated = _calc_mod10(payload)
                if str(calculated) != expected_char:
                    record.issues.append(
                        ValidationIssue(
                            "CHECK_DIGIT_FAILED",
                            f"校验位错误: 期望 {calculated}, 实际 {expected_char}",
                        )
                    )
            except (ValueError, IndexError):
                record.issues.append(
                    ValidationIssue("CHECK_DIGIT_FAILED", "校验位计算失败: 条码含非数字字符")
                )
        elif rule.check_digit.algorithm == "mod11":
            try:
                calculated = _calc_mod11(payload)
                if calculated == -1:
                    record.issues.append(
                        ValidationIssue("CHECK_DIGIT_FAILED", "校验位计算失败: MOD11 余数为1")
                    )
                elif str(calculated) != expected_char:
                    record.issues.append(
                        ValidationIssue(
                            "CHECK_DIGIT_FAILED",
                            f"校验位错误: 期望 {calculated}, 实际 {expected_char}",
                        )
                    )
            except (ValueError, IndexError):
                record.issues.append(
                    ValidationIssue("CHECK_DIGIT_FAILED", "校验位计算失败: 条码含非数字字符")
                )

    if rule.batch_date:
        batch_dt = _extract_date(barcode, rule.batch_date)
        if batch_dt is None:
            record.issues.append(
                ValidationIssue("BATCH_DATE_INVALID", "批次日期无法解析")
            )
        else:
            if rule.production_date:
                prod_dt = _extract_date(barcode, rule.production_date)
                if prod_dt is not None and batch_dt < prod_dt:
                    record.issues.append(
                        ValidationIssue(
                            "BATCH_BEFORE_PRODUCTION",
                            f"批次日期 {batch_dt.strftime('%Y-%m-%d')} 早于生产日期 {prod_dt.strftime('%Y-%m-%d')}",
                        )
                    )


def check_whitespace(record: BarcodeRecord) -> None:
    if record.raw_barcode != record.raw_barcode.strip():
        record.issues.append(
            ValidationIssue(
                "WHITESPACE_FOUND",
                "条码含首尾空白字符",
            )
        )
    if " " in record.raw_barcode.strip():
        record.issues.append(
            ValidationIssue(
                "WHITESPACE_IN_BARCODE",
                "条码中间含空格",
            )
        )


def check_duplicates(records: list[BarcodeRecord]) -> None:
    seen: dict[str, int] = {}
    for record in records:
        if record.is_bad_row:
            continue
        key = (record.clean_barcode, record.supplier_code)
        if key in seen:
            record.issues.append(
                ValidationIssue(
                    "DUPLICATE_BARCODE",
                    f"重复条码: 首次出现在原始行 {seen[key]}",
                )
            )
        else:
            seen[key] = record.raw_line_number


def validate_all(
    records: list[BarcodeRecord], rules: dict[str, SupplierRule]
) -> None:
    for record in records:
        if record.is_bad_row:
            continue
        check_whitespace(record)
        rule = rules.get(record.supplier_code)
        validate_barcode(record, rule)
    check_duplicates(records)
