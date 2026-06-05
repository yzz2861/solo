#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from manual_lib import (
    LOG_DIR,
    ROOT,
    idea_id_from_run_dir,
    latest_manual_run_dir,
    load_runner,
    next_auto_finish_candidate,
    now,
    read_json,
    read_text_if_exists,
    result_screenshot_path,
    round_number_to_name,
    table_text,
    update_started_entry,
    upsert_manual_table,
    wait_for_clipboard_text,
    wait_for_session_clipboard,
    write_run_marker,
    write_json,
)


SKIP_GIT_PUSH = os.environ.get("SOLO_SKIP_GIT_INTERACTION", os.environ.get("SOLO_SKIP_GIT_PUSH", "1")) != "0"


def red_text(text: str) -> str:
    return f"\033[31m{text}\033[0m"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="手动收尾指定 Trae SOLO Coder 项目。")
    parser.add_argument("idea_id", nargs="?", help="项目 ID，例如 zy10001；不传时自动选择最近已完成并由 go.sh 关闭、但还没收尾的项目。")
    parser.add_argument("--run-dir", help="指定 run 目录；默认使用 run_log/script/manual_state.json 中该项目最近一次 run。")
    parser.add_argument("--round-name", help="写入结果表的轮次；默认从 run 目录自动识别。")
    parser.add_argument("--session-timeout", type=int, default=600, help="等待剪贴板 sessionId 的秒数；0 表示一直等。默认 600。")
    parser.add_argument("--trajectory-timeout", type=int, default=600, help="等待剪贴板轨迹内容的秒数；0 表示一直等。默认 600。")
    parser.add_argument("--detach-after-capture", action="store_true", help="捕获 sessionId/轨迹并启动后台收尾后立即返回；auto_finish 专用。")
    return parser.parse_args()


def resolve_finish_target(args: argparse.Namespace) -> tuple[str, Path | None, str]:
    if args.idea_id:
        return str(args.idea_id), None, "explicit"
    if args.run_dir:
        run_dir = Path(args.run_dir).expanduser().resolve()
        idea_id = idea_id_from_run_dir(run_dir)
        if not idea_id:
            raise SystemExit(f"无法从 run 目录名推断项目 ID: {run_dir}")
        return idea_id, run_dir, "run_dir"
    candidate = next_auto_finish_candidate()
    if not candidate:
        raise SystemExit("没有找到可自动收尾的项目：需要 go.sh 标记为 completed_window_closed，且还没有跑过 finish。")
    idea_id = str(candidate.get("idea_id") or "")
    run_dir = Path(str(candidate.get("run_dir") or "")).resolve()
    if not idea_id or not run_dir.exists():
        raise SystemExit("自动收尾候选项目状态不完整，请显式传项目 ID。")
    return idea_id, run_dir, "auto_closed_queue"


def infer_round_name(run_dir: Path, explicit_round_name: str | None = None) -> str:
    if explicit_round_name:
        return explicit_round_name.strip()
    idea_data = read_json(run_dir / "idea.json", {})
    round_name = str(idea_data.get("round_name") or "").strip() if isinstance(idea_data, dict) else ""
    if round_name:
        return round_name
    match = re.search(r"-round(\d+)$", run_dir.name)
    if match:
        return round_number_to_name(int(match.group(1)))
    return "第一轮"


