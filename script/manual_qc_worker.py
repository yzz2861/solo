#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from manual_lib import (
    LOG_DIR,
    ROOT,
    read_json,
    read_text_if_exists,
    result_screenshot_path,
    table_text,
    update_started_entry,
    upsert_manual_table,
    write_run_marker,
    write_json,
    load_runner,
)


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="手动收尾后台质检 worker。")
    parser.add_argument("idea_id")
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--round-name", default="第一轮")
    parser.add_argument("--precheck-only", action="store_true", help="只提前执行发布和 Codex 质检，缓存结果，不写最终表。")
    parser.add_argument("--sync-feishu", action="store_true", help="完成最终表后同步当前行到飞书；auto_finish detach 模式使用。")
    return parser.parse_args()


def write_status(run_dir: Path, stage: str, **data: Any) -> None:
    write_json(run_dir / "manual_qc_status.json", {"stage": stage, "updated_at": now(), **data})


def write_pre_qc_status(run_dir: Path, stage: str, **data: Any) -> None:
    write_json(run_dir / "manual_pre_qc_status.json", {"stage": stage, "updated_at": now(), **data})


FEISHU_UPDATE_HEADERS = [
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
    "分支文件夹",
    "截图",
    "日志轨迹",
]


def write_feishu_update_workbook(run_dir: Path, row: dict[str, str]) -> Path:
    try:
        from openpyxl import Workbook
    except Exception as exc:
        raise RuntimeError(f"生成飞书单行同步文件需要 openpyxl: {exc}") from exc

    output_path = run_dir / "feishu_update_current_row.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.title = "solo质检"
    ws.append(FEISHU_UPDATE_HEADERS)
    ws.append([row.get(header, "") for header in FEISHU_UPDATE_HEADERS])
    wb.save(output_path)
    wb.close()
    return output_path


def sync_current_row_to_feishu(run_dir: Path, row: dict[str, str], trace: Any) -> dict[str, Any]:
    update_py = ROOT / "update.py"
    if not update_py.exists():
        trace.write("manual_worker_feishu_sync_skipped", reason="missing_update_py", path=str(update_py))
        return {"status": "skipped", "reason": "missing_update_py"}

    workbook = write_feishu_update_workbook(run_dir, row)
    trace.write("manual_worker_feishu_sync_start", workbook=str(workbook))
    print(f"检测到 auto_finish detach 模式，开始同步本次收尾单行到飞书: {workbook}", flush=True)
    proc = subprocess.run(
        [sys.executable, str(update_py), str(workbook)],
        cwd=str(ROOT),
        text=True,
        capture_output=True,
    )
    if proc.stdout:
        print(proc.stdout, end="" if proc.stdout.endswith("\n") else "\n", flush=True)
    if proc.stderr:
        print(proc.stderr, end="" if proc.stderr.endswith("\n") else "\n", file=sys.stderr, flush=True)
    result = {
        "status": "done" if proc.returncode == 0 else "failed",
        "returncode": proc.returncode,
        "workbook": str(workbook),
    }
    trace.write("manual_worker_feishu_sync_done", **result)
    if proc.returncode != 0:
        raise RuntimeError(f"飞书同步失败，退出码 {proc.returncode}，同步文件: {workbook}")
    return result


