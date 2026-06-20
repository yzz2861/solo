import re
from typing import List, Dict, Set
from collections import defaultdict

from .models import (
    SampleRecord, SampleStatus, BoxLayout, BoxOccupancy,
    BatchRule, ValidationIssue, ValidationReport, RiskLevel
)


def validate_samples(
    samples: List[SampleRecord],
    box_layouts: Dict[str, BoxLayout],
    batch_rules: List[BatchRule],
    id_format_config: dict = None
) -> ValidationReport:
    report = ValidationReport()

    report.total_samples = len(samples)
    report.active_samples = sum(1 for s in samples if s.status == SampleStatus.ACTIVE)
    report.temporary_samples = sum(1 for s in samples if s.status == SampleStatus.TEMPORARY)
    report.destroyed_samples = sum(1 for s in samples if s.status == SampleStatus.DESTROYED)

    boxes = _build_box_occupancy(samples, box_layouts)
    report.boxes = boxes
    report.total_boxes = len(boxes)

    issues = []

    issues.extend(check_id_format(samples, id_format_config or {}))
    issues.extend(check_case_sensitivity(samples))
    issues.extend(check_whitespace_issues(samples))
    issues.extend(check_position_conflicts(samples, box_layouts))
    issues.extend(check_invalid_positions(samples, box_layouts))
    issues.extend(check_duplicate_sample_ids(samples))
    issues.extend(check_batch_dates(samples, batch_rules))
    issues.extend(check_missing_slots(boxes, box_layouts))
    issues.extend(check_temporary_samples(samples))
    issues.extend(check_destroyed_samples(samples))
    issues.extend(check_unregistered_boxes(samples, box_layouts))

    report.issues = sorted(issues, key=lambda i: (
        _severity_order(i.severity), i.issue_type
    ))

    return report


def _severity_order(severity: RiskLevel) -> int:
    order = {
        RiskLevel.HIGH: 0,
        RiskLevel.MEDIUM: 1,
        RiskLevel.LOW: 2,
        RiskLevel.INFO: 3,
    }
    return order.get(severity, 99)


def _build_box_occupancy(
    samples: List[SampleRecord],
    box_layouts: Dict[str, BoxLayout]
) -> Dict[str, BoxOccupancy]:
    boxes = {}

    all_box_ids = set(s.box_id for s in samples if s.box_id)
    for box_id in all_box_ids:
        layout = box_layouts.get(box_id)
        if layout is None:
            layout = BoxLayout(box_id=box_id)
        boxes[box_id] = BoxOccupancy(box_id=box_id, layout=layout)

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        if not sample.box_id or not sample.position:
            continue
        box = boxes.get(sample.box_id)
        if box:
            pos_key = sample.position.strip().upper()
            if pos_key not in box.occupied:
                box.occupied[pos_key] = sample

    return boxes


def check_id_format(samples: List[SampleRecord], id_config: dict) -> List[ValidationIssue]:
    issues = []
    pattern = id_config.get('pattern', '')
    if not pattern:
        return issues

    case_sensitive = id_config.get('case_sensitive', True)
    flags = 0 if case_sensitive else re.IGNORECASE

    try:
        regex = re.compile(pattern, flags)
    except re.error:
        return issues

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        if not regex.match(sample.sample_id):
            issues.append(ValidationIssue(
                issue_type='id_format',
                severity=RiskLevel.MEDIUM,
                message=f'样本号 "{sample.sample_id}" 不符合规范格式',
                sample_id=sample.sample_id,
                details={
                    'expected_pattern': pattern,
                    'row': str(sample.row_num),
                    'raw_id': sample.raw_id
                }
            ))

    return issues


def check_case_sensitivity(samples: List[SampleRecord]) -> List[ValidationIssue]:
    issues = []
    id_map: Dict[str, List[SampleRecord]] = defaultdict(list)

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        normalized = sample.normalized_id
        id_map[normalized].append(sample)

    for normalized, records in id_map.items():
        if len(records) <= 1:
            continue
        distinct_ids = set(r.sample_id for r in records)
        if len(distinct_ids) > 1:
            issues.append(ValidationIssue(
                issue_type='case_conflict',
                severity=RiskLevel.HIGH,
                message=f'样本号存在大小写差异: {", ".join(sorted(distinct_ids))}',
                sample_id=normalized,
                details={
                    'variants': ', '.join(sorted(distinct_ids)),
                    'count': str(len(records)),
                    'rows': ', '.join(str(r.row_num) for r in records)
                }
            ))

    return issues


