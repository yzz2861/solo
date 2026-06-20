#!/usr/bin/env python3
"""打印店交付清单 CLI 入口"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from print_shop.cli import main

if __name__ == "__main__":
    main()