def publish_with_codex_recovery(
    runner: Any,
    trace: Any,
    run_dir: Path,
    workspace: Path,
    idea_id: str,
    round_name: str,
    status_writer: Any = write_status,
    mark_push_recovery_status: bool = True,
) -> dict[str, str]:
    branch_name = runner.publish_branch_for_round(round_name, idea_id=idea_id)

    def update_publish_progress(stage: str, **data: Any) -> None:
        data.setdefault("publish_branch", branch_name)
        status_writer(run_dir, stage, **data)

    status_writer(run_dir, "publish_start", publish_branch=branch_name)
    try:
        return runner.publish_workspace_to_github(
            trace,
            run_dir,
            workspace,
            idea_id,
            branch_name=branch_name,
            status_update=update_publish_progress,
        )
    except Exception as first_error:
        if not runner.is_github_push_failure(first_error):
            raise

        trace.write("manual_publish_first_attempt_failed", error=str(first_error))
        if mark_push_recovery_status:
            update_started_entry(idea_id, status="push_failed_codex_recovery", error=str(first_error), updated_at=now())
        else:
            update_started_entry(idea_id, pre_qc_status="push_failed_codex_recovery", pre_qc_error=str(first_error), updated_at=now())
        status_writer(run_dir, "push_failed_codex_recovery", publish_branch=branch_name, error=str(first_error))
        recovery = runner.run_codex_push_recovery(trace, run_dir, workspace, idea_id, first_error, branch_name=branch_name)

        status_writer(
            run_dir,
            "publish_retry_after_codex_recovery",
            publish_branch=branch_name,
            error=str(first_error),
            codex_push_recovery_status=recovery["status"],
            codex_push_recovery_report=recovery["report_path"],
        )
        try:
            result = runner.publish_workspace_to_github(
                trace,
                run_dir,
                workspace,
                idea_id,
                branch_name=branch_name,
                status_update=update_publish_progress,
            )
            trace.write("manual_publish_retry_after_codex_recovery_done", **result, recovery=recovery)
            return result
        except Exception as second_error:
            message = (
                f"Git push 自动恢复后仍失败：{second_error}；"
                f"Codex 恢复报告: {recovery['report_path']}；"
                f"stdout: {recovery['stdout_path']}；stderr: {recovery['stderr_path']}"
            )
            trace.write("manual_publish_retry_after_codex_recovery_failed", error=str(second_error), recovery=recovery)
            print(runner.red_text(message), flush=True)
            raise RuntimeError(message) from second_error


def workspace_snapshot(workspace: Path) -> str:
    files: list[str] = []
    if workspace.exists():
        for path in sorted(p for p in workspace.rglob("*") if p.is_file()):
            if any(part in {".git", "node_modules", "__pycache__", ".venv", "venv"} for part in path.parts):
                continue
            try:
                rel = path.relative_to(workspace)
            except ValueError:
                rel = path
            files.append(str(rel))
            if len(files) >= 120:
                break
    return "\n".join(["# Workspace Snapshot", "", *(f"- {item}" for item in files), ""])


def trajectory_matches_workspace(text: str, workspace: Path) -> bool:
    if not text.strip():
        return False
    workspace_text = str(workspace)
    if workspace_text in text:
        return True
    # If the copied trace names another Solo workspace explicitly, do not let it
    # pollute the final table. Some manual copies can come from the wrong Trae tab.
    return not bool(re.search(r"/workspaces/[^/\\s`]+", text))


def valid_pre_qc_result(run_dir: Path) -> dict[str, Any] | None:
    data = read_json(run_dir / "manual_pre_qc_result.json", {})
    if not isinstance(data, dict) or data.get("stage") != "done":
        return None
    report_text = str(data.get("qa_report_path") or "").strip()
    if not report_text:
        return None
    report_path = Path(report_text)
    if not report_path.exists() or report_path.stat().st_size <= 0:
        return None
    publish_result = data.get("publish_result")
    if not isinstance(publish_result, dict):
        return None
    required = ("status", "commit", "remote", "branch")
    if any(key not in publish_result for key in required):
        return None
    return data


def normalized_publish_result(value: Any) -> dict[str, str]:
    data = value if isinstance(value, dict) else {}
    return {
        "status": str(data.get("status") or ""),
        "commit": str(data.get("commit") or ""),
        "remote": str(data.get("remote") or ""),
        "branch": str(data.get("branch") or ""),
    }


def wait_for_pre_qc_result_if_running(run_dir: Path, trace: Any, timeout_seconds: int = 1800) -> dict[str, Any] | None:
    existing = valid_pre_qc_result(run_dir)
    if existing:
        return existing
    status = read_json(run_dir / "manual_pre_qc_status.json", {})
    if not isinstance(status, dict):
        return None
    stage = str(status.get("stage") or "")
    if not stage or stage in {"done", "failed"}:
        return None

    trace.write("manual_pre_qc_wait_start", stage=stage, timeout_seconds=timeout_seconds)
    deadline = time.time() + timeout_seconds
    last_stage = stage
    while time.time() < deadline:
        existing = valid_pre_qc_result(run_dir)
        if existing:
            trace.write("manual_pre_qc_wait_done", result_path=str(run_dir / "manual_pre_qc_result.json"))
            return existing
        status = read_json(run_dir / "manual_pre_qc_status.json", {})
        stage = str(status.get("stage") or "") if isinstance(status, dict) else ""
        if stage and stage != last_stage:
            write_status(run_dir, "waiting_pre_qc_result", pre_qc_stage=stage)
            trace.write("manual_pre_qc_wait_stage", stage=stage)
            last_stage = stage
        if stage == "failed":
            trace.write("manual_pre_qc_wait_failed", error=str(status.get("error") or ""))
            return None
        time.sleep(5)
    trace.write("manual_pre_qc_wait_timeout", timeout_seconds=timeout_seconds)
    return None


