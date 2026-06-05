#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PYTHON_BIN="$(which python3 2>/dev/null || which python 2>/dev/null || echo "/Library/Developer/CommandLineTools/usr/bin/python3")"
LOG_DIR="$SCRIPT_DIR/run_log/script_auto"
PID_FILE="$LOG_DIR/trae_idea_runner.pid"
LOG_FILE="$LOG_DIR/trae_idea_runner.nohup.log"
QA_QUEUE_FILE="$LOG_DIR/codex_qa_queue.json"

mkdir -p "$LOG_DIR"

is_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

start_runner() {
    if is_running; then
        echo "后台任务已在运行，PID: $(cat "$PID_FILE")"
        exit 0
    fi

    echo "启动后台任务..."
    nohup env PYTHONUNBUFFERED=1 "$PYTHON_BIN" "$SCRIPT_DIR/trae_idea_runner.py" >>"$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    sleep 1

    if kill -0 "$pid" 2>/dev/null; then
        echo "启动成功，PID: $pid"
        echo "日志文件: $LOG_FILE"
    else
        echo "启动失败，请检查日志: $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

stop_runner() {
    if ! is_running; then
        echo "后台任务未运行"
        rm -f "$PID_FILE"
        exit 0
    fi

    local pid
    pid="$(cat "$PID_FILE")"
    echo "停止后台任务，PID: $pid"
    kill "$pid" 2>/dev/null || true

    for _ in $(seq 1 10); do
        if ! kill -0 "$pid" 2>/dev/null; then
            rm -f "$PID_FILE"
            echo "已停止"
            exit 0
        fi
        sleep 1
    done

    echo "进程仍未退出，强制停止..."
    kill -9 "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "已强制停止"
}

show_status() {
    if is_running; then
        echo "后台任务运行中，PID: $(cat "$PID_FILE")"
        echo "日志文件: $LOG_FILE"
    else
        echo "后台任务未运行"
    fi
}

show_queue() {
    if [[ ! -f "$QA_QUEUE_FILE" ]]; then
        echo "质检队列为空：$QA_QUEUE_FILE 不存在"
        return 0
    fi

    python3 - "$QA_QUEUE_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
try:
    data = json.loads(path.read_text(encoding="utf-8"))
except Exception as exc:
    print(f"质检队列读取失败: {exc}")
    raise SystemExit(1)

jobs = data.get("jobs") or []
pending = [job for job in jobs if isinstance(job, dict) and job.get("status") in {"pending", "running", "retry_wait"}]
print(f"质检队列文件: {path}")
print(f"总任务数: {len(jobs)}")
print(f"未完成任务数: {len(pending)}")
for job in pending[:50]:
    idea_id = job.get("idea_id", "")
    status = job.get("status", "")
    due_at = job.get("due_at", "")
    attempts = job.get("attempts", 0)
    last_error = job.get("last_error", "")
    print(f"- {idea_id} | {status} | due_at={due_at} | attempts={attempts} | last_error={last_error}")
PY
}

show_logs() {
    touch "$LOG_FILE"
    tail -f "$LOG_FILE"
}

case "${1:-start}" in
    start)
        start_runner
        ;;
    stop)
        stop_runner
        ;;
    restart)
        stop_runner || true
        start_runner
        ;;
    status)
        show_status
        ;;
    queue)
        show_queue
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|queue|logs}"
        exit 1
        ;;
esac
