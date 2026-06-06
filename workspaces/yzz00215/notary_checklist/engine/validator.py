from typing import List, Dict, Any, Tuple
from ..models.ledger import BusinessLedger, LedgerRecord
from ..models.params import ParamsConfig
from ..models.result import ReviewItem


class ValidationEngine:
    def __init__(self, params: ParamsConfig):
        self.params = params
        self.custom_required_fields = params.required_fields if params else []

    def validate(self, ledger: BusinessLedger) -> Tuple[List[ReviewItem], Dict[str, Any]]:
        all_reviews: List[ReviewItem] = []
        stats = {
            'total_records': len(ledger),
            'valid_records': 0,
            'invalid_records': 0,
            'issues_by_type': {},
        }

        duplicate_ids = ledger.get_duplicate_ids()
        for dup_id in duplicate_ids:
            item = ReviewItem(
                record_id=dup_id,
                issue_type='duplicate_record',
                issue_detail=f'记录ID重复，存在多条相同ID的记录',
                severity='error',
                field_name='record_id',
                suggestion='请核实并去重，确保每条记录有唯一ID',
            )
            all_reviews.append(item)

        for record in ledger.records:
            record_reviews = self._validate_record(record)
            all_reviews.extend(record_reviews)

        valid_ids = set()
        invalid_ids = set()
        for item in all_reviews:
            if item.severity == 'error':
                invalid_ids.add(item.record_id)

        for record in ledger.records:
            if record.record_id not in invalid_ids:
                valid_ids.add(record.record_id)

        stats['valid_records'] = len(valid_ids)
        stats['invalid_records'] = len(invalid_ids)

        for item in all_reviews:
            t = item.issue_type
            stats['issues_by_type'][t] = stats['issues_by_type'].get(t, 0) + 1

        return all_reviews, stats

    def _validate_record(self, record: LedgerRecord) -> List[ReviewItem]:
        issues: List[ReviewItem] = []

        missing_fields = record.validate_required()
        for field_name in missing_fields:
            issues.append(ReviewItem(
                record_id=record.record_id,
                issue_type='missing_required_field',
                issue_detail=f'缺少必填字段: {field_name}',
                severity='error',
                field_name=field_name,
                suggestion=f'请补充 {field_name} 字段的值',
            ))

        for field_name in self.custom_required_fields:
            val = getattr(record, field_name, None) or record.extra_fields.get(field_name)
            if val is None or (isinstance(val, str) and val.strip() == ''):
                issues.append(ReviewItem(
                    record_id=record.record_id,
                    issue_type='missing_custom_field',
                    issue_detail=f'缺少自定义必填字段: {field_name}',
                    severity='error',
                    field_name=field_name,
                    suggestion=f'请补充自定义字段 {field_name} 的值',
                ))

        rule_conflicts = self._check_rule_conflicts(record)
        issues.extend(rule_conflicts)

        if record.amount and record.amount < 0:
            issues.append(ReviewItem(
                record_id=record.record_id,
                issue_type='invalid_amount',
                issue_detail=f'金额为负数: {record.amount}',
                severity='warning',
                field_name='amount',
                suggestion='请核核实金额是否正确',
            ))

        return issues

    def _check_rule_conflicts(self, record: LedgerRecord) -> List[ReviewItem]:
        issues: List[ReviewItem] = []
        matched_rules = self.params.get_matching_rules(record)

        if len(matched_rules) > 1:
            rule_names = [r.rule_name for r in matched_rules]
            rule_ids = [r.rule_id for r in matched_rules]
            issues.append(ReviewItem(
                record_id=record.record_id,
                issue_type='multiple_rules_match',
                issue_detail=f'匹配到多条规则: {", ".join(rule_names)} (规则ID: {", ".join(rule_ids)})',
                severity='warning',
                field_name='notary_type',
                suggestion='请确认规则优先级设置是否正确，或调整规则条件避免冲突',
            ))

        if not matched_rules:
            issues.append(ReviewItem(
                record_id=record.record_id,
                issue_type='no_rule_match',
                issue_detail='未匹配到任何材料规则',
                severity='warning',
                field_name='notary_type',
                suggestion='请检查业务类型和公证类型配置，是否需要新增规则',
            ))

        return issues

    def get_validation_summary(self, review_items: List[ReviewItem]) -> Dict[str, Any]:
        summary = {
            'total_issues': len(review_items),
            'error_count': 0,
            'warning_count': 0,
            'by_type': {},
            'by_severity': {
                'error': [],
                'warning': [],
            },
        }

        for item in review_items:
            if item.severity == 'error':
                summary['error_count'] += 1
                summary['by_severity']['error'].append(item.to_dict())
            else:
                summary['warning_count'] += 1
                summary['by_severity']['warning'].append(item.to_dict())

            t = item.issue_type
            if t not in summary['by_type']:
                summary['by_type'][t] = []
            summary['by_type'][t].append(item.to_dict())

        return summary
