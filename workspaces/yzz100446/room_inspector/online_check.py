"""设备在线状态检查模块"""
from __future__ import annotations

import platform
import subprocess
from dataclasses import dataclass
from typing import Optional

import requests

from .config_loader import Device


@dataclass
class OnlineResult:
    device_id: str
    device_name: str
    online: bool
    status_text: str = ""
    note: str = ""
    latency_ms: Optional[float] = None


def _ping(host: str, timeout: int = 5) -> tuple[bool, Optional[float], str]:
    param = "-n" if platform.system().lower() == "windows" else "-c"
    wait_param = "-w" if platform.system().lower() == "windows" else "-W"
    cmd = ["ping", param, "1", wait_param, str(timeout), host]
    try:
        completed = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout + 2
        )
        output = (completed.stdout or "") + "\n" + (completed.stderr or "")
        if completed.returncode == 0:
            latency = _extract_ping_latency(output)
            return True, latency, output.strip()
        return False, None, (output.strip() or "ping 无返回")
    except subprocess.TimeoutExpired:
        return False, None, f"ping 超时 ({timeout}s)"
    except Exception as exc:  # pragma: no cover
        return False, None, f"ping 异常: {exc}"


def _extract_ping_latency(text: str) -> Optional[float]:
    import re

    m = re.search(r"time[=<]\s*([\d.]+)\s*ms", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def _http_probe(url: str, timeout: int = 5) -> tuple[bool, str, Optional[float]]:
    import time

    start = time.time()
    try:
        r = requests.get(url, timeout=timeout)
        elapsed_ms = (time.time() - start) * 1000
        if r.ok:
            snippet = r.text[:300].strip() if r.text else ""
            return True, snippet or "HTTP 200 OK", round(elapsed_ms, 1)
        return False, f"HTTP {r.status_code}: {r.reason}", round(elapsed_ms, 1)
    except requests.Timeout:
        return False, f"HTTP 超时 ({timeout}s)", None
    except requests.ConnectionError as e:
        return False, f"连接失败: {e.__class__.__name__}", None
    except Exception as exc:
        return False, f"HTTP 异常: {exc}", None


def check_device_online(device: Device, timeout: int = 5) -> OnlineResult:
    """根据设备协议（ping 或 http）检查在线状态"""
    if device.protocol == "http" and device.status_url:
        ok, text, latency = _http_probe(device.status_url, timeout=timeout)
        note = ""
        if not ok and device.host:
            ping_ok, _, _ = _ping(device.host, timeout=min(timeout, 3))
            if not ping_ok:
                note = "疑似临时断网（主机也无法 ping 通）"
            else:
                note = "主机可达但状态接口异常（疑似软件问题）"
        return OnlineResult(
            device_id=device.id,
            device_name=device.name,
            online=ok,
            status_text=text,
            note=note,
            latency_ms=latency,
        )

    if device.protocol == "ping" or device.host:
        ok, latency, out = _ping(device.host, timeout=timeout)
        note = "" if ok else "疑似临时断网或设备离线"
        status_text = out if out else ("在线" if ok else "离线")
        return OnlineResult(
            device_id=device.id,
            device_name=device.name,
            online=ok,
            status_text=status_text,
            note=note,
            latency_ms=latency,
        )

    return OnlineResult(
        device_id=device.id,
        device_name=device.name,
        online=False,
        note="未配置可用探测方式",
    )
