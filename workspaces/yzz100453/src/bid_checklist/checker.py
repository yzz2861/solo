"""综合检查器：证照过期、PDF页数、盖章页、授权人姓名一致性等."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from .matcher import (
    AttachmentCheckResult,
    apply_status_based_on_issues,
)
from .models import AttachmentItem, BidChecklistConfig
from .scanner import ScannedFile


DATE_PATTERNS_PRIORITY = [
    (re.compile(r"有效期\s*(?:至|到|截止)\s*[:：]?\s*(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?"), "ymd", 4),
    (re.compile(r"营业期限\s*[:：]?\s*[^\n]*?至\s*(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?"), "ymd", 4),
    (re.compile(r"营业期限\s*[:：]?\s*(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?\s*[起至\-~—]+\s*(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?"), "ymd_end", 5),
    (re.compile(r"至\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日"), "ymd", 3),
    (re.compile(r"有效期\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日"), "ymd", 3),
    (re.compile(r"(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?"), "ymd", 1),
    (re.compile(r"(\d{4})(\d{2})(\d{2})"), "ymd", 0),
]


def _extract_date_from_text(text: str, prefer_later: bool = True) -> Optional[date]:
    """从文本中提取日期，优先选择带"有效期/至/到期"的日期."""
    if not text:
        return None
    candidates = []
    for pat, kind, priority in DATE_PATTERNS_PRIORITY:
        for m in pat.finditer(text):
            try:
                groups = m.groups()
                if kind == "ymd_end" and len(groups) >= 6:
                    d = date(int(groups[-3]), int(groups[-2]), int(groups[-1]))
                    candidates.append((priority, m.start(), d))
                elif kind == "ymd" and len(groups) >= 3:
                    d = date(int(groups[-3]), int(groups[-2]), int(groups[-1]))
                    candidates.append((priority, m.start(), d))
            except (ValueError, TypeError):
                continue
    if not candidates:
        return None
    if prefer_later:
        candidates.sort(key=lambda x: (x[0], -(x[2].toordinal())))
    else:
        candidates.sort(key=lambda x: (x[0], x[2].toordinal()), reverse=True)
    return candidates[0][2]


def _extract_date_from_filename(sf: ScannedFile) -> Optional[date]:
    """从文件名中提取日期."""
    dates = sf.extract_possible_dates()
    for d in dates:
        parts = d.split("-")
        try:
            if len(parts) == 3:
                return date(int(parts[0]), int(parts[1]), int(parts[2]))
            if len(parts) == 2:
                return date(int(parts[0]), int(parts[1]), 28)
        except (ValueError, IndexError):
            continue
    return None


def check_expiry(
    results: List[AttachmentCheckResult],
    today: Optional[date] = None,
    warn_days: int = 60,
):
    """检查证照是否过期或即将过期."""
    if today is None:
        today = date.today()

    for r in results:
        if not r.matched_file or not r.item.has_date_constraint():
            continue
        item: AttachmentItem = r.item
        expected = item.expire_date
        if not expected:
            continue

        file_date = None
        sf = r.matched_file
        if sf.pdf_text_cache:
            file_date = _extract_date_from_text(sf.pdf_text_cache)
        if not file_date:
            file_date = _extract_date_from_filename(sf)

        if file_date and file_date < expected:
            r.add_issue(f"文件内日期({file_date})早于配置的有效期至({expected})，疑似已过期版本")
            continue

        delta = (expected - today).days
        if delta < 0:
            r.add_issue(f"证照已过期 {abs(delta)} 天（有效期至 {expected}）")
        elif delta <= warn_days:
            r.add_warning(f"证照即将过期，剩余 {delta} 天（有效期至 {expected}）")


def _check_page_range(actual: int, spec: str) -> Optional[str]:
    """检查页数是否在范围内，返回问题描述."""
    if not spec:
        return None
    spec = spec.strip()
    m = re.match(r"(\d+)\s*-\s*(\d+)", spec)
    if m:
        lo, hi = int(m[1]), int(m[2])
        if actual < lo:
            return f"页数不足：实际 {actual} 页，最少需要 {lo} 页"
        if actual > hi:
            return f"页数超出：实际 {actual} 页，上限 {hi} 页"
        return None
    m = re.match(r"\+\s*(\d+)", spec)
    if m:
        minimum = int(m[1])
        if actual < minimum:
            return f"页数不足：实际 {actual} 页，最少需要 {minimum} 页"
        return None
    m = re.match(r"(\d+)\s*\+", spec)
    if m:
        minimum = int(m[1])
        if actual < minimum:
            return f"页数不足：实际 {actual} 页，最少需要 {minimum} 页"
        return None
    return None


def check_pdf_pages(results: List[AttachmentCheckResult]):
    """检查PDF页数是否符合要求."""
    for r in results:
        if not r.matched_file or not r.item.has_page_constraint():
            continue
        sf = r.matched_file
        if not sf.is_pdf:
            r.add_warning("非PDF文件，无法校验页数")
            continue
        actual = sf.page_count
        if actual is None:
            r.add_warning("PDF解析失败，无法校验页数")
            continue

        item = r.item
        if item.expected_pages is not None:
            if actual != item.expected_pages:
                r.add_issue(
                    f"页数异常：实际 {actual} 页，应为 {item.expected_pages} 页"
                )
        if item.page_range:
            prob = _check_page_range(actual, item.page_range)
            if prob:
                r.add_issue(prob)


def _detect_stamp_in_pdf(sf: ScannedFile, keywords: List[str]) -> Dict:
    """检测PDF中是否存在盖章页关键词."""
    result = {
        "found": False,
        "last_page_checked": False,
        "found_keywords": [],
        "total_pages_checked": 0,
    }
    if not sf.is_pdf:
        return result
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(sf.path))
        total = len(reader.pages)
        if total == 0:
            return result

        expanded_keywords = set(keywords)
        for kw in list(keywords):
            if "公章" in kw:
                expanded_keywords.add("公章")
                expanded_keywords.add("公司盖章")
            if "盖章" in kw:
                expanded_keywords.add("盖章")
                expanded_keywords.add("盖章处")
            if "签章" in kw:
                expanded_keywords.add("签章")
            if "公司章" in kw:
                expanded_keywords.add("公司章")
        extra = ["盖公章", "章", "印鉴", "印章", "（公章）", "【公章】", "(公章)", "盖章有效"]
        for e in extra:
            expanded_keywords.add(e)

        check_indices = list(range(min(3, total))) + list(range(max(0, total - 3), total))
        check_indices = sorted(set(check_indices))

        for idx in check_indices:
            try:
                page = reader.pages[idx]
                text = page.extract_text() or ""
                text_normalized = text.replace(" ", "").replace("\n", "")
                for kw in expanded_keywords:
                    if len(kw) >= 2 and kw in text:
                        result["found"] = True
                        result["found_keywords"].append(f"P{idx+1}:{kw}")
                    elif len(kw) >= 2 and kw in text_normalized:
                        result["found"] = True
                        result["found_keywords"].append(f"P{idx+1}:'{kw}'")
                if idx == total - 1:
                    result["last_page_checked"] = True
            except Exception:
                continue

        result["total_pages_checked"] = len(check_indices)

        if not result["found"] and sf.pdf_text_cache:
            text = sf.pdf_text_cache
            text_normalized = text.replace(" ", "").replace("\n", "")
            for kw in expanded_keywords:
                if len(kw) >= 2 and (kw in text or kw in text_normalized):
                    result["found"] = True
                    result["found_keywords"].append(f"cache:{kw}")
                    break
    except Exception:
        pass
    return result


def check_stamps(results: List[AttachmentCheckResult]):
    """检查盖章页是否齐全."""
    for r in results:
        if not r.matched_file or not r.item.require_stamp:
            continue
        sf = r.matched_file
        if not sf.is_pdf:
            r.add_warning("非PDF文件，无法自动校验盖章，请人工确认")
            continue
        stamp_result = _detect_stamp_in_pdf(sf, r.item.stamp_keywords)
        if not stamp_result["found"]:
            r.add_issue(
                f"未检测到盖章关键字（{', '.join(r.item.stamp_keywords)}），"
                f"请确认是否已在第1/2/末页盖章"
            )
        elif stamp_result["found_keywords"]:
            r.add_warning(f"检测到盖章位置：{', '.join(stamp_result['found_keywords'])}")


def check_authorized_person(results: List[AttachmentCheckResult]):
    """检查授权人姓名是否一致."""
    for r in results:
        if not r.matched_file or not r.item.authorized_person:
            continue
        expected = r.item.authorized_person.strip()
        if not expected:
            continue

        sf = r.matched_file
        found = False
        alt_names = []
        if sf.pdf_text_cache:
            found = expected in sf.pdf_text_cache
            chinese_chars = re.findall(r"[\u4e00-\u9fa5]{2,4}(?:先生|女士)?", sf.pdf_text_cache)
            seen = set()
            for name in chinese_chars:
                name = name.replace("先生", "").replace("女士", "")
                if name not in seen:
                    seen.add(name)
                    alt_names.append(name)
        else:
            if expected in sf.name or expected in sf.stem:
                found = True

        if not found:
            hint = ""
            if alt_names:
                others = [n for n in alt_names[:5] if n != expected]
                if others:
                    hint = f"（文件中疑似姓名：{', '.join(others)}）"
            r.add_issue(f"授权人姓名不一致：清单要求「{expected}」，文件中未匹配到{hint}")


def run_all_checks(
    results: List[AttachmentCheckResult],
    config: BidChecklistConfig,
):
    """运行所有检查."""
    today = config.bid_deadline or date.today()
    check_expiry(results, today=today)
    check_pdf_pages(results)
    check_stamps(results)
    check_authorized_person(results)
    apply_status_based_on_issues(results)
