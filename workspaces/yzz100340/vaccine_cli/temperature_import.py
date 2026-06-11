import csv
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from .crud import insert_temperature_log, create_alert
from .config import TEMPERATURE_NORMAL_RANGE, SUPPORTED_LOG_EXTENSIONS
from .database import get_db_connection


DATE_PATTERNS = [
    r"%Y-%m-%d %H:%M:%S",
    r"%Y-%m-%d %H:%M",
    r"%Y/%m/%d %H:%M:%S",
    r"%Y/%m/%d %H:%M",
    r"%m/%d/%Y %H:%M:%S",
    r"%m/%d/%Y %H:%M",
    r"%d/%m/%Y %H:%M:%S",
    r"%d/%m/%Y %H:%M",
]


def parse_datetime(date_str: str) -> Optional[datetime]:
    date_str = date_str.strip().strip('"').strip("'")
    for pattern in DATE_PATTERNS:
        try:
            return datetime.strptime(date_str, pattern)
        except ValueError:
            continue
    return None


def parse_temperature(temp_str: str) -> Optional[float]:
    if temp_str is None:
        return None
    temp_str = str(temp_str).strip().strip('"').strip("'")
    if not temp_str or temp_str.lower() in ("null", "none", "missing", "na", "n/a", "-"):
        return None
    try:
        return float(temp_str)
    except ValueError:
        return None


def detect_columns(header: List[str]) -> Tuple[int, int]:
    time_col = -1
    temp_col = -1

    time_keywords = ["time", "date", "timestamp", "datetime", "记录时间", "时间"]
    temp_keywords = ["temp", "temperature", "温度", "气温"]

    for i, col in enumerate(header):
        col_lower = col.lower().strip()
        if time_col == -1 and any(kw in col_lower for kw in time_keywords):
            time_col = i
        if temp_col == -1 and any(kw in col_lower for kw in temp_keywords):
            temp_col = i

    if time_col == -1 and len(header) >= 1:
        time_col = 0
    if temp_col == -1 and len(header) >= 2:
        temp_col = 1

    return time_col, temp_col


def parse_line(line: str) -> Tuple[Optional[str], Optional[float], bool]:
    line = line.strip()
    if not line or line.startswith("#"):
        return None, None, False

    temp_str = None

    match = re.match(r'^(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s+(.+)$', line)
    if match:
        time_str = match.group(1)
        temp_str = match.group(2).strip()
    else:
        parts = re.split(r'[,;\t|]+', line, maxsplit=1)
        if len(parts) < 1:
            return None, None, False
        time_str = parts[0]
        temp_str = parts[1] if len(parts) > 1 else None

    dt = parse_datetime(time_str)
    temp = parse_temperature(temp_str) if temp_str else None

    if dt is None:
        return None, None, False

    return dt.strftime("%Y-%m-%d %H:%M:%S"), temp, temp is None


def import_temperature_log(
    file_path: str,
    db_path: Optional[Path] = None
) -> Dict[str, Any]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if path.suffix.lower() not in SUPPORTED_LOG_EXTENSIONS:
        raise ValueError(f"Unsupported file type. Supported: {', '.join(SUPPORTED_LOG_EXTENSIONS)}")

    imported = 0
    skipped = 0
    errors: List[str] = []
    abnormal_count = 0
    missing_count = 0

    min_temp, max_temp = TEMPERATURE_NORMAL_RANGE

    if path.suffix.lower() == ".csv":
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if header:
                time_col, temp_col = detect_columns(header)
            else:
                time_col, temp_col = 0, 1

            for row_num, row in enumerate(reader, start=2):
                if not row or len(row) <= max(time_col, temp_col):
                    skipped += 1
                    continue

                time_str = row[time_col] if time_col < len(row) else ""
                temp_str = row[temp_col] if temp_col < len(row) else ""

                dt = parse_datetime(time_str)
                temp = parse_temperature(temp_str)

                if dt is None:
                    errors.append(f"Line {row_num}: Cannot parse date '{time_str}'")
                    skipped += 1
                    continue

                record_time = dt.strftime("%Y-%m-%d %H:%M:%S")
                is_missing = temp is None

                try:
                    insert_temperature_log(
                        record_time=record_time,
                        temperature=temp,
                        is_missing=is_missing,
                        db_path=db_path
                    )
                    imported += 1

                    if is_missing:
                        missing_count += 1
                    elif temp < min_temp or temp > max_temp:
                        abnormal_count += 1
                except Exception as e:
                    if "UNIQUE constraint failed" in str(e):
                        errors.append(f"Line {row_num}: Duplicate entry for {record_time} (skipped)")
                    else:
                        errors.append(f"Line {row_num}: {str(e)}")
                    skipped += 1
    else:
        with open(path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, start=1):
                record_time, temp, is_missing = parse_line(line)
                if record_time is None:
                    if line.strip() and not line.startswith("#"):
                        errors.append(f"Line {line_num}: Cannot parse line")
                        skipped += 1
                    continue

                try:
                    insert_temperature_log(
                        record_time=record_time,
                        temperature=temp,
                        is_missing=is_missing,
                        db_path=db_path
                    )
                    imported += 1

                    if is_missing:
                        missing_count += 1
                    elif temp < min_temp or temp > max_temp:
                        abnormal_count += 1
                except Exception as e:
                    if "UNIQUE constraint failed" in str(e):
                        errors.append(f"Line {line_num}: Duplicate entry for {record_time} (skipped)")
                    else:
                        errors.append(f"Line {line_num}: {str(e)}")
                    skipped += 1

    if missing_count > 0:
        create_alert(
            alert_type="temperature_missing",
            severity="warning",
            message=f"导入温度日志时发现 {missing_count} 条缺失记录",
            db_path=db_path
        )

    if abnormal_count > 0:
        create_alert(
            alert_type="temperature_abnormal",
            severity="high",
            message=f"导入温度日志时发现 {abnormal_count} 条超温记录（正常范围 {min_temp}-{max_temp}°C）",
            db_path=db_path
        )

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "abnormal_count": abnormal_count,
        "missing_count": missing_count,
    }
