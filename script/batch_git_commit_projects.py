#!/usr/bin/env python3
"""Commit each first-level project directory and record commit IDs as CSV."""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from subprocess import CompletedProcess, run


CSV_FIELDS = ["project", "branch", "commit_id", "status", "timestamp"]


@dataclass
class GitResult:
    returncode: int
    stdout: str
    stderr: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Batch commit first-level project directories inside one parent Git "
            "repository, then record each commit ID in per-project CSV files."
        )
    )
    parser.add_argument(
        "--projects-dir",
        required=True,
        type=Path,
        help="Directory containing first-level project folders.",
    )
    parser.add_argument(
        "--csv-dir",
        required=True,
        type=Path,
        help="Directory where <project>.csv commit history files are written.",
    )
    parser.add_argument(
        "--message-template",
        default="batch commit: {project}",
        help="Commit message template. Supports {project} and {timestamp}.",
    )
    parser.add_argument(
        "--remote",
        default="origin",
        help="Git remote to push to after all commits. Default: origin.",
    )
    parser.add_argument(
        "--branch",
        help="Branch to push. Default: current branch.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print projects that would be processed without add/commit/push.",
    )
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue processing later projects after one project fails.",
    )
    parser.add_argument(
        "--include-clean",
        action="store_true",
        help="Record skipped_no_changes rows for projects without changes.",
    )
    return parser.parse_args()


def git(repo_root: Path, *args: str, check: bool = True) -> GitResult:
    completed: CompletedProcess[str] = run(
        ["git", *args],
        cwd=repo_root,
        text=True,
        capture_output=True,
        check=False,
    )
    result = GitResult(
        completed.returncode,
        completed.stdout.strip(),
        completed.stderr.strip(),
    )
    if check and result.returncode != 0:
        detail = result.stderr or result.stdout or f"git {' '.join(args)} failed"
        raise RuntimeError(detail)
    return result


def resolve_repo_root(start: Path) -> Path:
    completed: CompletedProcess[str] = run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=start,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(f"Cannot find Git repository for {start}: {detail}")
    return Path(completed.stdout.strip()).resolve()


def require_inside_repo(path: Path, repo_root: Path, label: str) -> Path:
    resolved = path.resolve()
    try:
        resolved.relative_to(repo_root)
    except ValueError as exc:
        raise RuntimeError(f"{label} must be inside Git repo {repo_root}: {resolved}") from exc
    return resolved


def relative_to_repo(path: Path, repo_root: Path) -> str:
    return path.resolve().relative_to(repo_root).as_posix()


def current_branch(repo_root: Path) -> str:
    branch = git(repo_root, "rev-parse", "--abbrev-ref", "HEAD").stdout
    if branch == "HEAD":
        raise RuntimeError("Current Git checkout is detached; check out a branch before running.")
    return branch


def project_dirs(projects_dir: Path, csv_dir: Path) -> list[Path]:
    projects: list[Path] = []
    csv_dir_resolved = csv_dir.resolve()
    for item in sorted(projects_dir.iterdir(), key=lambda path: path.name):
        if not item.is_dir() or item.name.startswith("."):
            continue
        if item.resolve() == csv_dir_resolved:
            continue
        projects.append(item)
    return projects


def has_changes(repo_root: Path, project_rel: str) -> bool:
    return bool(git(repo_root, "status", "--porcelain", "--", project_rel).stdout)


def timestamp_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def append_csv_row(
    csv_dir: Path,
    project: str,
    branch: str,
    commit_id: str,
    status: str,
    timestamp: str,
) -> None:
    csv_dir.mkdir(parents=True, exist_ok=True)
    csv_path = csv_dir / f"{project}.csv"
    write_header = not csv_path.exists() or csv_path.stat().st_size == 0
    with csv_path.open("a", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow(
            {
                "project": project,
                "branch": branch,
                "commit_id": commit_id,
                "status": status,
                "timestamp": timestamp,
            }
        )


def commit_project(
    repo_root: Path,
    project: Path,
    project_rel: str,
    branch: str,
    csv_dir: Path,
    message_template: str,
) -> str:
    stamp = timestamp_now()
    message = message_template.format(project=project.name, timestamp=stamp)
    git(repo_root, "add", "--", project_rel)
    git(repo_root, "commit", "-m", message, "--", project_rel)
    commit_id = git(repo_root, "rev-parse", "HEAD").stdout
    append_csv_row(csv_dir, project.name, branch, commit_id, "committed", stamp)
    return commit_id


def record_failure(csv_dir: Path, project: str, branch: str) -> None:
    append_csv_row(csv_dir, project, branch, "", "failed", timestamp_now())


def record_clean(csv_dir: Path, project: str, branch: str) -> None:
    append_csv_row(csv_dir, project, branch, "", "skipped_no_changes", timestamp_now())


def main() -> int:
    args = parse_args()
    projects_dir = args.projects_dir.resolve()
    if not projects_dir.is_dir():
        print(f"projects-dir does not exist or is not a directory: {projects_dir}", file=sys.stderr)
        return 2

    try:
        repo_root = resolve_repo_root(projects_dir)
        projects_dir = require_inside_repo(projects_dir, repo_root, "projects-dir")
        csv_dir = args.csv_dir.resolve()
        active_branch = current_branch(repo_root)
        branch = args.branch or active_branch
        if args.branch and args.branch != active_branch:
            raise RuntimeError(
                f"--branch must match current branch. Current: {active_branch}; requested: {args.branch}"
            )
        projects = project_dirs(projects_dir, csv_dir)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if not projects:
        print(f"No project directories found under {projects_dir}")
        return 0

    print(f"Git repo: {repo_root}")
    print(f"Projects dir: {projects_dir}")
    print(f"CSV dir: {args.csv_dir.resolve()}")
    print(f"Branch: {branch}")
    print(f"Projects: {len(projects)}")

    if args.dry_run:
        for project in projects:
            print(f"DRY-RUN would process: {project.name}")
        return 0

    committed_count = 0
    failed_count = 0
    csv_dir = args.csv_dir.resolve()
    csv_dir.mkdir(parents=True, exist_ok=True)

    for project in projects:
        project_rel = relative_to_repo(project, repo_root)
        try:
            if not has_changes(repo_root, project_rel):
                print(f"SKIP clean: {project.name}")
                if args.include_clean:
                    record_clean(csv_dir, project.name, branch)
                continue

            commit_id = commit_project(
                repo_root,
                project,
                project_rel,
                branch,
                csv_dir,
                args.message_template,
            )
            committed_count += 1
            print(f"COMMITTED {project.name}: {commit_id}")
        except Exception as exc:  # noqa: BLE001 - keep CLI resilient when requested.
            failed_count += 1
            print(f"FAILED {project.name}: {exc}", file=sys.stderr)
            if args.continue_on_error:
                record_failure(csv_dir, project.name, branch)
                continue
            return 1

    if committed_count == 0:
        print("No new commits created; skip push.")
        return 1 if failed_count else 0

    push_result = git(repo_root, "push", args.remote, branch, check=False)
    if push_result.returncode != 0:
        detail = push_result.stderr or push_result.stdout or "git push failed"
        print(f"PUSH FAILED: {detail}", file=sys.stderr)
        return 1

    print(f"PUSHED {committed_count} commit(s) to {args.remote}/{branch}")
    return 1 if failed_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