def build_capture_row(runner: object, idea_id: str, run_dir: Path, workspace: Path, session_id: str, round_name: str) -> dict[str, str]:
    idea_data = read_json(run_dir / "idea.json", {})
    fields = idea_data.get("fields") if isinstance(idea_data.get("fields"), dict) else {}
    manual_trajectory_path = run_dir / "trae_manual_trajectory.md"
    transcript_path = run_dir / "trae_full_transcript.md"
    trajectory_path = run_dir / "trae_trajectory.md"
    screenshot_path = result_screenshot_path(idea_id, round_name)
    preferred_trajectory_path = manual_trajectory_path if manual_trajectory_path.exists() else trajectory_path
    trajectory_text = (
        read_text_if_exists(manual_trajectory_path)
        or read_text_if_exists(transcript_path)
        or read_text_if_exists(trajectory_path)
    )
    return {
        "idea_id": idea_id,
        "title": str(idea_data.get("title", "")),
        "轮次": round_name,
        "提示词": read_text_if_exists(run_dir / "prompt.txt").strip(),
        "任务类型": runner.DEFAULT_TASK_TYPE,
        "业务领域": runner.normalize_business_domain(fields.get("业务领域") or fields.get("business_domain") or "Web前端"),
        "修改范围": runner.normalize_modification_scope(str(fields.get("修改范围") or fields.get("modification_scope") or "")),
        "任务是否完成": "",
        "产物及过程是否满意": "",
        "不满意原因": "",
        "远端Github地址": "",
        "分支文件夹": "",
        "截图": str(screenshot_path) if screenshot_path.exists() else "",
        "日志轨迹": table_text(trajectory_text),
        "流程状态": "captured_waiting_qc",
        "流程日志": str(run_dir / "trace.jsonl"),
        "workspace": str(workspace),
        "run_dir": str(run_dir),
        "prompt_path": str(run_dir / "prompt.txt"),
        "session_id": session_id,
        "screenshot_path": str(screenshot_path) if screenshot_path.exists() else "",
        "trajectory_path": str(preferred_trajectory_path) if preferred_trajectory_path.exists() else "",
        "manual_trajectory_path": str(manual_trajectory_path) if manual_trajectory_path.exists() else "",
        "full_transcript_path": str(transcript_path) if transcript_path.exists() else "",
        "qa_status": "pending",
        "qa_report_path": "",
        "qa_summary": "",
        "git_status": "skipped" if SKIP_GIT_PUSH else "",
        "git_commit": "",
        "git_remote": "",
        "git_branch": "",
        "updated_at": now(),
    }


def has_existing_capture(run_dir: Path) -> bool:
    capture_row = read_json(run_dir / "manual_capture_row.json", {})
    has_session = bool(str(capture_row.get("session_id") or "").strip()) or any(run_dir.glob("sessionId_*.txt"))
    return has_session and (run_dir / "trae_manual_trajectory.md").exists()


def should_resume_push_failure(run_dir: Path) -> bool:
    if SKIP_GIT_PUSH:
        return False
    status = read_json(run_dir / "manual_qc_status.json", {})
    error = str(status.get("error") or "")
    if status.get("stage") != "failed":
        return False
    if "Git push" not in error and "push_failed" not in error:
        return False
    return has_existing_capture(run_dir)


def choose_trajectory_text(runner: object, run_dir: Path, workspace: Path, trace: object, clipboard_text: str) -> tuple[str, Path, str]:
    manual_trajectory_path = run_dir / "trae_manual_trajectory.md"
    clipboard_text = clipboard_text.rstrip()
    if len(clipboard_text) >= 1000:
        return clipboard_text, manual_trajectory_path, "clipboard"

    trace.write("manual_trajectory_clipboard_too_short", chars=len(clipboard_text))
    runner.extract_trae_trajectory(run_dir, workspace, trace)
    extracted_candidates = [
        run_dir / "trae_full_transcript.md",
        run_dir / "trae_trajectory.md",
    ]
    best_path = None
    best_text = clipboard_text
    for path in extracted_candidates:
        text = read_text_if_exists(path).rstrip()
        if len(text) > len(best_text):
            best_text = text
            best_path = path
    if best_path and len(best_text) >= 1000:
        trace.write("manual_trajectory_replaced_from_logs", source=str(best_path), chars=len(best_text))
        return best_text, best_path, "log_extract"
    return clipboard_text, manual_trajectory_path, "clipboard_short"


