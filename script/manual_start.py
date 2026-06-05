#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

from manual_lib import ROOT, RUNS_DIR, idea_history_hash, load_runner, load_state, now, save_state, update_started_entry


def workspace_idea_ids() -> set[str]:
    workspace_root = ROOT / "workspaces"
    if not workspace_root.exists():
        return set()
    return {path.name for path in workspace_root.iterdir() if path.is_dir()}


def select_ideas_in_order(ideas: list, cursor: int, count: int) -> tuple[list, int, str, list[str]]:
    total = len(ideas)
    if cursor < total:
        selected = ideas[cursor: min(total, cursor + count)]
        if len(selected) == count or cursor + len(selected) < total:
            return selected, cursor + len(selected), "sequential", []

        existing = workspace_idea_ids() | {idea.idea_id for idea in selected}
        missing = [idea for idea in ideas if idea.idea_id not in existing]
        selected.extend(missing[:count - len(selected)])
        mode = "sequential_then_backfill" if missing else "sequential"
        return selected, total, mode, [idea.idea_id for idea in missing]

    existing = workspace_idea_ids()
    missing = [idea for idea in ideas if idea.idea_id not in existing]
    selected = missing[:count]
    return selected, total, "backfill_missing", [idea.idea_id for idea in missing]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="手动批量启动 Trae SOLO Coder 项目。")
    parser.add_argument("count", type=int, help="本次从 idea_history.md 顺序取多少个项目。")
    parser.add_argument("--no-cli", action="store_true", help="只打开 Trae，不调用 send-prompt-gui。")
    parser.add_argument("--continue-on-failure", action="store_true", help="启动失败后仍继续尝试后续项目。默认失败即停，避免连续打开空 Trae 窗口。")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.count <= 0:
        raise SystemExit("count 必须大于 0，例如: script/start.sh 4")

    runner = load_runner()
    ideas = runner.parse_ideas(ROOT / "idea_history.md")
    if not ideas:
        raise SystemExit("idea_history.md 里没有可启动的项目。")

    current_history_hash = idea_history_hash()
    state = load_state()
    cursor = int(state.get("next_index") or 0)
    if state.get("history_hash") != current_history_hash:
        cursor = 0

    selected, next_cursor, selection_mode, missing_ids = select_ideas_in_order(ideas, cursor, args.count)
    if not selected:
        if selection_mode == "backfill_missing":
            print("idea_history.md 已按顺序取完，回看 workspaces 后也没有发现遗漏项目。")
        else:
            print("没有可启动的新项目了。")
        return 0

    if selection_mode == "backfill_missing":
        print(f"idea_history.md 已按顺序取完，正在按 workspaces 缺口补漏: {', '.join(idea.idea_id for idea in selected)}")
    elif selection_mode == "sequential_then_backfill":
        print(f"本次会先取完顺序题，再按 workspaces 缺口补漏，实际启动: {', '.join(idea.idea_id for idea in selected)}")

    state["history_hash"] = current_history_hash
    state.setdefault("entries", [])
    failures: list[str] = []
    stop_after_state_save = False

    for offset, idea in enumerate(selected, start=1):
        prompt, prompt_source = runner.prompt_from_idea(idea)
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        run_dir = RUNS_DIR / f"{timestamp}-{idea.idea_id}"
        workspace = ROOT / "workspaces" / idea.idea_id
        run_dir.mkdir(parents=True, exist_ok=True)
        workspace.mkdir(parents=True, exist_ok=True)

        trace = runner.Trace(run_dir)
        (run_dir / "prompt.txt").write_text(prompt, encoding="utf-8")
        (run_dir / "idea.json").write_text(json.dumps({
            "idea_id": idea.idea_id,
            "title": idea.title,
            "fields": idea.fields,
            "prompt_source": prompt_source,
            "workspace": str(workspace),
            "manual": True,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
        trace.write("manual_start_selected", idea_id=idea.idea_id, title=idea.title, prompt_source=prompt_source)

        try:
            with runner.trae_window_lock(trace, "manual_prompt_send"):
                runner.start_trae_chat(trace, workspace, prompt, use_cli=not args.no_cli)
                time.sleep(4)
            trace.write("manual_prompt_handoff_ready", idea_id=idea.idea_id, run_dir=str(run_dir), workspace=str(workspace))
            update_started_entry(
                idea.idea_id,
                title=idea.title,
                run_dir=str(run_dir),
                workspace=str(workspace),
                status="started",
                error="",
                go_error="",
                prompt_source=prompt_source,
                started_at=now(),
            )
            print(f"[{offset}/{len(selected)}] 已启动 {idea.idea_id}: {workspace}")
        except Exception as exc:
            trace.write("manual_start_failed", idea_id=idea.idea_id, error=str(exc))
            update_started_entry(
                idea.idea_id,
                title=idea.title,
                run_dir=str(run_dir),
                workspace=str(workspace),
                status="start_failed",
                error=str(exc),
                started_at=now(),
            )
            failures.append(f"{idea.idea_id}: {exc}")
            print(f"[{offset}/{len(selected)}] 启动失败 {idea.idea_id}: {exc}", file=sys.stderr)
            if not args.continue_on_failure:
                print("检测到启动失败，已停止后续批量启动，避免继续打开空 Trae 窗口。", file=sys.stderr)
                stop_after_state_save = True

        state = load_state()
        state["history_hash"] = current_history_hash
        state["next_index"] = min(next_cursor, cursor + offset) if selection_mode == "sequential" else next_cursor
        state["last_start"] = {
            "count": args.count,
            "finished_at": now(),
            "selection_mode": selection_mode,
            "missing_total": len(missing_ids),
        }
        save_state(state)
        if stop_after_state_save:
            break

    if selection_mode == "sequential":
        print(f"本次取题范围: {cursor + 1} - {next_cursor}，下次从第 {next_cursor + 1} 条继续。")
    elif selection_mode == "sequential_then_backfill":
        print(f"本次已取到题库末尾，实际启动项目: {', '.join(idea.idea_id for idea in selected)}。下次会继续检查 workspaces 是否还有遗漏。")
    else:
        print(f"本次补漏项目: {', '.join(idea.idea_id for idea in selected)}。下次仍会先检查 workspaces 是否还有遗漏。")
    if failures:
        print("失败项目:", "; ".join(failures), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
