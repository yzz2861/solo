"""配置与设备清单加载模块"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Optional

import yaml


@dataclass
class Device:
    id: str
    name: str
    type: str  # screen / cast / door_display
    protocol: str  # ping / http
    host: str
    port: Optional[int] = None
    status_url: Optional[str] = None
    screenshot_url: Optional[str] = None
    screenshot_format: str = "jpeg"

    @classmethod
    def from_dict(cls, d: dict) -> "Device":
        return cls(
            id=d["id"],
            name=d["name"],
            type=d["type"],
            protocol=d["protocol"],
            host=d["host"],
            port=d.get("port"),
            status_url=d.get("status_url"),
            screenshot_url=d.get("screenshot_url"),
            screenshot_format=d.get("screenshot_format", "jpeg"),
        )


@dataclass
class Room:
    id: str
    name: str
    floor: str = ""
    capacity: int = 0
    devices: list[Device] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: dict) -> "Room":
        return cls(
            id=d["id"],
            name=d["name"],
            floor=d.get("floor", ""),
            capacity=d.get("capacity", 0),
            devices=[Device.from_dict(x) for x in d.get("devices", [])],
        )


@dataclass
class Config:
    inspection: dict
    calendar: dict
    report: dict

    @classmethod
    def from_dict(cls, d: dict) -> "Config":
        return cls(
            inspection=d.get("inspection", {}),
            calendar=d.get("calendar", {}),
            report=d.get("report", {}),
        )


def load_config(path: str) -> Config:
    with open(path, "r", encoding="utf-8") as f:
        return Config.from_dict(yaml.safe_load(f))


def load_devices(path: str) -> list[Room]:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    rooms = [Room.from_dict(r) for r in data.get("rooms", [])]
    _validate_unique_names(rooms)
    return rooms


def _validate_unique_names(rooms: list[Room]) -> None:
    name_map: dict[str, list[str]] = {}
    for r in rooms:
        name_map.setdefault(r.name, []).append(r.id)
    dupes = {n: ids for n, ids in name_map.items() if len(ids) > 1}
    if dupes:
        for name, ids in dupes.items():
            print(f"[警告] 同名会议室 '{name}' 对应多个 id: {', '.join(ids)}，报告中将用 id 区分。")


def ensure_dirs(config: Config) -> None:
    for p in [
        config.inspection.get("output_dir", "./reports"),
        config.inspection.get("screenshot_dir", "./reports/screenshots"),
    ]:
        os.makedirs(p, exist_ok=True)
