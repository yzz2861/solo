
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_BIN="$(which python3 2>/dev/null || which python 2>/dev/null || echo "/Library/Developer/CommandLineTools/usr/bin/python3")"

TOTAL=$(grep -c '^## ' idea_history.md)
echo "共 ${TOTAL} 条 idea，开始顺序执行..."

for i in $(seq 1 "$TOTAL"); do
    echo "========== [${i}/${TOTAL}] 开始执行 =========="
    "$PYTHON_BIN" trae_idea_runner.py
    echo "========== [${i}/${TOTAL}] 执行结束 =========="
done

echo "全部执行完成。"
