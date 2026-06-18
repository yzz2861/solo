"""邮件文件解析。

支持：
- .eml 单封邮件（MIME / RFC822）
- .mbox 邮箱文件（多封邮件，用 From 行分隔）
- .txt/.log 纯文本退信
"""
from __future__ import annotations

import email
import mailbox
import os
import re
from datetime import datetime
from email import policy
from email.message import Message
from pathlib import Path
from typing import Iterator, List, Optional, Tuple

from .models import RawBounce


TEXT_EXTENSIONS = {".txt", ".log", ".text"}
EML_EXTENSIONS = {".eml", ".msg"}
MBOX_EXTENSIONS = {".mbox", ".mbx"}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | EML_EXTENSIONS | MBOX_EXTENSIONS


def _decode_payload(msg: Message) -> str:
    body_parts: List[str] = []
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if (
                content_type in ("text/plain", "message/rfc822", "message/delivery-status")
                or "attachment" not in disposition.lower()
                and content_type.startswith("text/")
            ):
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        body_parts.append(payload.decode(charset, errors="replace"))
                    except (LookupError, UnicodeDecodeError):
                        body_parts.append(payload.decode("utf-8", errors="replace"))
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            try:
                body_parts.append(payload.decode(charset, errors="replace"))
            except (LookupError, UnicodeDecodeError):
                body_parts.append(payload.decode("utf-8", errors="replace"))
    return "\n".join(part for part in body_parts if part)


def _extract_headers(msg: Message) -> dict:
    headers = {}
    for key in (
        "Subject",
        "From",
        "To",
        "Date",
        "Message-ID",
        "Return-Path",
        "Delivered-To",
        "X-Failed-Recipients",
        "X-Actual-Recipient",
        "X-Original-To",
        "Original-Recipient",
        "Final-Recipient",
        "Diagnostic-Code",
        "Status",
        "Remote-Mta",
        "X-Campaign-Id",
        "X-Mailing-List",
        "List-Id",
        "Reply-To",
    ):
        value = msg.get(key)
        if value:
            headers[key] = str(value)
    return headers


def _parse_eml_file(path: Path) -> RawBounce:
    with path.open("rb") as fh:
        msg = email.message_from_binary_file(fh, policy=policy.compat32)
    body = _decode_payload(msg)
    headers = _extract_headers(msg)
    subject = headers.get("Subject", "")
    raw_lines: List[str] = []
    for header_name, header_value in msg.items():
        raw_lines.append(f"{header_name}: {header_value}")
    raw_lines.append("")
    raw_lines.append(body)
    return RawBounce(
        source_file=str(path),
        subject=subject,
        body=body,
        headers=headers,
        raw_text="\n".join(raw_lines),
    )


def _parse_mbox_file(path: Path) -> Iterator[RawBounce]:
    mbox = mailbox.mbox(str(path))
    try:
        for i, msg in enumerate(mbox):
            body = _decode_payload(msg)
            headers = _extract_headers(msg)
            subject = headers.get("Subject", "")
            yield RawBounce(
                source_file=f"{path}#{i}",
                subject=subject,
                body=body,
                headers=headers,
                raw_text=body,
            )
    finally:
        mbox.close()


_SECTION_SPLIT_RE = re.compile(r"\n\s*\n")
_MBOX_FROM_RE = re.compile(r"^From\s+\S+\s+.*\d{4}", re.IGNORECASE)


def _parse_text_file(path: Path) -> Iterator[RawBounce]:
    text = path.read_text(encoding="utf-8", errors="replace")
    current_lines: List[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if _MBOX_FROM_RE.match(line) and current_lines:
            yield _make_text_bounce(path, "\n".join(current_lines))
            current_lines = [line]
        else:
            current_lines.append(line)
    if current_lines:
        yield _make_text_bounce(path, "\n".join(current_lines))


def _make_text_bounce(path: Path, content: str) -> RawBounce:
    header_area, _, body = content.partition("\n\n")
    headers: dict = {}
    subject = ""
    for raw_header in header_area.splitlines():
        if ":" in raw_header:
            k, _, v = raw_header.partition(":")
            k = k.strip().title()
            v = v.strip()
            headers[k] = v
            if k == "Subject":
                subject = v
    if not subject:
        match = re.search(r"(主题|subject)[:：]\s*([^\n\r]{3,120})", content, re.IGNORECASE)
        subject = match.group(2).strip() if match else ""
    return RawBounce(
        source_file=str(path),
        subject=subject,
        body=body if body else content,
        headers=headers,
        raw_text=content,
    )


def iter_bounce_sources(inputs: List[str]) -> Iterator[RawBounce]:
    """遍历输入路径（文件或目录），按扩展名分派解析器。"""
    for raw in inputs:
        p = Path(raw).expanduser()
        if not p.exists():
            continue
        if p.is_dir():
            for sub in sorted(p.rglob("*")):
                if sub.is_file() and sub.suffix.lower() in SUPPORTED_EXTENSIONS:
                    yield from _dispatch(sub)
        else:
            yield from _dispatch(p)


def _dispatch(path: Path) -> Iterator[RawBounce]:
    ext = path.suffix.lower()
    if ext in EML_EXTENSIONS:
        yield _parse_eml_file(path)
    elif ext in MBOX_EXTENSIONS:
        yield from _parse_mbox_file(path)
    elif ext in TEXT_EXTENSIONS:
        yield from _parse_text_file(path)
    else:
        try:
            first_bytes = path.read_bytes()[:64]
            if b"From " in first_bytes:
                yield from _parse_mbox_file(path)
            elif any(h in first_bytes for h in (b"Received:", b"From:", b"Return-Path:")):
                yield _parse_eml_file(path)
            else:
                yield from _parse_text_file(path)
        except Exception:
            yield from _parse_text_file(path)
