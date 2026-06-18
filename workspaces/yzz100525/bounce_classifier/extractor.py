"""退信信息抽取。

从 RawBounce 中抽取：收件人、退信时间、原活动/主题、错误码、错误原文等。
"""
from __future__ import annotations

import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import List, Optional, Tuple

from .config import CAMPAIGN_HINT_PATTERNS, FORWARD_FAILURE_HINTS, REASON_CODE_MAP
from .models import RawBounce


EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}",
)
RCPT_FIELD_RE = re.compile(
    r"(Final-Recipient|Original-Recipient|X-Actual-Recipient|X-Failed-Recipients|X-Original-To|Delivered-To|To)\s*:\s*(?:rfc822;\s*)?([^\n\r;]+)",
    re.IGNORECASE,
)
BOUNCE_RCPT_RE = re.compile(
    r"(收件人地址|收件地址|失败地址|退回地址|退信地址|目标地址|电子邮件地址|对方邮箱|对方地址|邮箱地址|收信地址|收件人|收件方|收信人)[:：]\s*<?([^<>\s,;\r\n]+@[^\s,;\r\n>]+)>?",
    re.IGNORECASE,
)
STATUS_CODE_RE = re.compile(r"(?<!\d)([45]\.\d{1,3}\.\d{1,3})(?!\d)")
SMTP_CODE_RE = re.compile(r"\b(25[0-7]|4[0-4]\d|5[0-5]\d)\b")
DIAGNOSTIC_RE = re.compile(
    r"Diagnostic-Code\s*:\s*([^\n\r]+(?:\n[ \t][^\n\r]+)*)",
    re.IGNORECASE | re.MULTILINE,
)
REASON_CN_RE = re.compile(
    r"(?:退信原因|退信说明|失败原因|错误原因|退回原因)[:：]\s*([^\n\r；。]{3,200})",
    re.IGNORECASE,
)
DATE_HEADERS = ("Date", "Delivery-date", "Arrival-Date", "Received")
ORIG_SUBJ_RE = re.compile(
    r"----+\s*Original\s+Message\s*----+.*?Subject\s*:\s*([^\n\r]{2,200}?(?:\n\s+[^\n\r]{1,200}?)*)",
    re.IGNORECASE | re.DOTALL,
)
ORIG_FROM_RE = re.compile(
    r"----+\s*Original\s+Message\s*----+.*?From\s*:\s*([^\n\r]{2,200})",
    re.IGNORECASE | re.DOTALL,
)
SUBJECT_CAMPAIGN_TAG = re.compile(r"[【\[]([^】\]]{2,50})[】\]]")
SUBJECT_RETURN = re.compile(r"Subject\s*:\s*([^\n\r]{2,200})", re.IGNORECASE)
MAILER_DAEMON_HINT = re.compile(
    r"(mailer[- ]?daemon|postmaster|邮(?:件|箱|递).{0,5}系统|退信|系统退信|undeliver(?:ed|able)|delivery\s+(fail|error|notif))",
    re.IGNORECASE,
)
FORWARD_HINT = re.compile(
    "|".join(re.escape(h) for h in FORWARD_FAILURE_HINTS),
    re.IGNORECASE,
)


def _extract_sender_emails(raw: RawBounce) -> set:
    senders = set()
    for header in ("From", "Return-Path", "Reply-To", "Sender"):
        val = raw.headers.get(header, "")
        for em in EMAIL_RE.findall(val):
            senders.add(em.strip("<>\"'").lower())
    orig_from_match = ORIG_FROM_RE.search(raw.body or "")
    if orig_from_match:
        for em in EMAIL_RE.findall(orig_from_match.group(1)):
            senders.add(em.strip("<>\"'").lower())
    return senders


def _strip_original_section(text: str) -> str:
    idx = re.search(
        r"(?:^|\n)-{2,}\s*(?:Original\s+Message|Original)\s*-{2,}",
        text,
        flags=re.IGNORECASE,
    )
    if idx:
        return text[: idx.start()]
    idx2 = re.search(
        r"\n\s*转发失败|转发目标|forward.{0,10}to\s*<?\S+@\S+",
        text,
        flags=re.IGNORECASE,
    )
    if idx2 and idx2.start() > 200:
        return text[: idx2.start()]
    return text


def extract_recipients(raw: RawBounce) -> List[str]:
    found: List[str] = []
    seen = set()
    sender_emails = _extract_sender_emails(raw)

    headers = raw.headers or {}
    for key in ("X-Failed-Recipients", "X-Actual-Recipient", "Final-Recipient",
                "Original-Recipient", "X-Original-To", "Delivered-To"):
        value = headers.get(key, "")
        if not value:
            continue
        m = EMAIL_RE.findall(value)
        for em in m:
            em = em.strip("<>\"'").lower()
            if em in sender_emails:
                continue
            if em in seen:
                continue
            seen.add(em)
            found.append(em)

    combined = raw.raw_text or f"{raw.subject}\n{raw.body}"
    for match in RCPT_FIELD_RE.finditer(combined):
        key_name = (match.group(1) or "").lower()
        if key_name == "to":
            continue
        raw_addr = match.group(2) or ""
        m2 = EMAIL_RE.search(raw_addr)
        if m2:
            em = m2.group(0).strip("<>\"'").lower()
            if em in sender_emails or em in seen:
                continue
            seen.add(em)
            found.append(em)

    for match in BOUNCE_RCPT_RE.finditer(raw.body + "\n" + raw.subject):
        raw_addr = match.group(2) or ""
        m2 = EMAIL_RE.search(raw_addr)
        if m2:
            em = m2.group(0).strip("<>\"'").lower()
            if em in sender_emails or em in seen:
                continue
            seen.add(em)
            found.append(em)

    if not found:
        scan_body = _strip_original_section(raw.body or "")
        candidates = EMAIL_RE.findall(scan_body)
        for em in candidates:
            em = em.strip("<>\"'").lower()
            if em in sender_emails:
                continue
            if em.endswith(("example.com", "localhost")):
                continue
            if em in seen:
                continue
            if MAILER_DAEMON_HINT.search(em):
                continue
            if len(found) >= 5:
                break
            seen.add(em)
            found.append(em)

    return found


