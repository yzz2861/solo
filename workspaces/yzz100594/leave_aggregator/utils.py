import re
from datetime import date, datetime, timedelta
from typing import Optional, Tuple, List
from pypinyin import lazy_pinyin, Style

from .config import (
    LEAVE_TYPE_RULES,
    PERIOD_RULES,
    HALF_DAY_PATTERNS,
    SMS_DATE_PATTERNS,
    HOMONYM_THRESHOLD,
)
from .models import LeaveType


def parse_date(text: str, reference_date: Optional[date] = None) -> Optional[date]:
    if reference_date is None:
        reference_date = date.today()

    text = text.strip()

    for pattern in SMS_DATE_PATTERNS:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            if len(groups) == 3 and groups[0]:
                try:
                    return date(int(groups[0]), int(groups[1]), int(groups[2]))
                except (ValueError, TypeError):
                    pass
            elif len(groups) == 2 and groups[0]:
                try:
                    return date(reference_date.year, int(groups[0]), int(groups[1]))
                except (ValueError, TypeError):
                    pass
            elif "今天" in text or "今日" in text:
                return reference_date
            elif "明天" in text:
                return reference_date + timedelta(days=1)

    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%m-%d", "%m/%d", "%m.%d"]:
        try:
            parsed = datetime.strptime(text, fmt).date()
            if fmt in ["%m-%d", "%m/%d", "%m.%d"]:
                parsed = parsed.replace(year=reference_date.year)
            return parsed
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(text).date()
        return parsed
    except (ValueError, TypeError):
        pass

    return None


def classify_leave_type(reason: str) -> LeaveType:
    if not reason:
        return LeaveType.OTHER

    reason_lower = reason

    for leave_type, keywords in LEAVE_TYPE_RULES.items():
        for keyword in keywords:
            if keyword in reason_lower:
                if leave_type == "病假":
                    return LeaveType.SICK
                elif leave_type == "事假":
                    return LeaveType.PERSONAL
                elif leave_type == "公假":
                    return LeaveType.PUBLIC

    if "假" in reason_lower:
        if "病" in reason_lower:
            return LeaveType.SICK
        if "事" in reason_lower:
            return LeaveType.PERSONAL
        if "公" in reason_lower:
            return LeaveType.PUBLIC

    return LeaveType.OTHER


def parse_period(text: str) -> Tuple[str, Optional[bool]]:
    if not text:
        return "全天", None

    is_half_day = None
    for pattern in HALF_DAY_PATTERNS:
        if re.search(pattern, text):
            is_half_day = True
            break

    matched_period = "全天"
    for pattern, period_name in PERIOD_RULES:
        if re.search(pattern, text):
            matched_period = period_name
            break

    return matched_period, is_half_day


def get_name_pinyin(name: str) -> str:
    if not name:
        return ""
    return "".join(lazy_pinyin(name, style=Style.NORMAL))


def get_name_pinyin_initials(name: str) -> str:
    if not name:
        return ""
    return "".join(lazy_pinyin(name, style=Style.FIRST_LETTER))


def is_homonym(name1: str, name2: str) -> bool:
    if name1 == name2:
        return False
    pinyin1 = get_name_pinyin(name1)
    pinyin2 = get_name_pinyin(name2)
    if pinyin1 == pinyin2 and pinyin1:
        return True
    return False


def name_similarity(name1: str, name2: str) -> float:
    if name1 == name2:
        return 1.0
    pinyin1 = get_name_pinyin(name1)
    pinyin2 = get_name_pinyin(name2)
    if not pinyin1 or not pinyin2:
        return 0.0

    max_len = max(len(pinyin1), len(pinyin2))
    matches = 0
    min_len = min(len(pinyin1), len(pinyin2))
    for i in range(min_len):
        if pinyin1[i] == pinyin2[i]:
            matches += 1
    return matches / max_len if max_len > 0 else 0.0


def find_homonym_groups(names: List[str]) -> List[List[str]]:
    groups = []
    visited = set()

    for i, name1 in enumerate(names):
        if name1 in visited:
            continue
        group = [name1]
        visited.add(name1)
        for j in range(i + 1, len(names)):
            name2 = names[j]
            if name2 in visited:
                continue
            if is_homonym(name1, name2) or name_similarity(name1, name2) >= HOMONYM_THRESHOLD:
                group.append(name2)
                visited.add(name2)
        if len(group) > 1:
            groups.append(group)

    return groups