def run_qc_worker(
    idea_id: str,
    run_dir: Path,
    workspace: Path,
    trace: object,
    *,
    resume: bool,
    round_name: str,
    detach_after_start: bool = False,
) -> int:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    worker_log = LOG_DIR / f"manual-qc-{idea_id}-{int(time.time())}.log"
    status_path = run_dir / "manual_qc_status.json"
    write_json(status_path, {"stage": "starting", "updated_at": now(), "resume": resume, "round_name": round_name})
    cmd = [
        sys.executable,
        str(Path(__file__).resolve().parent / "manual_qc_worker.py"),
        idea_id,
        "--run-dir",
        str(run_dir),
        "--workspace",
        str(workspace),
        "--round-name",
        round_name,
    ]
    if detach_after_start:
        cmd.append("--sync-feishu")
    worker_env = os.environ.copy()
    if SKIP_GIT_PUSH:
        worker_env["SOLO_SKIP_GIT_INTERACTION"] = "1"
        worker_env["SOLO_SKIP_GIT_PUSH"] = "1"
    with worker_log.open("a", encoding="utf-8") as f:
        proc = subprocess.Popen(cmd, cwd=str(ROOT), text=True, stdout=f, stderr=subprocess.STDOUT, start_new_session=True, env=worker_env)
    trace.write(
        "manual_qc_worker_started",
        pid=proc.pid,
        log=str(worker_log),
        cmd=" ".join(cmd),
        resume=resume,
        detached=detach_after_start,
        git_skipped=SKIP_GIT_PUSH,
    )
    if resume:
        print(f"本次质检轮次: {round_name}", flush=True)
        print(f"检测到 {idea_id} 上次卡在 Git push，已复用已有截图/轨迹/sessionId；本次只重试 push，成功后复用已有 Codex 质检并生成表格。", flush=True)
    else:
        print(f"本次质检轮次: {round_name}", flush=True)
        print(f"已完成截图/轨迹/sessionId 捕获，后续收尾不再依赖 Trae，可关闭 {idea_id} 窗口。", flush=True)
    if SKIP_GIT_PUSH:
        print("Git 推送/发布已按默认配置跳过。", flush=True)
    print(f"收尾后台日志: {worker_log}", flush=True)
    if detach_after_start:
        update_started_entry(
            idea_id,
            auto_finish_status="qc_worker_detached",
            auto_finish_worker_pid=proc.pid,
            auto_finish_worker_log=str(worker_log),
            auto_finish_detached_at=now(),
        )
        trace.write("manual_qc_worker_detached", pid=proc.pid, log=str(worker_log), sync_feishu=True)
        return 0

    last_stage = ""
    while proc.poll() is None:
        status = read_json(status_path, {})
        stage = str(status.get("stage") or "")
        if stage and stage != last_stage:
            print(f"收尾进度: {stage}", flush=True)
            last_stage = stage
        time.sleep(10)

    status = read_json(status_path, {})
    code = proc.returncode
    report_path = str(status.get("qa_report_path") or "")
    workbook = str(status.get("workbook") or "")
    if code == 0:
        print(f"收尾完成，本次质检轮次: {round_name}，报告路径: {report_path}", flush=True)
        if workbook:
            print(f"结果表路径: {workbook}", flush=True)
    else:
        print(red_text(f"收尾失败，退出码 {code}，日志: {worker_log}"), file=sys.stderr, flush=True)
        if status.get("error"):
            print(red_text(f"错误: {status['error']}"), file=sys.stderr, flush=True)
    return int(code or 0)


