import re
import hashlib
import json
from datetime import datetime
from typing import Optional, Tuple

PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")


def normalize_name(name: Optional[str]) -> str:
    if not name:
        return ""
    result = str(name).strip()
    result = re.sub(r"\s+", "", result)
    result = re.sub(r"[\.·・]", "", result)
    return result


def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ""
    result = re.sub(r"\D", "", str(phone))
    if len(result) == 11 and result.startswith("86"):
        result = result[2:]
    if len(result) == 13 and result.startswith("0086"):
        result = result[4:]
    if len(result) == 12 and result.startswith("0"):
        result = result[1:]
    return result


def is_valid_phone(phone: Optional[str]) -> bool:
    if not phone:
        return False
    return bool(PHONE_PATTERN.match(normalize_phone(phone)))


def has_name_spaces(name: Optional[str]) -> bool:
    if not name:
        return False
    return bool(re.search(r"\s", str(name)))


def extract_id_last4(id_card: Optional[str]) -> str:
    if not id_card:
        return ""
    cleaned = re.sub(r"\s", "", str(id_card))
    if len(cleaned) >= 4:
        return cleaned[-4:]
    return ""


def extract_birth_year(id_card: Optional[str], birth_date: Optional[str] = None) -> Optional[int]:
    if birth_date:
        try:
            from dateutil import parser
            dt = parser.parse(str(birth_date))
            return dt.year
        except Exception:
            pass
    if id_card:
        cleaned = re.sub(r"\s", "", str(id_card))
        if len(cleaned) == 18 and cleaned[6:10].isdigit():
            year = int(cleaned[6:10])
            if 1900 < year <= datetime.now().year:
                return year
        if len(cleaned) == 15 and cleaned[6:8].isdigit():
            year = int("19" + cleaned[6:8])
            return year
    return None


def calculate_age(birth_year: Optional[int], reference_year: Optional[int] = None) -> Optional[int]:
    if not birth_year:
        return None
    if reference_year is None:
        reference_year = datetime.now().year
    return reference_year - birth_year


def compute_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def compute_data_hash(data: dict) -> str:
    normalized = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def parse_amount(value) -> Optional[float]:
    if value is None or (isinstance(value, float) and value != value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    s = re.sub(r"[¥￥$,\s]", "", s)
    s = re.sub(r"元.*", "", s)
    try:
        return float(s)
    except ValueError:
        return None


def split_name_phone(text: Optional[str]) -> Tuple[str, str]:
    if not text:
        return "", ""
    text = str(text).strip()
    phone_match = re.search(r"1[3-9]\d{9}", text)
    if phone_match:
        phone = phone_match.group()
        name = text.replace(phone, "").strip()
        return name, phone
    return text, ""


def safe_str(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value != value:
        return ""
    return str(value).strip()
