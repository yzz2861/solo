#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOLO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
export SOLO_ROOT
export PYTHONDONTWRITEBYTECODE=1

case " $* " in
  *" --help "*|*" -h "*)
    python3 "$SCRIPT_DIR/manual_finish.py" "$@"
    exit $?
    ;;
esac

resolved_info="$(
  PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}" python3 - "$@" <<'PY'
import argparse
import json
import sys
from pathlib import Path

from manual_lib import auto_finish_pending_count, idea_id_from_run_dir, next_auto_finish_candidate

parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("idea_id", nargs="?")
parser.add_argument("--run-dir")
parser.add_argument("--round-name")
parser.add_argument("--session-timeout")
parser.add_argument("--commit-timeout")
parser.add_argument("--trajectory-timeout")
args, _ = parser.parse_known_args(sys.argv[1:])

pending_count = auto_finish_pending_count()
auto_selected = False
run_dir = ""
if args.idea_id:
    idea_id = args.idea_id
elif args.run_dir:
    resolved_run_dir = Path(args.run_dir).expanduser().resolve()
    idea_id = idea_id_from_run_dir(resolved_run_dir)
    if not idea_id:
        raise SystemExit(f"无法从 run 目录名推断项目 ID: {args.run_dir}")
    run_dir = str(resolved_run_dir)
else:
    candidate = next_auto_finish_candidate()
    if not candidate:
        raise SystemExit("没有找到可自动收尾的项目：需要 go.sh 标记为 completed_window_closed，且还没有完成收尾。")
    idea_id = str(candidate.get("idea_id") or "")
    run_dir = str(candidate.get("run_dir") or "")
    auto_selected = True

print(json.dumps({
    "idea_id": idea_id,
    "auto_selected": auto_selected,
    "pending_count": pending_count,
    "run_dir": run_dir,
}, ensure_ascii=False))
PY
)"

resolved_idea_id="$(
  python3 - "$resolved_info" <<'PY'
import json
import sys
print(json.loads(sys.argv[1]).get("idea_id") or "")
PY
)"
auto_selected="$(
  python3 - "$resolved_info" <<'PY'
import json
import sys
print("1" if json.loads(sys.argv[1]).get("auto_selected") else "0")
PY
)"
auto_pending_before="$(
  python3 - "$resolved_info" <<'PY'
import json
import sys
print(int(json.loads(sys.argv[1]).get("pending_count") or 0))
PY
)"
resolved_run_dir="$(
  python3 - "$resolved_info" <<'PY'
import json
import sys
print(json.loads(sys.argv[1]).get("run_dir") or "")
PY
)"

if [[ -z "$resolved_idea_id" ]]; then
  echo "无法解析要收尾的项目 ID。" >&2
  exit 2
fi

first_arg="${1:-}"
if [[ -z "$first_arg" || "$first_arg" == --* ]]; then
  echo "未指定项目 ID，自动选择收尾项目: $resolved_idea_id"
  echo "自动关闭待收尾队列: 当前剩余 $auto_pending_before 个，正在处理 1 个，完成后预计剩余 $(( auto_pending_before > 0 ? auto_pending_before - 1 : 0 )) 个。"
  if [[ -n "$resolved_run_dir" ]]; then
    set -- "$resolved_idea_id" --run-dir "$resolved_run_dir" "$@"
  else
    set -- "$resolved_idea_id" "$@"
  fi
fi

python3 "$SCRIPT_DIR/manual_finish.py" "$@"

case " $* " in
  *" --detach-after-capture "*)
    exit 0
    ;;
esac

if [[ "$auto_selected" == "1" ]]; then
  auto_pending_after="$(
    PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}" python3 - <<'PY'
from manual_lib import auto_finish_pending_count
print(auto_finish_pending_count())
PY
  )"
  echo "自动关闭待收尾队列: 本次收尾完成，当前剩余 $auto_pending_after 个。"
fi

if [[ -f "$SOLO_ROOT/update.py" ]]; then
  one_row_workbook="$(
    PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}" python3 - "$@" <<'PY'
import argparse
import json
import sys
from pathlib import Path

from manual_lib import latest_manual_run_dir

HEADERS = [
    "session_id",
    "轮次",
    "提示词",
    "任务类型",
    "业务领域",
    "修改范围",
    "任务是否完成",
    "产物及过程是否满意",
    "不满意原因",
    "远端Github地址",
    "github地址",
    "commit id",
    "分支文件夹",
    "截图",
    "日志轨迹",
]

parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("idea_id", nargs="?")
parser.add_argument("--run-dir")
parser.add_argument("--round-name")
parser.add_argument("--session-timeout")
parser.add_argument("--commit-timeout")
parser.add_argument("--trajectory-timeout")
args, _ = parser.parse_known_args(sys.argv[1:])

if not args.idea_id:
    raise SystemExit("缺少项目 ID，无法生成本次飞书单行同步文件。")

run_dir = Path(args.run_dir).expanduser().resolve() if args.run_dir else latest_manual_run_dir(args.idea_id)
if not run_dir or not run_dir.exists():
    raise SystemExit(f"找不到 {args.idea_id} 的 run 目录，无法生成本次飞书单行同步文件。")

final_row_path = run_dir / "manual_final_row.json"
if not final_row_path.exists():
    raise SystemExit(f"找不到本次收尾结果: {final_row_path}")

row = json.loads(final_row_path.read_text(encoding="utf-8"))
row["分支文件夹"] = f"pro3/{args.idea_id}"

try:
    from openpyxl import Workbook
except Exception as exc:
    raise SystemExit(f"生成飞书单行同步文件需要 openpyxl: {exc}") from exc

output_path = run_dir / "feishu_update_current_row.xlsx"
wb = Workbook()
ws = wb.active
ws.title = "solo质检"
ws.append(HEADERS)
ws.append([row.get(header, "") for header in HEADERS])
wb.save(output_path)
wb.close()
print(output_path)
PY
  )"
  if [[ -n "$one_row_workbook" && -f "$one_row_workbook" ]]; then
    echo "检测到 update.py，开始同步本次收尾单行到飞书: $one_row_workbook"
    python3 "$SOLO_ROOT/update.py" "$one_row_workbook"
  fi
fi
