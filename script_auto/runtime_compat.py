#!/usr/bin/env python3
"""
简化版 runtime_compat 模块，用于支持 trae_idea_runner.py 的基本功能
"""

from pathlib import Path
import os


def bootstrap_script_auto_runtime(root: Path, script_dir: Path, run_log_root: Path) -> None:
    """初始化脚本自动运行时环境"""
    script_auto_dir = run_log_root / "script_auto"
    script_auto_dir.mkdir(parents=True, exist_ok=True)
    
    runs_dir = script_auto_dir / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    
    os.environ.setdefault("SOLO_ROOT", str(root))
    os.environ.setdefault("SOLO_RUN_LOG_ROOT", str(run_log_root))


def existing_legacy_paths(path: Path) -> list[Path]:
    """返回旧版路径列表（兼容用）"""
    return []
