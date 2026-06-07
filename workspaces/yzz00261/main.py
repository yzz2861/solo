#!/usr/bin/env python3
"""康复治疗预约冲突 CLI 入口"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from rehab_conflict_cli.cli import cli

if __name__ == "__main__":
    cli()
