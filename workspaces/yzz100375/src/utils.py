import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import re
import os


NOISE_STANDARD = {
    "day": 60,
    "night": 50,
    "late_night": 45,
}

TIME_PERIODS = {
    "evening": (18, 22),
    "night": (22, 0),
    "late_night": (0, 6),
    "morning": (6, 8),
}

ADDRESS_MAPPING = {
    "花园": "花园小区",
    "苑": "苑小区",
    "里": "里小区",
    "村": "村",
    "路": "路",
    "街": "街",
    "大道": "大道",
}

STREET_KEYWORDS = ["路", "街", "大道", "巷", "弄"]


def get_time_period(hour: int) -> str:
    if 18 <= hour < 22:
        return "晚间(18-22点)"
    elif 22 <= hour <= 23:
        return "夜间(22-24点)"
    elif 0 <= hour < 6:
        return "凌晨(0-6点)"
    elif 6 <= hour < 8:
        return "早间(6-8点)"
    else:
        return "日间"


def get_noise_standard(hour: int) -> int:
    if 22 <= hour or hour < 6:
        return NOISE_STANDARD["late_night"]
    elif 18 <= hour < 22:
        return NOISE_STANDARD["night"]
    else:
        return NOISE_STANDARD["day"]


def is_weekend(dt: datetime) -> bool:
    return dt.weekday() >= 5


def normalize_address(address: str) -> str:
    if pd.isna(address) or not isinstance(address, str):
        return ""
    addr = address.strip()
    addr = re.sub(r"[，,。\.]$", "", addr)
    addr = re.sub(r"\s+", "", addr)
    addr = re.sub(r"号.*$", "号", addr)
    addr = re.sub(r"弄.*$", "弄", addr)
    
    for keyword, replacement in ADDRESS_MAPPING.items():
        if keyword in addr and not addr.endswith(keyword):
            if any(street_kw in addr for street_kw in STREET_KEYWORDS):
                match = re.search(r"(.*?[路街巷大道弄]\d+[号弄]?)", addr)
                if match:
                    return match.group(1)
            else:
                match = re.search(rf"(.*?{keyword})", addr)
                if match:
                    return match.group(1)
    
    return addr


def extract_community(address: str) -> str:
    if pd.isna(address) or not isinstance(address, str):
        return "未识别"
    addr = address.strip()
    
    community_patterns = [
        r"(.+?花园)",
        r"(.+?苑)",
        r"(.+?里)",
        r"(.+?村)",
        r"(.+?小区)",
        r"(.+?公寓)",
        r"(.+?大厦)",
    ]
    
    for pattern in community_patterns:
        match = re.search(pattern, addr)
        if match:
            return match.group(1)
    
    street_match = re.search(r"(.+?[路街巷大道])", addr)
    if street_match:
        return street_match.group(1) + "沿线"
    
    return "未识别"


def extract_street(address: str) -> str:
    if pd.isna(address) or not isinstance(address, str):
        return "未识别"
    addr = address.strip()
    
    street_patterns = [
        r"(.+?路)",
        r"(.+?街)",
        r"(.+?大道)",
        r"(.+?巷)",
        r"(.+?弄)",
    ]
    
    for pattern in street_patterns:
        match = re.search(pattern, addr)
        if match:
            return match.group(1)
    
    return "未识别"


def handle_cross_midnight(start_dt: datetime, end_dt: datetime) -> List[Tuple[datetime, datetime]]:
    if start_dt.date() == end_dt.date():
        return [(start_dt, end_dt)]
    
    segments = []
    current = start_dt
    while current.date() < end_dt.date():
        day_end = datetime.combine(current.date(), datetime.max.time())
        segments.append((current, day_end))
        current = datetime.combine(current.date() + timedelta(days=1), datetime.min.time())
    segments.append((current, end_dt))
    
    return segments


def ensure_dir(path: str):
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)


def format_dt(dt: datetime) -> str:
    if pd.isna(dt):
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date(dt: datetime) -> str:
    if pd.isna(dt):
        return ""
    return dt.strftime("%Y-%m-%d")
