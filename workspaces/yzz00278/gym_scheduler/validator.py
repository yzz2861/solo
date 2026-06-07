import re
from datetime import date, time
from typing import List, Tuple

from .models import ScheduleRecord, RecordStatus, ValidationResult


PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")
TIME_PATTERN = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")

REQUIRED_FIELDS = [
    "member_name",
    "member_phone",
    "coach_name",
    "course_name",
    "course_date",
    "course_time",
    "duration_minutes",
]

REVIEW_TRIGGER_RULES = [
    ("duration_gt_120", "课程时长超过120分钟，需人工复核"),
    ("early_morning", "早于7:00的课程，需人工复核"),
    ("late_night", "晚于21:00的课程，需人工复核"),
]


def validate_record(record: ScheduleRecord) -> Tuple[bool, List[str]]:
    errors = []
    warnings = []

    if not record.member_name.strip():
        errors.append("会员姓名不能为空")
    elif len(record.member_name) > 50:
        errors.append("会员姓名长度不能超过50个字符")

    if not record.member_phone.strip():
        errors.append("会员电话不能为空")
    elif not PHONE_PATTERN.match(record.member_phone.strip()):
        errors.append(f"会员电话格式不正确: {record.member_phone}")

    if not record.coach_name.strip():
        errors.append("教练姓名不能为空")

    if not record.course_name.strip():
        errors.append("课程名称不能为空")

    if record.course_date == date.min:
        errors.append("课程日期不能为空或格式不正确")
    elif record.course_date < date.today():
        warnings.append("课程日期早于今天")

    if not record.course_time.strip():
        errors.append("课程时间不能为空")
    elif not TIME_PATTERN.match(record.course_time.strip()):
        errors.append(f"课程时间格式不正确，应为HH:MM: {record.course_time}")

    if record.duration_minutes <= 0:
        errors.append("课程时长必须大于0")
    elif record.duration_minutes > 300:
        errors.append("课程时长不能超过300分钟")

    has_error = len(errors) > 0
    record.errors = errors + warnings

    if has_error:
        record.status = RecordStatus.INVALID
    elif _needs_review(record):
        record.status = RecordStatus.REVIEW
    else:
        record.status = RecordStatus.VALID

    return not has_error, errors


def _needs_review(record: ScheduleRecord) -> bool:
    if record.duration_minutes > 120:
        return True
    if record.course_time:
        try:
            h, m = map(int, record.course_time.split(":"))
            if h < 7:
                return True
            if h >= 21:
                return True
        except ValueError:
            pass
    return False


def validate_batch(records: List[ScheduleRecord]) -> ValidationResult:
    result = ValidationResult(total_count=len(records))

    for record in records:
        is_valid, _ = validate_record(record)
        if record.status == RecordStatus.VALID:
            result.valid_count += 1
        elif record.status == RecordStatus.INVALID:
            result.invalid_count += 1
        elif record.status == RecordStatus.REVIEW:
            result.review_count += 1

    return result


def get_invalid_records(records: List[ScheduleRecord]) -> List[ScheduleRecord]:
    return [r for r in records if r.status == RecordStatus.INVALID]


def get_valid_records(records: List[ScheduleRecord]) -> List[ScheduleRecord]:
    return [r for r in records if r.status == RecordStatus.VALID]


def get_review_records(records: List[ScheduleRecord]) -> List[ScheduleRecord]:
    return [r for r in records if r.status == RecordStatus.REVIEW]