def check_whitespace_issues(samples: List[SampleRecord]) -> List[ValidationIssue]:
    issues = []

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        raw = sample.raw_id
        stripped = raw.strip()
        if raw != stripped:
            issues.append(ValidationIssue(
                issue_type='whitespace',
                severity=RiskLevel.LOW,
                message=f'样本号包含首尾空格: "{raw}"',
                sample_id=sample.sample_id,
                details={
                    'raw': repr(raw),
                    'row': str(sample.row_num)
                }
            ))

        if '  ' in sample.sample_id:
            issues.append(ValidationIssue(
                issue_type='whitespace',
                severity=RiskLevel.LOW,
                message=f'样本号包含连续空格: "{sample.sample_id}"',
                sample_id=sample.sample_id,
                details={
                    'raw': repr(sample.sample_id),
                    'row': str(sample.row_num)
                }
            ))

    return issues


def check_position_conflicts(
    samples: List[SampleRecord],
    box_layouts: Dict[str, BoxLayout]
) -> List[ValidationIssue]:
    issues = []
    pos_map: Dict[str, List[SampleRecord]] = defaultdict(list)

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        if not sample.box_id or not sample.position:
            continue
        pos_key = f"{sample.box_id}:{sample.position.strip().upper()}"
        pos_map[pos_key].append(sample)

    for pos_key, records in pos_map.items():
        if len(records) <= 1:
            continue
        box_id, position = pos_key.split(':', 1)

        active_records = [r for r in records if r.status != SampleStatus.DESTROYED]
        if len(active_records) <= 1:
            continue

        sample_ids = [r.sample_id for r in active_records]
        severity = RiskLevel.HIGH

        has_temp = any(r.status == SampleStatus.TEMPORARY for r in active_records)
        if has_temp and len(active_records) == 2:
            severity = RiskLevel.MEDIUM

        issues.append(ValidationIssue(
            issue_type='position_conflict',
            severity=severity,
            message=f'盒位冲突: {box_id} 盒 {position} 位置有 {len(active_records)} 个样本',
            box_id=box_id,
            position=position,
            sample_id=sample_ids[0],
            details={
                'samples': ', '.join(sample_ids),
                'count': str(len(active_records)),
                'rows': ', '.join(str(r.row_num) for r in active_records),
                'statuses': ', '.join(r.status.value for r in active_records)
            }
        ))

    return issues


def check_invalid_positions(
    samples: List[SampleRecord],
    box_layouts: Dict[str, BoxLayout]
) -> List[ValidationIssue]:
    issues = []

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        if not sample.box_id or not sample.position:
            issues.append(ValidationIssue(
                issue_type='missing_position',
                severity=RiskLevel.MEDIUM,
                message=f'样本 "{sample.sample_id}" 缺少盒号或孔位信息',
                sample_id=sample.sample_id,
                details={
                    'box_id': sample.box_id or '(空)',
                    'position': sample.position or '(空)',
                    'row': str(sample.row_num)
                }
            ))
            continue

        layout = box_layouts.get(sample.box_id)
        if layout and not layout.is_valid_position(sample.position):
            issues.append(ValidationIssue(
                issue_type='invalid_position',
                severity=RiskLevel.HIGH,
                message=f'样本 "{sample.sample_id}" 孔位无效: {sample.position}',
                sample_id=sample.sample_id,
                box_id=sample.box_id,
                position=sample.position,
                details={
                    'box_rows': str(layout.rows),
                    'box_cols': str(layout.cols),
                    'row': str(sample.row_num)
                }
            ))

    return issues


def check_duplicate_sample_ids(samples: List[SampleRecord]) -> List[ValidationIssue]:
    issues = []
    id_map: Dict[str, List[SampleRecord]] = defaultdict(list)

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        id_map[sample.sample_id].append(sample)

    for sample_id, records in id_map.items():
        if len(records) <= 1:
            continue

        positions = set(r.position_key for r in records if r.box_id and r.position)

        if len(positions) > 1:
            issues.append(ValidationIssue(
                issue_type='duplicate_id_multi_pos',
                severity=RiskLevel.HIGH,
                message=f'样本号重复且分布在不同位置: {sample_id}',
                sample_id=sample_id,
                details={
                    'count': str(len(records)),
                    'positions': ', '.join(sorted(positions)),
                    'rows': ', '.join(str(r.row_num) for r in records)
                }
            ))
        else:
            issues.append(ValidationIssue(
                issue_type='duplicate_id',
                severity=RiskLevel.MEDIUM,
                message=f'样本号重复: {sample_id} (同一位置有 {len(records)} 条记录)',
                sample_id=sample_id,
                details={
                    'count': str(len(records)),
                    'rows': ', '.join(str(r.row_num) for r in records)
                }
            ))

    return issues


