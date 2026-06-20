import re
from datetime import date, datetime, timedelta
from typing import Optional, Tuple
from dateutil import parser as dateutil_parser


RELATIVE_DATE_PATTERNS = [
    (re.compile(r"^(本|这|下|明|后)?周([一二三四五六日天])$"), "weekday"),
    (re.compile(r"^(今天|今日|明天|明日|后天|大后天|昨天|前天)$"), "relative_day"),
    (re.compile(r"^(\d+)\s*(天|日)(后|之后|以内)?$"), "days_later"),
    (re.compile(r"^(下周|本周|这周)(一|二|三|四|五|六|日|天)?$"), "week_relative"),
]

WEEKDAY_MAP = {
    "一": 0, "二": 1, "三": 2, "四": 3, "五": 4, "六": 5, "日": 6, "天": 6,
    "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6,
}

RELATIVE_DAY_MAP = {
    "今天": 0, "今日": 0,
    "明天": 1, "明日": 1,
    "后天": 2,
    "大后天": 3,
    "昨天": -1,
    "前天": -2,
}


def parse_relative_date(text: str, today: Optional[date] = None) -> Optional[date]:
    if not text:
        return None
    today = today or date.today()
    text = str(text).strip()

    for pattern, ptype in RELATIVE_DATE_PATTERNS:
        match = pattern.match(text)
        if not match:
            continue

        if ptype == "weekday":
            prefix, weekday_char = match.groups()
            target_weekday = WEEKDAY_MAP.get(weekday_char)
            if target_weekday is None:
                return None
            return _get_weekday_date(today, target_weekday, prefix)

        elif ptype == "relative_day":
            offset = RELATIVE_DAY_MAP.get(text, 0)
            return today + timedelta(days=offset)

        elif ptype == "days_later":
            days = int(match.group(1))
            suffix = match.group(3) or ""
            if "内" in suffix:
                return today + timedelta(days=days)
            return today + timedelta(days=days)

        elif ptype == "week_relative":
            week_prefix, weekday_char = match.groups()
            if weekday_char:
                target_weekday = WEEKDAY_MAP.get(weekday_char)
                if target_weekday is None:
                    return None
                week_offset = 0 if week_prefix in ("本周", "这周") else 1
                return _get_weekday_date(today, target_weekday, "下" if week_offset else "本")
            else:
                if week_prefix in ("本周", "这周"):
                    return today + timedelta(days=(4 - today.weekday()))
                else:
                    return today + timedelta(days=(7 - today.weekday() + 4))

    return None


def _get_weekday_date(today: date, target_weekday: int, prefix: Optional[str] = None) -> date:
    current_weekday = today.weekday()
    diff = target_weekday - current_weekday

    if prefix in ("下", "明", "后"):
        if diff <= 0:
            diff += 7
        else:
            diff += 7
    elif prefix in ("这", "本") or prefix is None:
        if diff < 0:
            diff += 7

    return today + timedelta(days=diff)


def parse_date(text: str) -> Optional[date]:
    if not text:
        return None
    text = str(text).strip()
    if not text:
        return None

    text = text.replace("年", "-").replace("月", "-").replace("日", "")
    text = text.replace(".", "-").replace("/", "-")
    text = re.sub(r"\s+", "", text)

    try:
        parsed = dateutil_parser.parse(text, fuzzy=True)
        if parsed.year < 2000:
            parsed = parsed.replace(year=parsed.year + 2000)
        return parsed.date()
    except (ValueError, TypeError, OverflowError):
        pass

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        pass
    try:
        return datetime.strptime(text, "%y-%m-%d").date()
    except ValueError:
        pass
    try:
        return datetime.strptime(text, "%m-%d").date().replace(year=date.today().year)
    except ValueError:
        pass

    return None


def format_date(d: Optional[date]) -> str:
    if d is None:
        return "-"
    weekday_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    weekday = weekday_names[d.weekday()]
    return f"{d.strftime('%Y-%m-%d')}({weekday})"


def days_between(from_date: date, to_date: date) -> int:
    return (to_date - from_date).days


def is_overdue(check_date: Optional[date], today: Optional[date] = None) -> Tuple[bool, int]:
    today = today or date.today()
    if check_date is None:
        return False, 0
    diff = days_between(today, check_date)
    return (diff < 0), abs(diff) if diff < 0 else 0


def is_due_soon(check_date: Optional[date], today: Optional[date] = None, window_days: int = 3) -> bool:
    today = today or date.today()
    if check_date is None:
        return False
    diff = days_between(today, check_date)
    return 0 <= diff <= window_days


def describe_date_relative(d: Optional[date], today: Optional[date] = None) -> str:
    today = today or date.today()
    if d is None:
        return "未指定"
    diff = days_between(today, d)
    if diff == 0:
        return "今天"
    elif diff == 1:
        return "明天"
    elif diff == -1:
        return "昨天"
    elif diff == 2:
        return "后天"
    elif diff == -2:
        return "前天"
    elif diff > 0:
        return f"还有{diff}天"
    else:
        return f"已过期{abs(diff)}天"


def get_this_friday(today: Optional[date] = None) -> date:
    today = today or date.today()
    return _get_weekday_date(today, 4, "本")


def get_next_friday(today: Optional[date] = None) -> date:
    today = today or date.today()
    return _get_weekday_date(today, 4, "下")
