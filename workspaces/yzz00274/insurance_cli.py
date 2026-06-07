#!/usr/bin/env python3
"""研学活动保险名单 CLI 入口脚本"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from research_insurance_cli.cli import main

if __name__ == "__main__":
    main()
