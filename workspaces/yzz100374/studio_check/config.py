from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

DEFAULT_CONFIG = {
    "dirs": {
        "retouched": "精修",
        "original": "原片",
    },
    "files": {
        "auth_letter": r"授权书",
        "selection_sheet": r"挑片表",
        "delivery_note": r"交付说明",
        "signature_page": r"签名|签字|签署|签章",
    },
    "photo_extensions": {
        "retouched": [".jpg", ".jpeg", ".png", ".tiff", ".tif"],
        "original": [".cr3", ".nef", ".arw", ".raw", ".dng", ".orf", ".raf", ".srw"],
    },
    "doc_extensions": [".pdf", ".xlsx", ".xls", ".doc", ".docx", ".txt", ".csv", ".jpg", ".jpeg", ".png"],
    "metadata_dir": ".studio-check",
}

RETOUCHED_VERSION_RE = re.compile(r"^(.+?)[_\- ]*v(\d+)$", re.IGNORECASE)

PHOTO_ID_RE = re.compile(r"^([A-Za-z]*\d+)")


def extract_photo_id(stem: str) -> str:
    m = PHOTO_ID_RE.match(stem)
    if m:
        return m.group(1)
    cleaned = re.sub(r"[_\- ]*(精修|修图|已修|最终|final|retouch|edit)", "", stem, flags=re.IGNORECASE)
    m2 = PHOTO_ID_RE.match(cleaned)
    if m2:
        return m2.group(1)
    return stem


def extract_version(stem: str) -> Optional[int]:
    m = RETOUCHED_VERSION_RE.match(stem)
    if m:
        return int(m.group(2))
    return None


def match_filename(filename: str, pattern: str) -> bool:
    return bool(re.search(pattern, filename, re.IGNORECASE))


def get_config(config_path: Optional[Path] = None) -> dict:
    if config_path and config_path.exists():
        import json

        with open(config_path, "r", encoding="utf-8") as f:
            user_cfg = json.load(f)
        merged = _deep_merge(DEFAULT_CONFIG.copy(), user_cfg)
        return merged
    return DEFAULT_CONFIG.copy()


def _deep_merge(base: dict, override: dict) -> dict:
    for k, v in override.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            base[k] = _deep_merge(base[k], v)
        else:
            base[k] = v
    return base
