import os
import uuid
from datetime import datetime
from pathlib import Path
import csv


def generate_batch_id(prefix: str = "PLT") -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    short_uuid = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{timestamp}-{short_uuid}"


def ensure_dir(path: str) -> str:
    Path(path).mkdir(parents=True, exist_ok=True)
    return path


def safe_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name)


def detect_delimiter(sample: str) -> str:
    candidates = [",", ";", "\t", "|"]
    best = ","
    best_count = 0
    for c in candidates:
        count = sample.count(c)
        if count > best_count:
            best_count = count
            best = c
    return best


def read_csv_sample(filepath: str, sample_size: int = 3) -> str:
    lines = []
    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        for i, line in enumerate(f):
            if i >= sample_size:
                break
            lines.append(line)
    return "\n".join(lines)
