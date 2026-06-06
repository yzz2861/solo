from typing import List, Dict, Any, Tuple
from datetime import datetime
from collections import defaultdict


class DataCleaner:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.bad_data_rules = config.get('bad_data_rules', {})
        self.missing_fields = self.bad_data_rules.get('missing_fields', [
            'timestamp', 'tunnel_id', 'device_id', 'brightness'
        ])
        self.value_ranges = self.bad_data_rules.get('value_ranges', {
            'brightness': [0, 10000],
            'power': [0, 5000],
            'temperature': [-40, 100]
        })
        self.duplicate_keys = self.bad_data_rules.get('duplicate_keys', [
            'timestamp', 'device_id'
        ])

        self.bad_data = []
        self.clean_data = []
        self.stats = {
            'total': 0,
            'valid': 0,
            'invalid': 0,
            'missing_field': 0,
            'out_of_range': 0,
            'duplicate': 0,
            'invalid_timestamp': 0
        }

    def clean(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        self.stats['total'] = len(records)
        self.bad_data = []
        self.clean_data = []

        seen_keys = set()

        for idx, record in enumerate(records):
            issues = []

            issues.extend(self._check_missing_fields(record))
            issues.extend(self._check_timestamp(record))
            issues.extend(self._check_value_ranges(record))

            dup_issue = self._check_duplicate(record, seen_keys)
            if dup_issue:
                issues.append(dup_issue)

            if issues:
                bad_record = {
                    **record,
                    '_bad_reasons': issues,
                    '_bad_count': len(issues),
                    '_original_index': idx,
                    '_clean_time': datetime.now().isoformat()
                }
                self.bad_data.append(bad_record)
                self._update_bad_stats(issues)
            else:
                self.clean_data.append(record)

        self.stats['invalid'] = len(self.bad_data)
        self.stats['valid'] = len(self.clean_data)

        return self.clean_data, self.bad_data

    def _check_missing_fields(self, record: Dict[str, Any]) -> List[str]:
        issues = []
        for field in self.missing_fields:
            if field not in record or record[field] is None or str(record[field]).strip() == '':
                issues.append(f"缺失字段: {field}")
        return issues

    def _check_timestamp(self, record: Dict[str, Any]) -> List[str]:
        issues = []
        if 'timestamp' not in record:
            return issues

        ts = record['timestamp']
        if isinstance(ts, datetime):
            return issues

        if isinstance(ts, str):
            try:
                parsed = self._parse_timestamp(ts)
                record['timestamp'] = parsed
            except (ValueError, TypeError):
                issues.append(f"无效时间戳: {ts}")
        else:
            issues.append(f"时间戳类型错误: {type(ts).__name__}")

        return issues

    def _parse_timestamp(self, ts_str: str) -> datetime:
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y/%m/%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y%m%d%H%M%S',
        ]
        for fmt in formats:
            try:
                return datetime.strptime(ts_str, fmt)
            except ValueError:
                continue
        return datetime.fromisoformat(ts_str)

    def _check_value_ranges(self, record: Dict[str, Any]) -> List[str]:
        issues = []
        for field, (min_val, max_val) in self.value_ranges.items():
            if field not in record or record[field] is None:
                continue

            try:
                value = float(record[field])
                if value < min_val or value > max_val:
                    issues.append(f"{field} 超出范围: {value} (范围: {min_val}-{max_val})")
            except (ValueError, TypeError):
                issues.append(f"{field} 非数值: {record[field]}")

        return issues

    def _check_duplicate(self, record: Dict[str, Any], seen_keys: set) -> str:
        if not self.duplicate_keys:
            return None

        key_parts = []
        for key in self.duplicate_keys:
            if key in record and record[key] is not None:
                if isinstance(record[key], datetime):
                    key_parts.append(record[key].isoformat())
                else:
                    key_parts.append(str(record[key]))
            else:
                return None

        if not key_parts:
            return None

        dup_key = '|'.join(key_parts)
        if dup_key in seen_keys:
            return f"重复记录: {dup_key}"

        seen_keys.add(dup_key)
        return None

    def _update_bad_stats(self, issues: List[str]):
        for issue in issues:
            if '缺失字段' in issue:
                self.stats['missing_field'] += 1
            elif '超出范围' in issue or '非数值' in issue:
                self.stats['out_of_range'] += 1
            elif '重复记录' in issue:
                self.stats['duplicate'] += 1
            elif '无效时间戳' in issue or '时间戳类型错误' in issue:
                self.stats['invalid_timestamp'] += 1

    def get_clean_data(self) -> List[Dict[str, Any]]:
        return self.clean_data

    def get_bad_data(self) -> List[Dict[str, Any]]:
        return self.bad_data

    def get_stats(self) -> Dict[str, Any]:
        return self.stats.copy()

    def get_bad_data_summary(self) -> Dict[str, Any]:
        summary = {
            'total_bad_records': len(self.bad_data),
            'by_reason_type': defaultdict(int),
            'by_source_file': defaultdict(int),
            'sample_records': self.bad_data[:10] if self.bad_data else []
        }

        for record in self.bad_data:
            for reason in record.get('_bad_reasons', []):
                if '缺失字段' in reason:
                    summary['by_reason_type']['missing_field'] += 1
                elif '超出范围' in reason or '非数值' in reason:
                    summary['by_reason_type']['out_of_range'] += 1
                elif '重复记录' in reason:
                    summary['by_reason_type']['duplicate'] += 1
                elif '无效时间戳' in reason or '时间戳类型错误' in reason:
                    summary['by_reason_type']['invalid_timestamp'] += 1
                else:
                    summary['by_reason_type']['other'] += 1

            source_file = record.get('_source_file', 'unknown')
            summary['by_source_file'][source_file] += 1

        return dict(summary)