def check_batch_dates(
    samples: List[SampleRecord],
    batch_rules: List[BatchRule]
) -> List[ValidationIssue]:
    issues = []
    if not batch_rules:
        return issues

    batch_map = {rule.batch_id: rule for rule in batch_rules}

    for sample in samples:
        if sample.status == SampleStatus.DESTROYED:
            continue
        if not sample.batch_id:
            continue

        rule = batch_map.get(sample.batch_id)
        if not rule:
            issues.append(ValidationIssue(
                issue_type='unknown_batch',
                severity=RiskLevel.LOW,
                message=f'未知批次: {sample.batch_id} (样本 {sample.sample_id})',
                sample_id=sample.sample_id,
                details={'batch_id': sample.batch_id, 'row': str(sample.row_num)}
            ))
            continue

        if sample.collect_date and rule.start_date and sample.collect_date < rule.start_date:
            issues.append(ValidationIssue(
                issue_type='date_out_of_range',
                severity=RiskLevel.MEDIUM,
                message=f'样本日期早于批次开始日期: {sample.sample_id}',
                sample_id=sample.sample_id,
                details={
                    'batch_id': sample.batch_id,
                    'sample_date': str(sample.collect_date),
                    'batch_start': str(rule.start_date),
                    'row': str(sample.row_num)
                }
            ))

        if sample.collect_date and rule.end_date and sample.collect_date > rule.end_date:
            issues.append(ValidationIssue(
                issue_type='date_out_of_range',
                severity=RiskLevel.MEDIUM,
                message=f'样本日期晚于批次结束日期: {sample.sample_id}',
                sample_id=sample.sample_id,
                details={
                    'batch_id': sample.batch_id,
                    'sample_date': str(sample.collect_date),
                    'batch_end': str(rule.end_date),
                    'row': str(sample.row_num)
                }
            ))

    return issues


def check_missing_slots(
    boxes: Dict[str, BoxOccupancy],
    box_layouts: Dict[str, BoxLayout]
) -> List[ValidationIssue]:
    issues = []

    for box_id, box in boxes.items():
        layout = box_layouts.get(box_id)
        if not layout:
            continue

        free_count = box.free_slots
        total = box.total_slots
        occupancy_rate = box.occupancy_rate

        if occupancy_rate < 0.3 and total > 20:
            issues.append(ValidationIssue(
                issue_type='low_occupancy',
                severity=RiskLevel.INFO,
                message=f'冻存盒 {box_id} 空位较多 (占用 {box.used_slots}/{total}, {occupancy_rate:.0%})',
                box_id=box_id,
                details={
                    'used': str(box.used_slots),
                    'total': str(total),
                    'free': str(free_count),
                    'rate': f'{occupancy_rate:.1%}'
                }
            ))

    return issues


def check_temporary_samples(samples: List[SampleRecord]) -> List[ValidationIssue]:
    issues = []
    temp_samples = [s for s in samples if s.status == SampleStatus.TEMPORARY]

    if temp_samples:
        issues.append(ValidationIssue(
            issue_type='temporary_samples',
            severity=RiskLevel.INFO,
            message=f'共有 {len(temp_samples)} 个临时样本需关注',
            details={
                'count': str(len(temp_samples)),
                'samples': ', '.join(s.sample_id for s in temp_samples[:10]),
                'truncated': str(len(temp_samples) > 10)
            }
        ))

    return issues


def check_destroyed_samples(samples: List[SampleRecord]) -> List[ValidationIssue]:
    issues = []
    destroyed_samples = [s for s in samples if s.status == SampleStatus.DESTROYED]

    if destroyed_samples:
        issues.append(ValidationIssue(
            issue_type='destroyed_samples',
            severity=RiskLevel.INFO,
            message=f'共有 {len(destroyed_samples)} 个已销毁样本记录',
            details={
                'count': str(len(destroyed_samples)),
                'samples': ', '.join(s.sample_id for s in destroyed_samples[:10]),
                'truncated': str(len(destroyed_samples) > 10)
            }
        ))

    return issues


def check_unregistered_boxes(
    samples: List[SampleRecord],
    box_layouts: Dict[str, BoxLayout]
) -> List[ValidationIssue]:
    issues = []
    used_boxes = set(s.box_id for s in samples if s.box_id and s.status != SampleStatus.DESTROYED)
    registered_boxes = set(box_layouts.keys())

    unregistered = used_boxes - registered_boxes
    if unregistered:
        for box_id in sorted(unregistered):
            count = sum(1 for s in samples if s.box_id == box_id and s.status != SampleStatus.DESTROYED)
            issues.append(ValidationIssue(
                issue_type='unregistered_box',
                severity=RiskLevel.LOW,
                message=f'未注册的冻存盒: {box_id} (含 {count} 个样本)',
                box_id=box_id,
                details={'sample_count': str(count)}
            ))

    return issues
