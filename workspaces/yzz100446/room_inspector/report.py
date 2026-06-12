"""异常检测、历史追踪与报告生成"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Optional

from jinja2 import Template

from .config_loader import Config, Room
from .online_check import OnlineResult
from .screenshot import ScreenshotResult
from .calendar_check import Booking, CalendarCompareResult


@dataclass
class DeviceInspection:
    room_id: str
    room_name: str
    device_id: str
    device_name: str
    device_type: str
    online_result: OnlineResult
    screenshot_result: Optional[ScreenshotResult] = None
    compare_result: Optional[CalendarCompareResult] = None

    def is_abnormal(self) -> bool:
        if not self.online_result.online:
            return True
        if self.screenshot_result and not self.screenshot_result.success and self.device_type != "cast":
            return True
        if self.compare_result and not self.compare_result.status_matched and self.device_type == "door_display":
            return True
        return False

    def category(self) -> str:
        """现场处理 / 软件问题 / 其他"""
        if not self.online_result.online:
            if "断网" in self.online_result.note:
                return "onsite"
            return "software"
        if self.screenshot_result and not self.screenshot_result.success:
            return "software"
        if self.compare_result and not self.compare_result.status_matched:
            return "software"
        return "normal"


@dataclass
class HistoryRecord:
    device_id: str
    last_abnormal_date: Optional[str] = None
    consecutive_days: int = 0


def load_history(path: str) -> dict[str, HistoryRecord]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        out = {}
        for k, v in data.items():
            out[k] = HistoryRecord(
                device_id=k,
                last_abnormal_date=v.get("last_abnormal_date"),
                consecutive_days=v.get("consecutive_days", 0),
            )
        return out
    except Exception:
        return {}


def save_history(path: str, hist: dict[str, HistoryRecord]) -> None:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({k: asdict(v) for k, v in hist.items()}, f, ensure_ascii=False, indent=2)
    except Exception as exc:
        print(f"[警告] 历史记录保存失败: {exc}")


def update_history(hist: dict[str, HistoryRecord], inspections: list[DeviceInspection], today: str) -> None:
    abnormal_ids = {i.device_id for i in inspections if i.is_abnormal()}
    for insp in inspections:
        rec = hist.get(insp.device_id) or HistoryRecord(device_id=insp.device_id)
        if insp.is_abnormal():
            if rec.last_abnormal_date == today:
                pass
            elif rec.last_abnormal_date and _is_yesterday(rec.last_abnormal_date, today):
                rec.consecutive_days += 1
            else:
                rec.consecutive_days = 1
            rec.last_abnormal_date = today
        else:
            rec.consecutive_days = 0
        hist[insp.device_id] = rec


def _is_yesterday(d: str, today: str) -> bool:
    try:
        a = datetime.strptime(d, "%Y-%m-%d").date()
        b = datetime.strptime(today, "%Y-%m-%d").date()
        return (b - a) == timedelta(days=1)
    except Exception:
        return False


@dataclass
class ReportContext:
    generated_at: str
    total_rooms: int
    total_devices: int
    abnormal_devices: int
    onsite_rooms: list
    software_issues: list
    consecutive_issues: list
    per_room: list
    bookings_by_room: dict[str, list[Booking]]
    company_name: str
    title: str


def build_report_context(
    inspections: list[DeviceInspection],
    rooms: list[Room],
    bookings: list[Booking],
    history: dict[str, HistoryRecord],
    config: Config,
    generated_at: datetime,
    consecutive_threshold: int = 3,
) -> ReportContext:
    abnormal = [i for i in inspections if i.is_abnormal()]
    onsite_room_ids = {i.room_id for i in abnormal if i.category() == "onsite"}
    onsite_rooms = [
        {
            "room_id": r.id,
            "room_name": r.name,
            "floor": r.floor,
            "devices": [
                {
                    "device_id": d.device_id,
                    "device_name": d.device_name,
                    "device_type": d.device_type,
                    "note": d.online_result.note or d.online_result.status_text,
                    "screenshot": (d.screenshot_result.filename if d.screenshot_result and d.screenshot_result.success else ""),
                }
                for d in abnormal
                if d.room_id == r.id and d.category() == "onsite"
            ],
        }
        for r in rooms
        if r.id in onsite_room_ids
    ]

    software_issues = [
        {
            "room_id": i.room_id,
            "room_name": i.room_name,
            "device_id": i.device_id,
            "device_name": i.device_name,
            "device_type": i.device_type,
            "status_text": i.online_result.status_text,
            "note": i.online_result.note
            or (i.screenshot_result.error if i.screenshot_result else "")
            or (i.compare_result.note if i.compare_result else ""),
            "screenshot": (i.screenshot_result.filename if i.screenshot_result and i.screenshot_result.success else ""),
            "calendar_mismatch": (
                _fmt_booking(i.compare_result.expected_booking) if i.compare_result and i.compare_result.expected_booking else ""
            ),
            "seen_text": (i.compare_result.status_text_seen if i.compare_result else ""),
        }
        for i in abnormal
        if i.category() == "software"
    ]

    consecutive_issues = [
        {
            "room_id": i.room_id,
            "room_name": i.room_name,
            "device_id": i.device_id,
            "device_name": i.device_name,
            "consecutive_days": history.get(i.device_id, HistoryRecord(device_id=i.device_id)).consecutive_days,
            "category": i.category(),
        }
        for i in abnormal
        if history.get(i.device_id, HistoryRecord(device_id=i.device_id)).consecutive_days >= consecutive_threshold
    ]

    per_room = []
    for r in rooms:
        devs = [x for x in inspections if x.room_id == r.id]
        per_room.append(
            {
                "room_id": r.id,
                "room_name": r.name,
                "floor": r.floor,
                "capacity": r.capacity,
                "devices": [
                    {
                        "device_id": d.device_id,
                        "device_name": d.device_name,
                        "device_type": d.device_type,
                        "online": d.online_result.online,
                        "status_text": d.online_result.status_text,
                        "note": d.online_result.note,
                        "screenshot": (d.screenshot_result.filename if d.screenshot_result and d.screenshot_result.success else ""),
                        "screenshot_error": (d.screenshot_result.error if d.screenshot_result and not d.screenshot_result.success else ""),
                        "calendar_matched": (d.compare_result.status_matched if d.compare_result else None),
                        "calendar_note": (d.compare_result.note if d.compare_result else ""),
                        "seen_text": (d.compare_result.status_text_seen if d.compare_result else ""),
                        "expected_booking": (_fmt_booking(d.compare_result.expected_booking) if d.compare_result and d.compare_result.expected_booking else ""),
                    }
                    for d in devs
                ],
            }
        )

    bookings_by_room: dict[str, list[Booking]] = {}
    for b in bookings:
        bookings_by_room.setdefault(b.room_id, []).append(b)
        bookings_by_room.setdefault(b.room_name, []).append(b)

    return ReportContext(
        generated_at=generated_at.strftime("%Y-%m-%d %H:%M:%S %Z"),
        total_rooms=len(rooms),
        total_devices=len(inspections),
        abnormal_devices=len(abnormal),
        onsite_rooms=onsite_rooms,
        software_issues=software_issues,
        consecutive_issues=consecutive_issues,
        per_room=per_room,
        bookings_by_room=bookings_by_room,
        company_name=config.report.get("company_name", ""),
        title=config.report.get("title", "会议室巡检报告"),
    )


def _fmt_booking(b: Optional[Booking]) -> str:
    if not b:
        return ""
    s = b.start.strftime("%H:%M")
    e = b.end.strftime("%H:%M")
    return f"{s}-{e} {b.title}" + (f" ({b.organizer})" if b.organizer else "")


REPORT_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>{{ ctx.title }}</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 24px; color: #222; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 18px; border-left: 4px solid #3b82f6; padding-left: 8px; margin-top: 28px; }
  h3 { font-size: 15px; margin: 16px 0 8px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; }
  .card { padding: 12px 18px; border-radius: 8px; background: #f3f4f6; min-width: 140px; }
  .card b { font-size: 22px; display: block; }
  .card.bad { background: #fee2e2; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f9fafb; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; margin-right: 4px; }
  .tag.red { background: #fee2e2; color: #991b1b; }
  .tag.green { background: #dcfce7; color: #166534; }
  .tag.yellow { background: #fef3c7; color: #92400e; }
  img.ss { max-width: 260px; max-height: 160px; border: 1px solid #ddd; border-radius: 4px; }
  .note { color: #991b1b; font-size: 12px; }
  .booking { background: #eff6ff; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #1e40af; }
</style>
</head>
<body>
<h1>{{ ctx.title }}</h1>
<div class="meta">{{ ctx.company_name }} · 生成于 {{ ctx.generated_at }}</div>

<div class="summary">
  <div class="card"><span>会议室</span><b>{{ ctx.total_rooms }}</b></div>
  <div class="card"><span>设备总数</span><b>{{ ctx.total_devices }}</b></div>
  <div class="card bad"><span>异常设备</span><b>{{ ctx.abnormal_devices }}</b></div>
  <div class="card bad"><span>需现场处理房间</span><b>{{ ctx.onsite_rooms|length }}</b></div>
  <div class="card bad"><span>疑似软件问题</span><b>{{ ctx.software_issues|length }}</b></div>
  <div class="card bad"><span>连续多天异常</span><b>{{ ctx.consecutive_issues|length }}</b></div>
</div>

<h2>🔴 需要现场处理的房间</h2>
{% if ctx.onsite_rooms %}
{% for room in ctx.onsite_rooms %}
<h3>{{ room.room_name }} <span class="meta" style="color:#666">{{ room.floor }} · {{ room.room_id }}</span></h3>
<table>
  <tr><th>设备</th><th>类型</th><th>现场描述</th><th>截图</th><th>当前预约（联系IT附带）</th></tr>
  {% for d in room.devices %}
  <tr>
    <td>{{ d.device_name }}<br/><span class="note">{{ d.device_id }}</span></td>
    <td>{{ d.device_type }}</td>
    <td class="note">{{ d.note }}</td>
    <td>{% if d.screenshot %}<img class="ss" src="screenshots/{{ d.screenshot }}" />{% else %}无截图{% endif %}</td>
    <td>
      {% set bks = ctx.bookings_by_room.get(room.room_id, []) + ctx.bookings_by_room.get(room.room_name, []) %}
      {% if bks %}{% for b in bks[:3] %}<div class="booking">{{ b.start.strftime("%H:%M") }}-{{ b.end.strftime("%H:%M") }} {{ b.title }}{% if b.organizer %} ({{ b.organizer }}){% endif %}</div>{% endfor %}{% else %}无预约{% endif %}
    </td>
  </tr>
  {% endfor %}
</table>
{% endfor %}
{% else %}
<p>无。</p>
{% endif %}

<h2>🟡 疑似软件问题（接口/日程/截图异常）</h2>
{% if ctx.software_issues %}
<table>
  <tr><th>会议室</th><th>设备</th><th>现象</th><th>接口状态</th><th>截图</th><th>期望日程</th><th>屏幕实际显示</th></tr>
  {% for i in ctx.software_issues %}
  <tr>
    <td>{{ i.room_name }}<br/><span class="note">{{ i.room_id }}</span></td>
    <td>{{ i.device_name }}<br/><span class="note">{{ i.device_id }}</span></td>
    <td class="note">{{ i.note }}</td>
    <td>{{ i.status_text }}</td>
    <td>{% if i.screenshot %}<img class="ss" src="screenshots/{{ i.screenshot }}" />{% else %}<span class="note">截图失败</span>{% endif %}</td>
    <td>{% if i.calendar_mismatch %}<div class="booking">{{ i.calendar_mismatch }}</div>{% else %}-{% endif %}</td>
    <td>{{ i.seen_text or "-" }}</td>
  </tr>
  {% endfor %}
</table>
{% else %}
<p>无。</p>
{% endif %}

<h2>🟠 连续多天异常设备（≥3天）</h2>
{% if ctx.consecutive_issues %}
<table>
  <tr><th>会议室</th><th>设备</th><th>连续天数</th><th>分类</th></tr>
  {% for i in ctx.consecutive_issues %}
  <tr>
    <td>{{ i.room_name }} ({{ i.room_id }})</td>
    <td>{{ i.device_name }} ({{ i.device_id }})</td>
    <td><span class="tag red">{{ i.consecutive_days }} 天</span></td>
    <td>{% if i.category == 'onsite' %}<span class="tag yellow">现场处理</span>{% else %}<span class="tag yellow">软件问题</span>{% endif %}</td>
  </tr>
  {% endfor %}
</table>
{% else %}
<p>无。</p>
{% endif %}

<h2>📋 所有房间巡检详情</h2>
{% for room in ctx.per_room %}
<h3>{{ room.room_name }} <span class="meta">{{ room.floor }} · 容纳 {{ room.capacity }} 人 · {{ room.room_id }}</span></h3>
<table>
  <tr><th>设备</th><th>在线</th><th>状态文本</th><th>截图</th><th>日程比对</th></tr>
  {% for d in room.devices %}
  <tr>
    <td>{{ d.device_name }}<br/><span class="note">{{ d.device_id }}</span></td>
    <td>{% if d.online %}<span class="tag green">在线</span>{% if d.latency_ms %}({{ d.latency_ms }}ms){% endif %}{% else %}<span class="tag red">离线</span>{% endif %}</td>
    <td>{{ d.status_text }}{% if d.note %}<div class="note">{{ d.note }}</div>{% endif %}</td>
    <td>{% if d.screenshot %}<img class="ss" src="screenshots/{{ d.screenshot }}" />{% elif d.screenshot_error %}<span class="note">{{ d.screenshot_error }}</span>{% else %}-{% endif %}</td>
    <td>
      {% if d.calendar_matched is not none %}
        {% if d.calendar_matched %}<span class="tag green">匹配</span>
        {% else %}<span class="tag red">不匹配</span>{% if d.calendar_note %}<div class="note">{{ d.calendar_note }}</div>{% endif %}
        {% endif %}
        {% if d.expected_booking %}<div class="booking">期望：{{ d.expected_booking }}</div>{% endif %}
        {% if d.seen_text %}<div>实际显示：{{ d.seen_text }}</div>{% endif %}
      {% else %}-{% endif %}
    </td>
  </tr>
  {% endfor %}
</table>
{% endfor %}
</body>
</html>
"""


def render_html(context: ReportContext) -> str:
    tpl = Template(REPORT_TEMPLATE)
    return tpl.render(ctx=context)