def run_pre_qc_only(runner: Any, idea_id: str, run_dir: Path, workspace: Path, round_name: str, trace: Any) -> int:
    existing = valid_pre_qc_result(run_dir)
    if existing:
        trace.write("manual_pre_qc_existing_result_reused", result_path=str(run_dir / "manual_pre_qc_result.json"))
        write_pre_qc_status(
            run_dir,
            "done",
            qa_report_path=str(existing.get("qa_report_path") or ""),
            qa_status=str(existing.get("qa_status") or ""),
            reused=True,
        )
        return 0

    try:
        write_pre_qc_status(run_dir, "starting", idea_id=idea_id, round_name=round_name, workspace=str(workspace))
        output_path = run_dir / "manual_workspace_snapshot.md"
        if not output_path.exists():
            output_path.write_text(workspace_snapshot(workspace), encoding="utf-8")

        publish_result = publish_with_codex_recovery(
            runner,
            trace,
            run_dir,
            workspace,
            idea_id,
            round_name,
            status_writer=write_pre_qc_status,
            mark_push_recovery_status=False,
        )

        reused_qa = runner.reuse_existing_codex_quality_check(trace, run_dir)
        if reused_qa:
            qa_report_path, qa_status = reused_qa
            write_pre_qc_status(
                run_dir,
                "reuse_codex_quality_check",
                qa_report_path=str(qa_report_path) if qa_report_path else "",
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_commit=publish_result["commit"],
                git_remote=publish_result["remote"],
                git_branch=publish_result["branch"],
            )
        else:
            def update_qa_progress(stage: str, **data: Any) -> None:
                write_pre_qc_status(
                    run_dir,
                    stage,
                    git_status=publish_result["status"],
                    git_commit=publish_result["commit"],
                    git_remote=publish_result["remote"],
                    git_branch=publish_result["branch"],
                    **data,
                )

            qa_report_path, qa_status = runner.run_codex_quality_check(
                trace,
                run_dir,
                workspace,
                idea_id,
                round_name=round_name,
                status_update=update_qa_progress,
            )

        if not qa_report_path or not qa_report_path.exists():
            message = f"预质检未生成 Codex 报告，qa_status={qa_status}"
            trace.write("manual_pre_qc_report_missing", error=message)
            write_pre_qc_status(
                run_dir,
                "failed",
                error=message,
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_commit=publish_result["commit"],
                git_remote=publish_result["remote"],
                git_branch=publish_result["branch"],
            )
            update_started_entry(idea_id, pre_qc_status="failed", pre_qc_error=message, pre_qc_finished_at=now())
            raise RuntimeError(message)

        verdict = runner.qa_verdict_from_report(qa_report_path, qa_status)
        qa_summary = runner.first_line(qa_report_path.read_text(encoding="utf-8", errors="ignore"), 500)
        payload = {
            "stage": "done",
            "mode": "precheck_only",
            "idea_id": idea_id,
            "round_name": round_name,
            "workspace": str(workspace),
            "run_dir": str(run_dir),
            "output_path": str(output_path),
            "qa_report_path": str(qa_report_path),
            "qa_status": qa_status,
            "qa_summary": qa_summary,
            "verdict": verdict,
            "publish_result": publish_result,
            "created_at": now(),
            "updated_at": now(),
        }
        write_json(run_dir / "manual_pre_qc_result.json", payload)
        write_run_marker(
            run_dir,
            "pre_qc_marker.json",
            {
                "idea_id": idea_id,
                "workspace": str(workspace),
                "round_name": round_name,
                "pre_qc_status": "done",
                "qa_report_path": str(qa_report_path),
                "git_status": publish_result["status"],
                "git_commit": publish_result["commit"],
                "git_remote": publish_result["remote"],
                "git_branch": publish_result["branch"],
            },
        )
        write_pre_qc_status(
            run_dir,
            "done",
            qa_report_path=str(qa_report_path),
            qa_status=qa_status,
            git_status=publish_result["status"],
            git_commit=publish_result["commit"],
            git_remote=publish_result["remote"],
            git_branch=publish_result["branch"],
        )
        update_started_entry(
            idea_id,
            pre_qc_status="done",
            pre_qc_error="",
            pre_qc_report_path=str(qa_report_path),
            pre_qc_result_path=str(run_dir / "manual_pre_qc_result.json"),
            pre_qc_git_status=publish_result["status"],
            pre_qc_git_commit=publish_result["commit"],
            pre_qc_git_remote=publish_result["remote"],
            pre_qc_git_branch=publish_result["branch"],
            pre_qc_finished_at=now(),
        )
        print(json.dumps({
            "idea_id": idea_id,
            "round_name": round_name,
            "pre_qc_status": "done",
            "qa_report_path": str(qa_report_path),
            "git_status": publish_result["status"],
        }, ensure_ascii=False))
        return 0
    except Exception as exc:
        trace.write("manual_pre_qc_failed", error=str(exc))
        write_pre_qc_status(run_dir, "failed", error=str(exc))
        update_started_entry(idea_id, pre_qc_status="failed", pre_qc_error=str(exc), pre_qc_finished_at=now())
        raise


