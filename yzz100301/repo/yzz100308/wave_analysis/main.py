#!/usr/bin/env python3
"""
电商仓晚班拣货波次复盘分析工具 - 主入口

使用方法:
    python main.py --sample                    # 使用示例数据运行
    python main.py --wave-csv x.csv --review-json y.json --supplement-csv z.csv
    python main.py --wave-dir waves/ --review-dir reviews/ --supplement-dir supplements/
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wave_analysis.cli import main

if __name__ == '__main__':
    main()
