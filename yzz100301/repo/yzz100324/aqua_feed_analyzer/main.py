
#!/usr/bin/env python3
"""
海洋养殖场投喂异常分析工具 - 主入口
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from analyzer.cli import main

if __name__ == "__main__":
    main()
