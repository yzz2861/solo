#!/usr/bin/env python3
"""
学生请假条汇总器 - 顶层入口脚本

使用方法:
  python main.py --help
  python main.py demo
  python main.py process --sms data/短信.txt --sheet data/请假表.xlsx ...
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from leave_aggregator.cli import main

if __name__ == "__main__":
    main()
