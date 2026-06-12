"""日历预约读取与显示比对模块"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from dateutil import tz


@dataclass
class Booking:
    room_id: str
    room_name: str
    title: str
    start: datetime
    end: datetime
    organizer: str = ""
    source: str = ""


@dataclass
class CalendarCompareResult:
    room_id: str
    room_name: str
    expected_booking: Optional[Booking] = None
    status_matched: bool = False
    status_text_seen: str = ""
    note: str = ""


def _now_local(tz_name: str) -> datetime:
    return datetime.now(tz.gettz(tz_name) or tz.UTC)


def _to_local(dt: datetime, tz_name: str) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(tz.gettz(tz_name) or tz.UTC)


def load_calendar(config: dict, tz_name: str) -> list[Booking]:
    """读取日历：优先读取缓存，过期则拉取 ics；失败时返回缓存或空列表并提示"""
    cache_file = config.get("cache_file", "./reports/calendar_cache.json")
    ttl = timedelta(minutes=config.get("cache_ttl_minutes", 30))
    now = _now_local(tz_name)

    cached = _read_cache(cache_file, ttl, now)
    if cached is not None:
        return cached

    cal_type = config.get("type", "ics_url")
    if cal_type == "ics_url":
        url = config.get("ics_url", "")
        if not url:
            return _read_cache(cache_file, None, now) or []
        try:
            r = requests.get(url, timeout=15)
            if not r.ok:
                raise RuntimeError(f"HTTP {r.status_code}")
            bookings = _parse_ics(r.text, tz_name)
            _write_cache(cache_file, bookings, now)
            return bookings
        except Exception as exc:
            print(f"[警告] 日历拉取失败: {exc}，尝试使用过期缓存")
            stale = _read_cache(cache_file, None, now)
            if stale is None:
                return []
            return stale
    return []


def _parse_ics(text: str, tz_name: str) -> list[Booking]:
    try:
        from ics import Calendar  # type: ignore
    except ImportError:
        print("[警告] ics 库未安装，日历解析跳过。请 pip install ics")
        return []
    try:
        cal = Calendar(text)
    except Exception as exc:
        print(f"[警告] ICS 解析异常: {exc}")
        return []
    out: list[Booking] = []
    for e in getattr(cal, "events", []):
        start = _to_local(e.begin.datetime if hasattr(e.begin, "datetime") else e.begin, tz_name)
        end = _to_local(e.end.datetime if hasattr(e.end, "datetime") else e.end, tz_name)
        loc = (e.location or "").strip()
        name = (e.name or "").strip()
        organizer = (e.organizer or "") if hasattr(e, "organizer") else ""
        out.append(
            Booking(
                room_id=loc or name,
                room_name=loc or name,
                title=name,
                start=start,
                end=end,
                organizer=str(organizer),
                source="ics",
            )
        )
    return out


def _read_cache(path: str, ttl: Optional[timedelta], now: datetime) -> Optional[list[Booking]]:
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        ts = datetime.fromisoformat(data.get("fetched_at", ""))
        bookings = [_booking_from_dict(b) for b in data.get("bookings", [])]
        if ttl is None or (now - ts) <= ttl:
            return bookings
        print(f"[提示] 使用过期日历缓存（{ts.isoformat(timespec='seconds')}）")
        return bookings
    except Exception:
        return None


def _write_cache(path: str, bookings: list[Booking], now: datetime) -> None:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "fetched_at": now.isoformat(),
                    "bookings": [_booking_to_dict(b) for b in bookings],
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
    except Exception as exc:
        print(f"[警告] 日历缓存写入失败: {exc}")


def _booking_to_dict(b: Booking) -> dict:
    return {
        "room_id": b.room_id,
        "room_name": b.room_name,
        "title": b.title,
        "start": b.start.isoformat(),
        "end": b.end.isoformat(),
        "organizer": b.organizer,
        "source": b.source,
    }


def _booking_from_dict(d: dict) -> Booking:
    return Booking(
        room_id=d["room_id"],
        room_name=d["room_name"],
        title=d["title"],
        start=datetime.fromisoformat(d["start"]),
        end=datetime.fromisoformat(d["end"]),
        organizer=d.get("organizer", ""),
        source=d.get("source", ""),
    )


def find_current_booking(bookings: list[Booking], room_id: str, room_name: str, now: datetime) -> Optional[Booking]:
    """按 id 或名字匹配当前时段的预约（含跨时区归一化后）"""
    candidates = [
        b
        for b in bookings
        if (b.room_id and b.room_id == room_id)
        or (room_name and _room_name_match(b.room_name, room_name))
    ]
    for b in candidates:
        if b.start <= now < b.end:
            return b
    return None


def _room_name_match(a: str, b: str) -> bool:
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    if not a or not b:
        return False
    return a == b or a in b or b in a


def compare_display_with_booking(
    room_id: str,
    room_name: str,
    bookings: list[Booking],
    status_text: str,
    tz_name: str,
) -> CalendarCompareResult:
    """用门口屏/主屏幕的状态文本与当前实际预约做简易比对"""
    now = _now_local(tz_name)
    booking = find_current_booking(bookings, room_id, room_name, now)
    if not booking:
        return CalendarCompareResult(
            room_id=room_id,
            room_name=room_name,
            expected_booking=None,
            status_matched=not status_text,
            status_text_seen=status_text,
            note="当前无预约" if not status_text else "屏幕显示日程但日历无对应预约（可能缓存过期或同名房间）",
        )
    title_kw = booking.title or ""
    matched = bool(title_kw) and title_kw[:8] and (title_kw[:8] in (status_text or "") or (status_text or "")[:8] and status_text[:8] in title_kw)
    note = ""
    if not matched:
        note = "门口屏显示与当前日历预约不一致（可能是跨时区偏差、缓存过期、或同名会议室串号）"
    return CalendarCompareResult(
        room_id=room_id,
        room_name=room_name,
        expected_booking=booking,
        status_matched=matched,
        status_text_seen=status_text,
        note=note,
    )
