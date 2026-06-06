import re
import uuid
from typing import List, Dict, Any, Tuple
from datetime import datetime

from .config import (
    AppConfig, BadRowReason, BAD_ROW_LABELS, VALID_NOISE_TYPES, REQUIRED_FIELDS
)
from .logger import OperationLogger
from .reader import DataReader


class BadRowDetector:
    def __init__(self, config: AppConfig, logger: OperationLogger):
        self.config = config
        self.logger = logger

    def detect_and_isolate(
        self, rows: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        self.logger.info(f"开始坏行检测，共 {len(rows)} 行数据")

        good_rows = []
        bad_rows = []
        seen_complaint_ids = set()

        for row in rows:
            reasons = []
            trace_id = self._generate_trace_id()

            reasons.extend(self._check_required_fields(row))
            reasons.extend(self._check_phone(row))
            reasons.extend(self._check_date(row))
            reasons.extend(self._check_noise_type(row))
            reasons.extend(self._check_address(row))

            duplicate_reason = self._check_duplicate_complaint_id(row, seen_complaint_ids)
            if duplicate_reason:
                reasons.append(duplicate_reason)

            filter_reasons = self._check_filter_range(row)
            reasons.extend(filter_reasons)

            if reasons:
                bad_row = self._build_bad_row(row, reasons, trace_id)
                bad_rows.append(bad_row)
                self.logger.debug(
                    f"坏行 detected: 行号={row.get('_row_no', '?')}, "
                    f"原因={','.join([r[0].value for r in reasons])}, "
                    f"追溯号={trace_id}"
                )
            else:
                good_row = dict(row)
                good_row['_trace_id'] = trace_id
                good_row['_batch_no'] = self.config.batch_no
                good_row['_source_system'] = self.config.source_system
                good_rows.append(good_row)

        self.logger.info(
            f"坏行检测完成，有效行: {len(good_rows)}, 坏行: {len(bad_rows)}"
        )

        reason_counts = {}
        for bad_row in bad_rows:
            for reason in bad_row.get('_bad_reasons', []):
                reason_key = reason.get('reason_code', 'unknown')
                reason_counts[reason_key] = reason_counts.get(reason_key, 0) + 1

        if reason_counts:
            self.logger.info("坏行原因统计:")
            for code, count in reason_counts.items():
                label = BAD_ROW_LABELS.get(BadRowReason(code), code) if code in [r.value for r in BadRowReason] else code
                self.logger.info(f"  - {label}: {count} 条")

        return good_rows, bad_rows

    def _check_required_fields(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        missing_fields = []

        for field in REQUIRED_FIELDS:
            value = row.get(field, '')
            if value is None or str(value).strip() == '':
                missing_fields.append(field)

        if missing_fields:
            reasons.append((
                BadRowReason.MISSING_REQUIRED_FIELD,
                f"缺失必填字段: {', '.join(missing_fields)}"
            ))

        return reasons

    def _check_phone(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        phone = str(row.get('phone', '') or '').strip()

        if not phone:
            return reasons

        china_mobile_pattern = r'^1[3-9]\d{9}$'
        china_landline_pattern = r'^0\d{2,3}-?\d{7,8}$'
        clean_phone = re.sub(r'[\s\-]', '', phone)

        if not re.match(china_mobile_pattern, clean_phone) and not re.match(china_landline_pattern, clean_phone):
            reasons.append((
                BadRowReason.INVALID_PHONE,
                f"电话号码格式无效: {phone}"
            ))

        return reasons

    def _check_date(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        date_str = str(row.get('complaint_time', '') or '').strip()

        if not date_str:
            return reasons

        parsed = DataReader.parse_datetime(date_str)
        if parsed is None:
            reasons.append((
                BadRowReason.INVALID_DATE,
                f"日期格式无效: {date_str}"
            ))
        else:
            now = datetime.now()
            if parsed > now:
                reasons.append((
                    BadRowReason.INVALID_DATE,
                    f"投诉时间晚于当前时间: {date_str}"
                ))
            if parsed.year < 2000:
                reasons.append((
                    BadRowReason.INVALID_DATE,
                    f"投诉时间过早(早于2000年): {date_str}"
                ))

        return reasons

    def _check_noise_type(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        noise_type = str(row.get('noise_type', '') or '').strip()

        if not noise_type:
            return reasons

        if noise_type not in VALID_NOISE_TYPES:
            reasons.append((
                BadRowReason.INVALID_NOISE_TYPE,
                f"噪声类型不在有效范围内: {noise_type}"
            ))

        return reasons

    def _check_address(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        address = str(row.get('address', '') or '').strip()

        if not address:
            return reasons

        if len(address) < 3:
            reasons.append((
                BadRowReason.INVALID_ADDRESS,
                f"地址长度过短: {address}"
            ))

        return reasons

    def _check_duplicate_complaint_id(
        self, row: Dict[str, Any], seen_ids: set
    ) -> Tuple[BadRowReason, str]:
        complaint_id = str(row.get('complaint_id', '') or '').strip()

        if not complaint_id:
            return None

        if complaint_id in seen_ids:
            return (
                BadRowReason.DUPLICATE_COMPLAINT_ID,
                f"投诉编号重复: {complaint_id}"
            )

        seen_ids.add(complaint_id)
        return None

    def _check_filter_range(self, row: Dict[str, Any]) -> List[Tuple[BadRowReason, str]]:
        reasons = []
        filters = self.config.filters

        if not filters:
            return reasons

        has_any_filter = any([
            filters.start_date, filters.end_date,
            filters.noise_types, filters.districts, filters.sources
        ])

        if not has_any_filter:
            return reasons

        out_of_range_reasons = []

        if filters.start_date or filters.end_date:
            date_str = str(row.get('complaint_time', '') or '').strip()
            parsed = DataReader.parse_datetime(date_str)
            if parsed:
                if filters.start_date:
                    start_parsed = DataReader.parse_datetime(filters.start_date)
                    if start_parsed and parsed < start_parsed:
                        out_of_range_reasons.append(
                            f"投诉时间早于筛选起始日期: {date_str} < {filters.start_date}"
                        )
                if filters.end_date:
                    end_parsed = DataReader.parse_datetime(filters.end_date + " 23:59:59")
                    if end_parsed and parsed > end_parsed:
                        out_of_range_reasons.append(
                            f"投诉时间晚于筛选结束日期: {date_str} > {filters.end_date}"
                        )

        if filters.noise_types:
            noise_type = str(row.get('noise_type', '') or '').strip()
            if noise_type and noise_type not in filters.noise_types:
                out_of_range_reasons.append(
                    f"噪声类型不在筛选范围内: {noise_type}"
                )

        if filters.sources:
            source = str(row.get('source', '') or '').strip()
            if source and source not in filters.sources:
                out_of_range_reasons.append(
                    f"来源不在筛选范围内: {source}"
                )

        if filters.districts:
            address = str(row.get('address', '') or '').strip()
            if address:
                matched = any(district in address for district in filters.districts)
                if not matched:
                    out_of_range_reasons.append(
                        f"地址不在筛选区域内: {address}"
                    )

        if out_of_range_reasons:
            reasons.append((
                BadRowReason.OUT_OF_FILTER_RANGE,
                "; ".join(out_of_range_reasons)
            ))

        return reasons

    @staticmethod
    def _generate_trace_id() -> str:
        return f"TRACE{uuid.uuid4().hex[:12].upper()}"

    def _build_bad_row(
        self, row: Dict[str, Any], reasons: List[Tuple[BadRowReason, str]], trace_id: str
    ) -> Dict[str, Any]:
        bad_row = dict(row)
        bad_row['_trace_id'] = trace_id
        bad_row['_batch_no'] = self.config.batch_no
        bad_row['_source_system'] = self.config.source_system

        reason_codes = []
        reason_labels = []
        reason_details = []

        for reason_code, reason_detail in reasons:
            reason_codes.append(reason_code.value)
            reason_labels.append(BAD_ROW_LABELS.get(reason_code, reason_code.value))
            reason_details.append(reason_detail)

        bad_row['_bad_reason_codes'] = ";".join(reason_codes)
        bad_row['_bad_reason_labels'] = ";".join(reason_labels)
        bad_row['_bad_reason_details'] = " | ".join(reason_details)
        bad_row['_bad_reasons'] = [
            {
                'reason_code': rc.value,
                'reason_label': BAD_ROW_LABELS.get(rc, rc.value),
                'reason_detail': rd,
            }
            for rc, rd in reasons
        ]

        return bad_row
