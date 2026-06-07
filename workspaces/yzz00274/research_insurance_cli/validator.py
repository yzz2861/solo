"""数据校验引擎"""

from typing import Dict, List, Any, Optional
from datetime import date

from .config import RecordStatus, REQUIRED_FIELDS, DEFAULT_FIELD_MAPPING
from .models import InsuranceRecord, ValidationIssue
from .utils import validate_id_card, validate_phone, validate_name, parse_date, safe_str


class ValidationEngine:
    def __init__(
        self,
        field_mapping: Optional[Dict[str, str]] = None,
        date_range: Optional[tuple[date, date]] = None,
    ):
        self.field_mapping = field_mapping or DEFAULT_FIELD_MAPPING
        self.date_range = date_range

    def map_fields(self, raw_row: Dict[str, Any]) -> Dict[str, Any]:
        mapped = {}
        reverse_mapping = {v: k for k, v in self.field_mapping.items()}

        for col_name, value in raw_row.items():
            field_key = reverse_mapping.get(col_name)
            if field_key:
                mapped[field_key] = value
            else:
                mapped[col_name] = value

        return mapped

    def validate_record(
        self,
        raw_row: Dict[str, Any],
        source_file: str,
        source_row: int,
    ) -> InsuranceRecord:
        mapped_data = self.map_fields(raw_row)
        issues: List[ValidationIssue] = []

        for field in REQUIRED_FIELDS:
            value = mapped_data.get(field)
            if value is None or safe_str(value) == "":
                field_cn = self.field_mapping.get(field, field)
                issues.append(ValidationIssue(
                    code=f"missing_{field}",
                    message=f"缺少必填字段：{field_cn}",
                    severity="error",
                ))

        name_val = safe_str(mapped_data.get("name", ""))
        if name_val:
            valid, msg = validate_name(name_val)
            if not valid:
                issues.append(ValidationIssue(
                    code="invalid_name",
                    message=msg,
                    severity="error",
                ))

        id_card_val = safe_str(mapped_data.get("id_card", ""))
        if id_card_val:
            valid, msg = validate_id_card(id_card_val)
            if not valid:
                issues.append(ValidationIssue(
                    code="invalid_id_card",
                    message=msg,
                    severity="error",
                ))

        phone_val = safe_str(mapped_data.get("phone", ""))
        if phone_val:
            valid, msg = validate_phone(phone_val)
            if not valid:
                issues.append(ValidationIssue(
                    code="invalid_phone",
                    message=msg,
                    severity="warning",
                ))

        start_date = parse_date(mapped_data.get("start_date"))
        end_date = parse_date(mapped_data.get("end_date"))

        if start_date and end_date and start_date > end_date:
            issues.append(ValidationIssue(
                code="date_range_invalid",
                message="活动开始日期晚于结束日期",
                severity="error",
            ))

        if self.date_range:
            range_start, range_end = self.date_range
            if start_date and start_date < range_start:
                issues.append(ValidationIssue(
                    code="date_out_of_range_early",
                    message=f"活动开始日期早于指定范围（{range_start}）",
                    severity="warning",
                ))
            if end_date and end_date > range_end:
                issues.append(ValidationIssue(
                    code="date_out_of_range_late",
                    message=f"活动结束日期晚于指定范围（{range_end}）",
                    severity="warning",
                ))

        policy_number = safe_str(mapped_data.get("policy_number", ""))
        insurance_company = safe_str(mapped_data.get("insurance_company", ""))
        insurance_amount = mapped_data.get("insurance_amount")

        if policy_number and not insurance_company:
            issues.append(ValidationIssue(
                code="policy_without_company",
                message="有保单号但缺少保险公司信息",
                severity="warning",
            ))

        if insurance_amount is not None and safe_str(insurance_amount) != "":
            try:
                amount = float(insurance_amount)
                if amount <= 0:
                    issues.append(ValidationIssue(
                        code="invalid_amount",
                        message="保额必须大于0",
                        severity="error",
                    ))
            except (ValueError, TypeError):
                issues.append(ValidationIssue(
                    code="invalid_amount_format",
                    message="保额格式不正确",
                    severity="warning",
                ))

        has_errors = any(issue.severity == "error" for issue in issues)
        has_warnings = any(issue.severity == "warning" for issue in issues)

        if has_errors:
            status = RecordStatus.ABNORMAL
        elif has_warnings:
            status = RecordStatus.PENDING_REVIEW
        else:
            status = RecordStatus.NORMAL

        mapped_display = {}
        for key, value in mapped_data.items():
            cn_key = self.field_mapping.get(key, key)
            mapped_display[cn_key] = value

        return InsuranceRecord(
            source_file=source_file,
            source_row=source_row,
            raw_data=raw_row,
            mapped_data=mapped_display,
            status=status,
            issues=issues,
        )

    def validate_batch(
        self,
        rows: List[Dict[str, Any]],
        source_file: str,
        start_row: int = 2,
    ) -> List[InsuranceRecord]:
        records = []
        for i, row in enumerate(rows):
            record = self.validate_record(row, source_file, start_row + i)
            records.append(record)
        return records
