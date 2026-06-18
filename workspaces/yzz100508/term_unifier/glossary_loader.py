import csv
import json
from pathlib import Path
from typing import List, Union
from .models import TermEntry, TermStatus


def _parse_list(s: str, sep: str = ";") -> List[str]:
    if not s:
        return []
    return [p.strip() for p in s.split(sep) if p.strip()]


def _parse_dict(s: str, sep_kv: str = "=", sep_item: str = ";") -> dict:
    result = {}
    if not s:
        return result
    for item in s.split(sep_item):
        item = item.strip()
        if not item:
            continue
        if sep_kv in item:
            k, v = item.split(sep_kv, 1)
            result[k.strip()] = v.strip()
    return result


def _parse_bool(s: str, default: bool = False) -> bool:
    if s is None:
        return default
    s = str(s).strip().lower()
    return s in {"1", "true", "yes", "y", "on"}


def _parse_status(s: str) -> TermStatus:
    s = (s or "").strip().lower()
    if s in {"forbidden", "禁用", "禁止"}:
        return TermStatus.FORBIDDEN
    if s in {"needs_review", "review", "人工", "确认", "待确认"}:
        return TermStatus.NEEDS_REVIEW
    return TermStatus.STANDARD


def load_glossary(path: Union[str, Path]) -> List[TermEntry]:
    path = Path(path)
    suffix = path.suffix.lower()
    if suffix == ".json":
        return _load_glossary_json(path)
    elif suffix in {".csv", ".tsv", ".txt"}:
        delimiter = "\t" if suffix == ".tsv" else ","
        return _load_glossary_csv(path, delimiter=delimiter)
    raise ValueError(f"不支持的术语表格式: {suffix}（支持 .csv/.tsv/.json）")


def _load_glossary_csv(path: Path, delimiter: str = ",") -> List[TermEntry]:
    entries: List[TermEntry] = []
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        for row_num, row in enumerate(reader, start=2):
            if not row:
                continue
            source = (row.get("source") or row.get("原文") or row.get("原词") or "").strip()
            preferred = (row.get("preferred") or row.get("标准译名") or row.get("推荐译名") or "").strip()
            if not source or not preferred:
                continue
            entry = TermEntry(
                source=source,
                preferred=preferred,
                status=_parse_status(row.get("status") or row.get("状态")),
                alternatives=_parse_list(row.get("alternatives") or row.get("其他译名") or row.get("可接受译名") or ""),
                forbidden_variants=_parse_list(row.get("forbidden") or row.get("禁用译名") or row.get("禁止") or ""),
                context_hint=(row.get("context") or row.get("上下文") or "").strip() or None,
                chapter_exceptions=_parse_dict(row.get("exceptions") or row.get("章节例外") or row.get("例外") or ""),
                case_sensitive=_parse_bool(row.get("case_sensitive") or row.get("区分大小写"), default=False),
                match_plural=_parse_bool(row.get("match_plural") or row.get("匹配复数"), default=True),
                word_boundary=_parse_bool(row.get("word_boundary") or row.get("整词匹配"), default=True),
                priority=int((row.get("priority") or row.get("优先级") or "0").strip() or 0),
                notes=(row.get("notes") or row.get("备注") or row.get("说明") or "").strip() or None,
            )
            entries.append(entry)
    entries.sort(key=lambda e: (-e.priority, -len(e.source)))
    return entries


def _load_glossary_json(path: Path) -> List[TermEntry]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    entries: List[TermEntry] = []
    for item in data:
        if isinstance(item, dict):
            source = item.get("source", "").strip()
            preferred = item.get("preferred", "").strip()
            if not source or not preferred:
                continue
            entries.append(TermEntry(
                source=source,
                preferred=preferred,
                status=_parse_status(item.get("status")),
                alternatives=list(item.get("alternatives", []) or []),
                forbidden_variants=list(item.get("forbidden_variants", []) or []),
                context_hint=item.get("context_hint"),
                chapter_exceptions=dict(item.get("chapter_exceptions", {}) or {}),
                case_sensitive=bool(item.get("case_sensitive", False)),
                match_plural=bool(item.get("match_plural", True)),
                word_boundary=bool(item.get("word_boundary", True)),
                priority=int(item.get("priority", 0)),
                notes=item.get("notes"),
            ))
    entries.sort(key=lambda e: (-e.priority, -len(e.source)))
    return entries