def extract_bounce_time(raw: RawBounce) -> Optional[datetime]:
    for key in DATE_HEADERS:
        val = raw.headers.get(key, "")
        if not val:
            continue
        try:
            dt = parsedate_to_datetime(val)
            if dt:
                return dt
        except (TypeError, ValueError):
            pass

    combined = raw.raw_text or ""
    date_match = re.search(
        r"(Date|Delivery-date|Arrival-Date)\s*:\s*([^\n\r]+)",
        combined,
        re.IGNORECASE,
    )
    if date_match:
        try:
            dt = parsedate_to_datetime(date_match.group(2))
            if dt:
                return dt
        except (TypeError, ValueError):
            pass

    cn_match = re.search(
        r"(退信时间|发送时间|投递时间|收到时间)[:：]\s*([0-9]{4}[-/年][0-9]{1,2}[-/月][0-9]{1,2}[日 T][0-9: ]{3,8})",
        raw.body,
        re.IGNORECASE,
    )
    if cn_match:
        raw_str = re.sub(r"[年月]", "-", re.sub(r"[日T]", " ", cn_match.group(2))).strip()
        try:
            return datetime.strptime(raw_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                return datetime.strptime(raw_str.split()[0], "%Y-%m-%d")
            except ValueError:
                pass

    return None


def extract_reason(raw: RawBounce) -> Tuple[str, str]:
    combined = f"{raw.subject}\n{raw.body}\n{raw.raw_text}"

    status_codes = STATUS_CODE_RE.findall(combined)
    smtp_codes = SMTP_CODE_RE.findall(combined)
    diagnostics = [m.group(1).strip() for m in DIAGNOSTIC_RE.finditer(combined)]

    reason_text_parts: List[str] = []

    cn_match = REASON_CN_RE.search(raw.body)
    if cn_match:
        for g in cn_match.groups():
            if g:
                reason_text_parts.append(g.strip(" ；。\t"))

    if diagnostics:
        reason_text_parts.extend(d.replace("\n", " ").strip() for d in diagnostics[:3])

    if not reason_text_parts:
        subject = raw.subject or ""
        if "退信" in subject or "returned" in subject.lower() or "undeliver" in subject.lower():
            reason_text_parts.append(subject)

    reason_text = "；".join(p.strip() for p in reason_text_parts if p.strip())[:500]

    code_label = ""
    if status_codes:
        primary = status_codes[0]
        code_label = primary
        if primary in REASON_CODE_MAP:
            prefix = f"{REASON_CODE_MAP[primary]}（{primary}）"
            reason_text = f"{prefix}；{reason_text}" if reason_text else prefix
        for extra in status_codes[1:3]:
            if extra not in code_label:
                code_label = f"{code_label};{extra}"
    elif smtp_codes:
        code_label = ",".join(smtp_codes[:3])

    return code_label, reason_text


def extract_original_campaign(raw: RawBounce) -> Tuple[str, str, str]:
    combined = f"{raw.body}\n{raw.raw_text}"
    campaign = ""
    original_subject = ""
    original_sender = ""

    orig_match = ORIG_SUBJ_RE.search(combined)
    if orig_match:
        original_subject = re.sub(r"\n\s+", " ", orig_match.group(1)).strip()[:200]

    orig_from = ORIG_FROM_RE.search(combined)
    if orig_from:
        original_sender = orig_from.group(1).strip()[:200]

    campaign_src = original_subject if original_subject else (raw.subject or "")

    for pattern in CAMPAIGN_HINT_PATTERNS:
        m = pattern.search(combined + "\nSubject: " + (campaign_src or ""))
        if m:
            groups = [g for g in m.groups() if g]
            if groups:
                campaign = groups[-1].strip()
            if len(campaign) > 3:
                break

    if not campaign:
        tag = SUBJECT_CAMPAIGN_TAG.search(campaign_src or "")
        if tag:
            campaign = tag.group(1).strip()

    if not original_subject:
        header_subject_match = SUBJECT_RETURN.search(combined)
        if header_subject_match:
            candidate = header_subject_match.group(1).strip()[:200]
            if not MAILER_DAEMON_HINT.search(candidate):
                original_subject = candidate

    return campaign[:100], original_subject, original_sender


def detect_forward_failure(raw: RawBounce) -> bool:
    combined = f"{raw.subject}\n{raw.body}\n{raw.raw_text}"
    if not FORWARD_HINT.search(combined):
        return False
    if re.search(r"(forward|转发).{0,30}(fail|失败|error|错误|unable|无法|bounce|退回)", combined, re.IGNORECASE):
        return True
    return False


def extract_all(raw: RawBounce) -> dict:
    reason_code, reason_text = extract_reason(raw)
    campaign, original_subject, original_sender = extract_original_campaign(raw)
    return {
        "recipients": extract_recipients(raw),
        "bounce_time": extract_bounce_time(raw),
        "reason_code": reason_code,
        "reason_text": reason_text,
        "campaign": campaign,
        "original_subject": original_subject,
        "original_sender": original_sender,
        "is_forward_failure": detect_forward_failure(raw),
    }
