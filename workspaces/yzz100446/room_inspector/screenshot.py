"""截图获取模块"""
from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass
from typing import Optional

import requests

from .config_loader import Device


@dataclass
class ScreenshotResult:
    device_id: str
    device_name: str
    success: bool
    file_path: str = ""
    error: str = ""

    @property
    def filename(self) -> str:
        return os.path.basename(self.file_path) if self.file_path else ""


def _ext_from_format(fmt: str, resp: Optional[requests.Response] = None) -> str:
    mapping = {"jpeg": ".jpg", "jpg": ".jpg", "png": ".png", "gif": ".gif", "bmp": ".bmp"}
    if fmt and fmt.lower() in mapping:
        return mapping[fmt.lower()]
    if resp is not None:
        ctype = resp.headers.get("Content-Type", "")
        ext = mimetypes.guess_extension(ctype.split(";")[0].strip()) if ctype else None
        if ext:
            return ext
    return ".png"


def grab_screenshot(device: Device, save_dir: str, timeout: int = 10) -> ScreenshotResult:
    """尝试抓取设备截图并保存到 save_dir，失败时记录原因"""
    if not device.screenshot_url:
        return ScreenshotResult(
            device_id=device.id,
            device_name=device.name,
            success=False,
            error="设备未配置截图接口",
        )

    os.makedirs(save_dir, exist_ok=True)
    try:
        r = requests.get(device.screenshot_url, timeout=timeout)
        if not r.ok:
            return ScreenshotResult(
                device_id=device.id,
                device_name=device.name,
                success=False,
                error=f"截图接口返回 HTTP {r.status_code}",
            )
        if not r.content or len(r.content) < 100:
            return ScreenshotResult(
                device_id=device.id,
                device_name=device.name,
                success=False,
                error="截图响应内容为空或过小",
            )
        ext = _ext_from_format(device.screenshot_format, r)
        fname = f"{device.id}{ext}"
        fpath = os.path.join(save_dir, fname)
        with open(fpath, "wb") as f:
            f.write(r.content)
        return ScreenshotResult(
            device_id=device.id,
            device_name=device.name,
            success=True,
            file_path=fpath,
        )
    except requests.Timeout:
        return ScreenshotResult(
            device_id=device.id,
            device_name=device.name,
            success=False,
            error=f"截图接口超时 ({timeout}s)",
        )
    except requests.ConnectionError as e:
        return ScreenshotResult(
            device_id=device.id,
            device_name=device.name,
            success=False,
            error=f"截图连接失败: {e.__class__.__name__}",
        )
    except Exception as exc:
        return ScreenshotResult(
            device_id=device.id,
            device_name=device.name,
            success=False,
            error=f"截图异常: {exc}",
        )