def extract_name(text: str) -> Optional[str]:
    text = text.strip()

    patterns = [
        r"(?:我家|我的|我们家|孩子叫?|小孩叫?|我儿子叫?|我女儿叫?)([\u4e00-\u9fa5]{2,4})(?:同学|小朋友)?",
        r"(?:学生|孩子|小朋友)(?:姓名)?[:：]\s*([\u4e00-\u9fa5]{2,4})",
        r"(?:^|[,，])姓名[:：]\s*([\u4e00-\u9fa5]{2,4})",
        r"(\d{1,2}月\d{1,2}[日号])[\s，,]*([\u4e00-\u9fa5]{2,4})(?:同学|小朋友)?[，,。\s]",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            name = match.group(match.lastindex)
            if _is_valid_name(name):
                return name

    date_pattern = r"\d{1,2}月\d{1,2}[日号]"
    date_match = re.search(date_pattern, text)
    if date_match:
        after_date = text[date_match.end():]
        name_match = re.search(r"([\u4e00-\u9fa5]{2,4})(?:同学|小朋友)", after_date)
        if name_match and _is_valid_name(name_match.group(1)):
            return name_match.group(1)
        name_match = re.search(r"([\u4e00-\u9fa5]{2,4})(?:今天|今日|明天|因|由于|参加|需要|请假)", after_date)
        if name_match and _is_valid_name(name_match.group(1)):
            return name_match.group(1)

    greeting_patterns = [
        r"^(?:王老师|李老师|张老师|刘老师|陈老师|杨老师|黄老师|周老师|吴老师|赵老师|班主任|老师您好?)[，,。]?\s*",
        r"^[您你]好[，,。]\s*",
    ]
    for gp in greeting_patterns:
        match = re.match(gp, text)
        if match:
            after_greeting = text[match.end():]
            date_match = re.search(date_pattern, after_greeting)
            if date_match:
                after_date = after_greeting[date_match.end():]
                name_match = re.search(r"([\u4e00-\u9fa5]{2,4})(?:同学|小朋友)", after_date)
                if name_match and _is_valid_name(name_match.group(1)):
                    return name_match.group(1)
                name_match = re.search(r"([\u4e00-\u9fa5]{2,4})(?:今天|今日|明天|因|由于|参加|需要|请假)", after_date)
                if name_match and _is_valid_name(name_match.group(1)):
                    return name_match.group(1)

            name_match = re.search(r"([\u4e00-\u9fa5]{2,4})(?:同学|小朋友)", after_greeting)
            if name_match and _is_valid_name(name_match.group(1)):
                return name_match.group(1)

    if re.match(r"^[\u4e00-\u9fa5]{2,4}[，,:：]", text):
        name_match = re.match(r"^([\u4e00-\u9fa5]{2,4})[，,:：]", text)
        if name_match:
            name = name_match.group(1)
            if _is_valid_name(name) and "请假" in text:
                return name

    return None


def _is_valid_name(name: str) -> bool:
    if not name or len(name) < 2 or len(name) > 4:
        return False

    stop_words = {
        "老师", "班主任", "今天", "明天", "昨天", "上午", "下午", "全天",
        "请假", "同学", "小朋友", "家长", "您好", "你好", "老师好",
        "家里", "家中", "学校", "医院", "看病", "就医", "住院",
        "参加", "因为", "由于", "需要", "所以", "但是", "然后",
        "今天上午", "今天下午", "明天上午", "明天下午",
        "我家", "我的", "我们家", "孩子", "小孩", "儿子", "女儿",
        "发烧", "感冒", "咳嗽", "头痛", "肚子痛", "胃痛", "牙痛",
        "呕吐", "腹泻", "过敏", "发炎", "扭伤", "骨折",
        "身体", "不舒服", "不适",
    }
    if name in stop_words:
        return False

    for w in stop_words:
        if name.startswith(w) or name.endswith(w):
            if len(name) == len(w) + 1 and name[-1] in "好的了":
                return False

    return True
