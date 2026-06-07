"""通用工具函数"""

import re
import json
from datetime import datetime, date
from typing import Any, Optional
import uuid


def generate_batch_id(prefix: str = "BATCH") -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_uuid = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{timestamp}-{short_uuid}"


def parse_date(value: Any) -> Optional[date]:
    if not value or str(value).strip() == "":
        return None

    value_str = str(value).strip()

    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y年%m月%d日",
        "%Y%m%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value_str, fmt).date()
        except ValueError:
            continue

    try:
        import pandas as pd
        ts = pd.to_datetime(value_str)
        if pd.notna(ts):
            return ts.date()
    except Exception:
        pass

    return None


def validate_id_card(id_card: str) -> tuple[bool, str]:
    if not id_card or not isinstance(id_card, str):
        return False, "身份证号为空"

    id_card = id_card.strip()

    if len(id_card) not in (15, 18):
        return False, f"身份证号长度不正确（{len(id_card)}位）"

    if len(id_card) == 18:
        pattern = r"^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$"
        if not re.match(pattern, id_card):
            return False, "身份证号格式不正确"

        weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
        check_codes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"]

        try:
            total = sum(int(id_card[i]) * weights[i] for i in range(17))
            check_code = check_codes[total % 11]
            if id_card[17].upper() != check_code:
                return False, "身份证号校验位不正确"
        except ValueError:
            return False, "身份证号包含非法字符"

    elif len(id_card) == 15:
        pattern = r"^[1-9]\d{5}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}$"
        if not re.match(pattern, id_card):
            return False, "15位身份证号格式不正确"

    return True, ""


def validate_phone(phone: str) -> tuple[bool, str]:
    if not phone or not isinstance(phone, str):
        return False, "联系电话为空"

    phone = phone.strip()
    pattern = r"^1[3-9]\d{9}$"
    if re.match(pattern, phone):
        return True, ""

    pattern2 = r"^0\d{2,3}-?\d{7,8}$"
    if re.match(pattern2, phone):
        return True, ""

    return False, "联系电话格式不正确"


def validate_name(name: str) -> tuple[bool, str]:
    if not name or not isinstance(name, str):
        return False, "姓名为空"

    name = name.strip()
    if len(name) < 2:
        return False, "姓名长度过短"

    if len(name) > 50:
        return False, "姓名长度过长"

    return True, ""


def safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
    return str(value).strip()


def load_json_file(filepath: str) -> Any:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json_file(filepath: str, data: Any) -> None:
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
