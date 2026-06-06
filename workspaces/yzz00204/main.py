#!/usr/bin/env python3
"""论文盲审冲突回避 CLI 工具入口"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from paper_review_cli.cli import main

if __name__ == "__main__":
    sys.exit(main())