def main() -> int:
    args = parse_args()
    runner = load_runner()
    idea_id = args.idea_id
    run_dir = Path(args.run_dir).resolve()
    workspace = Path(args.workspace).resolve()
    trace = runner.Trace(run_dir)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    if args.precheck_only:
        return run_pre_qc_only(runner, idea_id, run_dir, workspace, args.round_name, trace)

    prior_status_data = read_json(run_dir / "manual_qc_status.json", {})

    try:
        manual_trajectory_path = run_dir / "trae_manual_trajectory.md"
        if manual_trajectory_path.exists():
            write_status(run_dir, "use_manual_trajectory")
            trace.write("manual_trajectory_reused", path=str(manual_trajectory_path), chars=manual_trajectory_path.stat().st_size)
        else:
            write_status(run_dir, "extract_trajectory")
            runner.extract_trae_trajectory(run_dir, workspace, trace)

        output_path = run_dir / "manual_workspace_snapshot.md"
        if not output_path.exists():
            output_path.write_text(workspace_snapshot(workspace), encoding="utf-8")
        runner.extract_trae_trajectory(run_dir, workspace, trace)

        prior_error = str(prior_status_data.get("error") or "")
        pre_qc_result = wait_for_pre_qc_result_if_running(run_dir, trace)
        if pre_qc_result:
            publish_result = normalized_publish_result(pre_qc_result.get("publish_result"))
            qa_report_path = Path(str(pre_qc_result.get("qa_report_path") or ""))
            qa_status = str(pre_qc_result.get("qa_status") or "success")
            trace.write(
                "manual_pre_qc_result_reused_for_finish",
                result_path=str(run_dir / "manual_pre_qc_result.json"),
                qa_report_path=str(qa_report_path),
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_branch=publish_result["branch"],
            )
            write_status(
                run_dir,
                "reuse_pre_qc_result",
                qa_report_path=str(qa_report_path),
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_commit=publish_result["commit"],
                git_remote=publish_result["remote"],
                git_branch=publish_result["branch"],
            )
        else:
            reuse_qa_after_publish = runner.run_had_push_failure(run_dir)
            publish_result = publish_with_codex_recovery(runner, trace, run_dir, workspace, idea_id, args.round_name)

            reuse_qa_after_missing_report = "Codex 质检未生成报告" in prior_error
            reused_qa = (
                runner.reuse_existing_codex_quality_check(trace, run_dir)
                if reuse_qa_after_publish or reuse_qa_after_missing_report
                else None
            )
            if reused_qa:
                write_status(
                    run_dir,
                    "reuse_codex_quality_check",
                    git_status=publish_result["status"],
                    git_commit=publish_result["commit"],
                    git_remote=publish_result["remote"],
                    git_branch=publish_result["branch"],
                )
                qa_report_path, qa_status = reused_qa
            else:
                write_status(
                    run_dir,
                    "quality_check_solo_skill",
                    git_status=publish_result["status"],
                    git_commit=publish_result["commit"],
                    git_remote=publish_result["remote"],
                    git_branch=publish_result["branch"],
                )
                trace.write(
                    "manual_qc_policy",
                    skill="solo质检",
                    satisfaction_source="script_mapping_from_completion_verdict",
                    readme_missing_policy="not_failure_by_itself",
                    reason_path_policy="workspace_relative_paths_only",
                )
                def update_qa_progress(stage: str, **data: Any) -> None:
                    write_status(
                        run_dir,
                        stage,
                        git_status=publish_result["status"],
                        git_commit=publish_result["commit"],
                        git_remote=publish_result["remote"],
                        git_branch=publish_result["branch"],
                        **data,
                    )

                qa_report_path, qa_status = runner.run_codex_quality_check(
                    trace,
                    run_dir,
                    workspace,
                    idea_id,
                    round_name=args.round_name,
                    status_update=update_qa_progress,
                )
        if not qa_report_path or not qa_report_path.exists():
            message = f"Codex 质检未生成报告，qa_status={qa_status}"
            trace.write("manual_qc_report_missing", error=message)
            write_status(
                run_dir,
                "failed",
                error=message,
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_commit=publish_result["commit"],
                git_remote=publish_result["remote"],
                git_branch=publish_result["branch"],
            )
            update_started_entry(idea_id, status="qc_failed", error=message, finished_at=now())
            raise RuntimeError(message)
        verdict = runner.qa_verdict_from_report(qa_report_path, qa_status)
        qa_summary = ""
        if qa_report_path and qa_report_path.exists():
            qa_summary = runner.first_line(qa_report_path.read_text(encoding="utf-8", errors="ignore"), 500)

        idea_data = read_json(run_dir / "idea.json", {})
        fields = idea_data.get("fields") if isinstance(idea_data.get("fields"), dict) else {}
        prompt_text = read_text_if_exists(run_dir / "prompt.txt").strip()
        session_id = read_text_if_exists(run_dir / runner.idea_session_filename(idea_id)).strip()
        transcript_path = run_dir / "trae_full_transcript.md"
        trajectory_path = run_dir / "trae_trajectory.md"
        preferred_trajectory_path = manual_trajectory_path if manual_trajectory_path.exists() else trajectory_path
        screenshot_path = result_screenshot_path(idea_id, args.round_name)
        trace_path = run_dir / "trace.jsonl"
        manual_trajectory_text = read_text_if_exists(manual_trajectory_path)
        if manual_trajectory_text and not trajectory_matches_workspace(manual_trajectory_text, workspace):
            trace.write(
                "manual_trajectory_workspace_mismatch_ignored",
                manual_trajectory_path=str(manual_trajectory_path),
                workspace=str(workspace),
            )
            manual_trajectory_text = ""
            preferred_trajectory_path = trajectory_path if trajectory_path.exists() else preferred_trajectory_path
        trajectory_text = (
            manual_trajectory_text
            or read_text_if_exists(transcript_path)
            or read_text_if_exists(trajectory_path)
        )

        row = {
            "idea_id": idea_id,
            "title": str(idea_data.get("title", "")),
            "轮次": args.round_name,
            "提示词": prompt_text,
            "任务类型": verdict.get("task_type") or runner.DEFAULT_TASK_TYPE,
            "业务领域": runner.normalize_business_domain(fields.get("业务领域") or fields.get("business_domain") or "Web前端"),
            "修改范围": runner.normalize_modification_scope(str(fields.get("修改范围") or fields.get("modification_scope") or "")),
            "任务是否完成": verdict["task_completed"],
            "产物及过程是否满意": verdict["satisfied"],
            "不满意原因": verdict["reason"],
            "远端Github地址": publish_result["remote"],
            "分支文件夹": publish_result["branch"],
            "截图": str(screenshot_path) if screenshot_path.exists() else "",
            "日志轨迹": table_text(trajectory_text),
            "流程状态": "qc_done",
            "流程日志": str(trace_path),
            "workspace": str(workspace),
            "run_dir": str(run_dir),
            "prompt_path": str(run_dir / "prompt.txt"),
            "output_path": str(output_path),
            "session_id": session_id,
            "screenshot_path": str(screenshot_path) if screenshot_path.exists() else "",
            "trajectory_path": str(preferred_trajectory_path) if preferred_trajectory_path.exists() else "",
            "manual_trajectory_path": str(manual_trajectory_path) if manual_trajectory_path.exists() else "",
            "full_transcript_path": str(transcript_path) if transcript_path.exists() else "",
            "qa_status": qa_status,
            "qa_report_path": str(qa_report_path) if qa_report_path else "",
            "qa_summary": qa_summary,
            "git_status": publish_result["status"],
            "git_commit": publish_result["commit"],
            "git_remote": publish_result["remote"],
            "git_branch": publish_result["branch"],
            "trace_path": str(trace_path),
            "updated_at": now(),
        }
        upsert_manual_table(row)
        workbook_path = runner.write_solo_qc_workbook(row, trace, append=args.round_name != "第一轮")
        row["workbook"] = str(workbook_path)
        write_json(run_dir / "manual_final_row.json", row)
        feishu_sync_result: dict[str, Any] = {}
        if args.sync_feishu:
            write_status(
                run_dir,
                "feishu_sync",
                qa_report_path=str(qa_report_path) if qa_report_path else "",
                workbook=str(workbook_path),
                qa_status=qa_status,
                git_status=publish_result["status"],
                git_commit=publish_result["commit"],
                git_remote=publish_result["remote"],
                git_branch=publish_result["branch"],
            )
            feishu_sync_result = sync_current_row_to_feishu(run_dir, row, trace)
        update_started_entry(
            idea_id,
            status="qc_done",
            finish_status="done",
            round_name=args.round_name,
            error="",
            qa_report_path=str(qa_report_path) if qa_report_path else "",
            workbook=str(workbook_path),
            finish_done_at=now(),
            finished_at=now(),
        )
        write_run_marker(
            run_dir,
            "finish_marker.json",
            {
                "idea_id": idea_id,
                "workspace": str(workspace),
                "round_name": args.round_name,
                "finish_status": "done",
                "qa_report_path": str(qa_report_path) if qa_report_path else "",
                "workbook": str(workbook_path),
                "git_status": publish_result["status"],
                "git_commit": publish_result["commit"],
                "git_remote": publish_result["remote"],
                "git_branch": publish_result["branch"],
                "feishu_sync": feishu_sync_result,
            },
        )
        write_status(
            run_dir,
            "done",
            qa_report_path=str(qa_report_path) if qa_report_path else "",
            workbook=str(workbook_path),
            qa_status=qa_status,
            git_status=publish_result["status"],
            git_commit=publish_result["commit"],
            git_remote=publish_result["remote"],
            git_branch=publish_result["branch"],
            feishu_sync=feishu_sync_result,
        )
        print(json.dumps({
            "idea_id": idea_id,
            "round_name": args.round_name,
            "qa_report_path": str(qa_report_path) if qa_report_path else "",
            "workbook": str(workbook_path),
            "qa_status": qa_status,
            "git_status": publish_result["status"],
        }, ensure_ascii=False))
        return 0
    except Exception as exc:
        trace.write("manual_qc_worker_failed", error=str(exc))
        current_status = read_json(run_dir / "manual_qc_status.json", {})
        current_stage = str(current_status.get("stage") or "")
        failure_status = "push_failed" if current_stage == "publish" or "Git push" in str(exc) or "push_failed" in str(exc) else "qc_failed"
        update_started_entry(idea_id, status=failure_status, finish_status="failed", error=str(exc), finished_at=now())
        write_run_marker(
            run_dir,
            "finish_marker.json",
            {
                "idea_id": idea_id,
                "workspace": str(workspace),
                "round_name": args.round_name,
                "finish_status": "failed",
                "status": failure_status,
                "error": str(exc),
            },
        )
        write_status(run_dir, "failed", error=str(exc))
        raise


if __name__ == "__main__":
    raise SystemExit(main())
