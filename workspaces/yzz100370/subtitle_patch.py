#!/usr/bin/env python3
"""
字幕时间轴修补工具 - 主入口脚本
Subtitle Timeline Patcher - Main Entry Point

用法：
    python subtitle_patch.py <输入文件/目录> [选项]

示例：
    python subtitle_patch.py *.srt --reference-lang zh
    python subtitle_patch.py ./subtitles -r -o ./patched
    python subtitle_patch.py ep01.zh.srt ep01.en.srt --reference ep01.zh.srt
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from subtitle_patch.cli import main

if __name__ == "__main__":
    sys.exit(main())
