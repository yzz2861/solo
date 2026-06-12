"""会议室屏幕巡检主入口

用法:
    python inspect_rooms.py                    # 读取默认 config.yaml + devices.yaml
    python inspect_rooms.py --config c.yaml --devices d.yaml
    python inspect_rooms.py --dry-run          # 不真正探测，只生成示例报告结构
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from dateutil import tz

from room_inspector.config_loader import load_config, load_devices, ensure_dirs, Room, Device
from room_inspector.online_check import check_device_online, OnlineResult
from room_inspector.screenshot import grab_screenshot, ScreenshotResult
from room_inspector.calendar_check import (
    load_calendar,
    compare_display_with_booking,
    find_current_booking,
)
from room_inspector.report import (
    DeviceInspection,
    build_report_context,
    render_html,
    load_history,
    save_history,
    update_history,
)


def _now(tz_name: str) -> datetime:
    return datetime.now(tz.gettz(tz_name) or tz.UTC)


def run_inspection(
    config_path: str,
    devices_path: str,
    dry_run: bool = False,
) -> str:
    cfg = load_config(config_path)
    rooms = load_devices(devices_path)
    ensure_dirs(cfg)

    tz_name = cfg.inspection.get("timezone", "Asia/Shanghai")
    online_timeout = int(cfg.inspection.get("online_timeout", 5))
    shot_timeout = int(cfg.inspection.get("screenshot_timeout", 10))
    consecutive_threshold = int(cfg.inspection.get("consecutive_abnormal_days", 3))
    shot_dir = cfg.inspection.get("screenshot_dir", "./reports/screenshots")
    history_path = cfg.inspection.get("history_file", "./reports/history.json")
    out_dir = cfg.inspection.get("output_dir", "./reports")

    bookings = load_calendar(cfg.calendar, tz_name)
    now = _now(tz_name)

    inspections: list[DeviceInspection] = []
    for r in rooms:
        for d in r.devices:
            if dry_run:
                online = OnlineResult(
                    device_id=d.id,
                    device_name=d.name,
                    online=True,
                    status_text="DRY RUN: online",
                )
                shot: ScreenshotResult | None = None
            else:
                print(f"  探测 {r.name} / {d.name} ({d.protocol}) ...", end=" ")
                online = check_device_online(d, timeout=online_timeout)
                print("在线" if online.online else f"离线 - {online.note or online.status_text}")
                shot = None
                if d.screenshot_url:
                    shot = grab_screenshot(d, shot_dir, timeout=shot_timeout)
                    if shot.success:
                        print(f"    截图已保存: {shot.file_path}")
                    else:
                        print(f"    截图失败: {shot.error}")

            compare = None
            if d.type == "door_display":
                status_text = online.status_text or (shot.error if shot and not shot.success else "")
                compare = compare_display_with_booking(
                    r.id, r.name, bookings, status_text, tz_name
                )

            inspections.append(
                DeviceInspection(
                    room_id=r.id,
                    room_name=r.name,
                    device_id=d.id,
                    device_name=d.name,
                    device_type=d.type,
                    online_result=online,
                    screenshot_result=shot,
                    compare_result=compare,
                )
            )

    hist = load_history(history_path)
    update_history(hist, inspections, now.strftime("%Y-%m-%d"))
    save_history(history_path, hist)

    ctx = build_report_context(inspections, rooms, bookings, hist, cfg, now, consecutive_threshold)
    html = render_html(ctx)

    fname = f"inspection_{now.strftime('%Y%m%d_%H%M%S')}.html"
    fpath = os.path.join(out_dir, fname)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(html)
    return fpath


def main() -> int:
    ap = argparse.ArgumentParser(description="会议室屏幕巡检")
    ap.add_argument("--config", default="config.yaml", help="配置文件路径")
    ap.add_argument("--devices", default="devices.yaml", help="设备清单路径")
    ap.add_argument("--dry-run", action="store_true", help="跳过真实探测，生成示例报告结构")
    args = ap.parse_args()

    if not os.path.exists(args.config):
        print(f"[错误] 找不到配置文件: {args.config}", file=sys.stderr)
        return 1
    if not os.path.exists(args.devices):
        print(f"[错误] 找不到设备清单: {args.devices}", file=sys.stderr)
        return 1

    print("开始会议室屏幕巡检 ...")
    try:
        out = run_inspection(args.config, args.devices, dry_run=args.dry_run)
    except Exception as exc:
        print(f"[错误] 巡检异常退出: {exc}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        return 2
    print(f"巡检完成，报告已生成: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
