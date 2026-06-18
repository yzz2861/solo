from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import click
import yaml

from license_audit.auditor import run_audit
from license_audit.config import AppConfig
from license_audit.reporting import generate_all_reports


def _load_config_file(path: Optional[Path]) -> Dict[str, Any]:
    if not path or not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    if path.suffix in {".yaml", ".yml"}:
        return yaml.safe_load(text) or {}
    if path.suffix == ".json":
        return json.loads(text)
    if path.name in {"pyproject.toml"}:
        try:
            import tomli

            data = tomli.loads(text)
            return data.get("tool", {}).get("license-audit", {})
        except Exception:
            return {}
    return {}


@click.group()
@click.version_option(package_name="license-audit", prog_name="license-audit")
def main() -> None:
    """依赖许可证巡查工具。"""


@main.command()
@click.option(
    "--project",
    "-p",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="项目根目录，默认为当前目录。",
)
@click.option(
    "--config",
    "-c",
    "config_path",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="配置文件路径（.yaml/.yml/.json/pyproject.toml），默认在项目根搜索。",
)
@click.option(
    "--include-dev/--no-include-dev",
    default=None,
    help="是否纳入开发依赖，默认读取配置或不纳入。",
)
@click.option(
    "--check-artifacts/--no-check-artifacts",
    default=None,
    help="是否扫描构建产物，默认读取配置或开启。",
)
@click.option(
    "--output",
    "-o",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="报告输出目录，默认读取配置或 license-report/。",
)
@click.option(
    "--save-history/--no-save-history",
    default=True,
    help="是否保存本次快照用于下次对比，默认开启。",
)
@click.option(
    "--format",
    "-f",
    "report_format",
    type=click.Choice(["all", "markdown", "json", "csv"], case_sensitive=False),
    default="all",
    help="输出格式，默认 all。",
)
def audit(
    project: Optional[Path],
    config_path: Optional[Path],
    include_dev: Optional[bool],
    check_artifacts: Optional[bool],
    output: Optional[Path],
    save_history: bool,
    report_format: str,
) -> None:
    """执行依赖许可证巡查并生成报告。"""
    project_root = (project or Path.cwd()).resolve()

    data: Dict[str, Any] = {}
    if config_path is not None:
        data = _load_config_file(config_path)
    else:
        for candidate in [
            project_root / "license-audit.yaml",
            project_root / "license-audit.yml",
            project_root / "license-audit.json",
            project_root / "pyproject.toml",
            project_root / ".license-audit.yaml",
        ]:
            if candidate.exists():
                data = _load_config_file(candidate)
                break

    config = AppConfig.from_dict(data, project_root=project_root)
    if include_dev is not None:
        config.scan.include_dev_dependencies = include_dev
    if check_artifacts is not None:
        config.scan.check_build_artifacts = check_artifacts
    if output is not None:
        config.scan.output_dir = str(output.relative_to(project_root)) if output.is_absolute() and str(output).startswith(str(project_root)) else str(output)

    click.echo(f"▶ 扫描项目：{project_root}")
    report = run_audit(config, save_history=save_history)

    output_dir = project_root / config.scan.output_dir
    paths = generate_all_reports(report, output_dir)

    click.echo("")
    click.echo(f"✅  扫描完成：总依赖 {len(report.scan.packages)}，风险 {len(report.risks)}，合规 {len(report.approved)}")
    if report.new_risks_vs_baseline:
        click.echo(f"⚠️  新增风险：{len(report.new_risks_vs_baseline)}")
    if report.resolved_vs_baseline:
        click.echo(f"✅  已解决：{len(report.resolved_vs_baseline)}")
    click.echo("")
    click.echo("📄 研发报告：")
    for p in paths["dev"]:
        if report_format == "all" or (report_format == "markdown" and p.suffix == ".md") or (report_format == "json" and p.suffix == ".json") or (report_format == "csv" and p.suffix == ".csv"):
            click.echo(f"  - {p}")
    click.echo("⚖️  法务报告：")
    for p in paths["legal"]:
        if report_format == "all" or (report_format == "markdown" and p.suffix == ".md") or (report_format == "json" and p.suffix == ".json") or (report_format == "csv" and p.suffix == ".csv"):
            click.echo(f"  - {p}")

    if report.risks:
        sys.exit(1)


@main.command()
@click.option(
    "--project",
    "-p",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="项目根目录。",
)
def init_config(project: Optional[Path]) -> None:
    """在当前项目生成示例配置文件 license-audit.yaml。"""
    project_root = (project or Path.cwd()).resolve()
    target = project_root / "license-audit.yaml"
    if target.exists():
        click.echo(f"配置文件已存在：{target}")
        return
    content = """# 依赖许可证巡查工具配置

whitelist:
  # 合规许可证白名单（SPDX 标识符）
  licenses:
    - MIT
    - BSD-2-Clause
    - BSD-3-Clause
    - Apache-2.0
    - Python-2.0
    - PSF
    - ISC
    - Unlicense
    - CC0-1.0
    - Zlib
    - X11

  # 限制类许可证（视为高风险）
  restricted:
    - GPL-2.0
    - GPL-3.0
    - AGPL-3.0
    - LGPL-3.0
    - SSPL-1.0
    - EUPL-1.2
    - MPL-2.0

  # 存疑 / 未知类（需法务确认）
  uncertain:
    - UNKNOWN
    - Proprietary
    - Commercial

  # 特殊包例外（包名 -> 以哪个许可证作为判定依据）
  package_exceptions:
    # some-private-pkg: MIT

  # 扫描时忽略的包
  ignore_packages: []

  # 扫描时忽略的 npm scope（需带 @）
  ignore_scopes: []

scan:
  # 是否纳入开发依赖
  include_dev_dependencies: false

  # 是否扫描前端构建产物
  check_build_artifacts: true

  # 构建产物目录
  artifact_paths:
    - dist
    - build
    - out
    - .next
    - .nuxt

  # 需要尝试解析的锁文件
  lockfile_paths:
    - package-lock.json
    - yarn.lock
    - pnpm-lock.yaml
    - requirements.txt
    - Pipfile.lock
    - poetry.lock
    - pyproject.toml

  # 快照保存目录（用于历史对比）
  history_dir: .license-history

  # 报告输出目录
  output_dir: license-report
"""
    target.write_text(content, encoding="utf-8")
    click.echo(f"✅ 已生成示例配置：{target}")


if __name__ == "__main__":
    main()
