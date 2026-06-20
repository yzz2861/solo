from typing import List, Tuple
from collections import defaultdict
import os

from .models import OrderItem, FileInfo, Order, ItemStatus
from .scanner import detect_file_type


def detect_invalid_files(items: List[OrderItem]) -> List[str]:
    issues = []
    for item in items:
        if not item.file_info.is_valid:
            issues.append(
                f"文件异常: {item.file_info.filename} - {item.file_info.error_msg}"
            )
    return issues


def detect_zero_page_files(items: List[OrderItem]) -> List[str]:
    issues = []
    for item in items:
        if item.file_info.is_valid and item.file_info.page_count == 0:
            issues.append(
                f"页数为零: {item.file_info.filename}"
            )
    return issues


def detect_duplicate_names(items: List[OrderItem]) -> List[str]:
    warnings = []
    name_groups = defaultdict(list)

    for item in items:
        basename = os.path.splitext(item.file_info.filename)[0]
        clean_name = basename
        for suffix in ["_v1", "_v2", "_final", " 副本", " - 副本", "_新版", "_旧版", "版本2"]:
            clean_name = clean_name.replace(suffix, "")

        name_groups[clean_name].append(item)

    for name, group in name_groups.items():
        if len(group) > 1:
            filenames = [i.file_info.filename for i in group]
            warnings.append(
                f"同名多版本: {name} 有 {len(group)} 个版本: {', '.join(filenames)}"
            )

    return warnings


def detect_spec_file_mismatch(
    items: List[OrderItem],
    expected_count: int = None,
    raw_notes: str = "",
) -> List[str]:
    warnings = []

    valid_items = [i for i in items if i.file_info.is_valid]

    if expected_count and expected_count != len(valid_items):
        warnings.append(
            f"数量不符: 备注提到 {expected_count} 个文件，但实际找到 {len(valid_items)} 个有效文件"
        )

    per_file_count = 0
    for keyword in ["份文件", "个文件", "个pdf", "个PPT", "个文件"]:
        if keyword in raw_notes.lower():
            per_file_count += 1

    return warnings


def validate_order(order: Order, expected_file_count: int = None) -> Order:
    all_issues = []
    all_warnings = []

    issues = detect_invalid_files(order.items)
    all_issues.extend(issues)

    zero_page = detect_zero_page_files(order.items)
    all_issues.extend(zero_page)

    duplicates = detect_duplicate_names(order.items)
    all_warnings.extend(duplicates)

    mismatch = detect_spec_file_mismatch(order.items, expected_file_count, order.raw_notes)
    all_warnings.extend(mismatch)

    for item in order.items:
        if not item.file_info.is_valid:
            item.status = ItemStatus.ISSUE

    order.issues = all_issues
    order.warnings = all_warnings

    return order