def main() -> int:
    args = parse_args()
    runner = load_runner()
    idea_id, selected_run_dir, selection_source = resolve_finish_target(args)
    run_dir = selected_run_dir or (Path(args.run_dir).resolve() if args.run_dir else latest_manual_run_dir(idea_id))
    if not run_dir or not run_dir.exists():
        raise SystemExit(f"找不到 {idea_id} 的手动 run 目录，请先用 script/start.sh 启动，或传 --run-dir。")

    round_name = infer_round_name(run_dir, args.round_name)
    workspace = ROOT / "workspaces" / idea_id
    workspace.mkdir(parents=True, exist_ok=True)
    trace = runner.Trace(run_dir)
    update_started_entry(
        idea_id,
        finish_status="running",
        finish_started_at=now(),
        finish_selection_source=selection_source,
        finish_run_dir=str(run_dir),
    )
    write_run_marker(
        run_dir,
        "finish_marker.json",
        {
            "idea_id": idea_id,
            "workspace": str(workspace),
            "round_name": round_name,
            "finish_status": "running",
            "selection_source": selection_source,
        },
    )
    trace.write("manual_finish_start", idea_id=idea_id, round_name=round_name, run_dir=str(run_dir), workspace=str(workspace), selection_source=selection_source)
    if selection_source == "auto_closed_queue":
        print(f"未指定项目 ID，自动选择已完成关闭队列里的 {idea_id}。", flush=True)
    print(f"准备收尾 {idea_id}，本次质检轮次: {round_name}", flush=True)

    if should_resume_push_failure(run_dir):
        trace.write("manual_finish_resume_push_failure", idea_id=idea_id, round_name=round_name, run_dir=str(run_dir), workspace=str(workspace))
        return run_qc_worker(idea_id, run_dir, workspace, trace, resume=True, round_name=round_name, detach_after_start=args.detach_after_capture)

    with runner.trae_window_lock(trace, "manual_finish_capture"):
        runner.open_trae_workspace_for_finish(trace, workspace, title_parts=[idea_id, workspace.name, str(workspace)])
        screenshot_path = result_screenshot_path(idea_id, round_name)
        screenshot_path.parent.mkdir(parents=True, exist_ok=True)
        runner.screenshot(screenshot_path)
        trace.write("manual_finish_screenshot_saved", path=str(screenshot_path))

    runner.set_clipboard("")
    trace.write("manual_clipboard_cleared", target="session_id")
    print(red_text(f"重要提醒：当前正在处理 {idea_id} 的 {round_name}，请找到这一轮对应的 sessionId 再复制；不要复制第一轮或列表里的第一个 sessionId。"), flush=True)
    print("请在 Trae 里双击对应轮次的 sessionId，让它进入剪贴板；脚本正在等待并会自动记录。", flush=True)
    try:
        session_id = wait_for_session_clipboard(runner, args.session_timeout, trace)
    except TimeoutError as exc:
        trace.write("manual_session_clipboard_timeout", timeout_seconds=args.session_timeout)
        raise SystemExit(f"等待 sessionId 超时；请重新运行 finish 脚本，并在 Trae 里双击 {round_name} 对应的 sessionId 后让脚本从剪贴板读取。") from exc

    session_file = runner.save_session_identifier(run_dir, idea_id, session_id, trace, source="manual_clipboard")

    runner.set_clipboard("")
    trace.write("manual_clipboard_cleared", target="trajectory")
    print("已记录 sessionId。请继续在 Trae 里双击轨迹/对话内容，让它进入剪贴板；脚本正在等待。", flush=True)
    trajectory_text = wait_for_clipboard_text(
        runner,
        args.trajectory_timeout,
        trace,
        initial_value="",
        min_chars=1000 if args.detach_after_capture else 1,
        event_name="manual_trajectory_clipboard_detected",
    )
    trajectory_text, trajectory_source_path, trajectory_source = choose_trajectory_text(runner, run_dir, workspace, trace, trajectory_text)
    manual_trajectory_path = run_dir / "trae_manual_trajectory.md"
    manual_trajectory_path.write_text(trajectory_text.rstrip() + "\n", encoding="utf-8")
    (run_dir / "trae_trajectory.md").write_text(trajectory_text.rstrip() + "\n", encoding="utf-8")
    write_json(
        run_dir / "manual_clipboard_capture.json",
        {
            "session_id": session_id,
            "session_file": str(session_file),
            "trajectory_path": str(manual_trajectory_path),
            "trajectory_chars": len(trajectory_text),
            "trajectory_source": trajectory_source,
            "trajectory_source_path": str(trajectory_source_path),
            "captured_at": now(),
        },
    )
    trace.write("manual_trajectory_saved", path=str(manual_trajectory_path), chars=len(trajectory_text))

    capture_row = build_capture_row(runner, idea_id, run_dir, workspace, session_id, round_name)
    upsert_manual_table(capture_row)
    write_json(run_dir / "manual_capture_row.json", capture_row)
    update_started_entry(
        idea_id,
        status="captured_waiting_qc",
        finish_status="captured_waiting_qc",
        round_name=round_name,
        run_dir=str(run_dir),
        workspace=str(workspace),
        session_file=str(session_file),
        trajectory_file=str(manual_trajectory_path),
        captured_at=now(),
    )

    return run_qc_worker(idea_id, run_dir, workspace, trace, resume=False, round_name=round_name, detach_after_start=args.detach_after_capture)


if __name__ == "__main__":
    raise SystemExit(main())
