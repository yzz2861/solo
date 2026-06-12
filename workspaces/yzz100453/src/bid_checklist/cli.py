"""CLI 入口：招投标附件清单器."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import List, Optional

import click
from rich.console import Console

from . import __version__
from .checker import run_all_checks
from .config_loader import load_config
from .matcher import AttachmentCheckResult, match_attachments
from .models import BidChecklistConfig
from .reporter import (
    create_archive_directory,
    export_pending_csv,
    export_summary_markdown,
    print_archive_suggestions,
    print_detailed_table,
    print_pending_by_owner,
    print_summary,
)
from .scanner import ScannedFile, scan_directories


console = Console()
_error_console = Console(stderr=True)


def _resolve_scan_dirs(config: BidChecklistConfig, cli_dirs: List[str]) -> List[Path]:
    """合并配置文件和CLI传入的扫描目录."""
    dirs = list(cli_dirs) + list(config.scan_dirs)
    if not dirs:
        dirs = ["."]
    return [Path(d).expanduser() for d in dirs]


def _load(config_path: str) -> BidChecklistConfig:
    try:
        return load_config(config_path)
    except FileNotFoundError as e:
        _error_console.print(f"[red]错误：[/]{e}")
        sys.exit(2)
    except Exception as e:
        _error_console.print(f"[red]配置解析失败：[/]{e}")
        sys.exit(2)


def _do_scan(
    cfg: BidChecklistConfig,
    scan_dirs: List[Path],
    load_pdf_text: bool = True,
) -> tuple:
    if not cfg.attachments:
        _error_console.print("[yellow]警告：[/]配置中未定义任何附件条目")
    files = scan_directories(scan_dirs, cfg, load_pdf=load_pdf_text)
    if not files:
        _error_console.print("[yellow]警告：[/]扫描目录中没有找到任何支持的文件")
    results = match_attachments(cfg.attachments, files)
    run_all_checks(results, cfg)
    return files, results


CONFIG_NEEDED_COMMANDS = {"scan", "report", "archive", None}


@click.group(
    help="招投标附件清单器：封标前附件核对 · 过期检查 · 盖章校验 · 待补清单",
    context_settings={"help_option_names": ["-h", "--help"]},
    invoke_without_command=True,
)
@click.version_option(__version__, "-V", "--version", prog_name="bid-checklist")
@click.option("-c", "--config", "config_path", required=False, default=None,
              type=click.Path(exists=False, dir_okay=False),
              help="附件清单 YAML 配置文件路径（init 命令可省略）")
@click.option("-d", "--scan-dir", "scan_dirs", multiple=True,
              help="扫描目录，可多次指定（覆盖配置文件中的目录）")
@click.option("-o", "--output-dir", default="./bid-report", show_default=True,
              type=click.Path(file_okay=False),
              help="报告/归档输出根目录")
@click.option("-v", "--verbose", is_flag=True, help="输出更多调试信息")
@click.pass_context
def main(ctx, config_path, scan_dirs, output_dir, verbose):
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config_path
    ctx.obj["scan_dirs"] = list(scan_dirs)
    ctx.obj["output_dir"] = output_dir
    ctx.obj["verbose"] = verbose

    cmd = ctx.invoked_subcommand
    if cmd in CONFIG_NEEDED_COMMANDS and not config_path:
        _error_console.print(
            "[red]错误：[/]此命令需要通过 [bold]-c/--config[/] 指定配置文件"
            f"（[bold]{cmd or 'scan'}）[/]"
        )
        _error_console.print("💡  首次使用可执行 [bold]bid-checklist init[/] 生成示例配置")
        sys.exit(2)

    if cmd is None:
        ctx.invoke(scan_cmd)


@main.command("scan", help="扫描本地资料并执行所有检查（默认命令）")
@click.option("--pending-only/--all", default=False,
              help="只显示有问题的项，默认显示全部明细")
@click.option("--no-owner-view", is_flag=True, help="不显示按负责人拆分视图")
@click.option("--no-archive-view", is_flag=True, help="不显示归档目录建议")
@click.pass_context
def scan_cmd(ctx, pending_only, no_owner_view, no_archive_view):
    cfg = _load(ctx.obj["config_path"])
    scan_dirs = _resolve_scan_dirs(cfg, ctx.obj["scan_dirs"])

    if ctx.obj["verbose"]:
        console.print(f"[dim]🔧 加载配置：[/]{ctx.obj['config_path']}")
        console.print(f"[dim]📂 扫描目录：[/]{', '.join(str(d) for d in scan_dirs)}")

    files, results = _do_scan(cfg, scan_dirs, load_pdf_text=True)

    print_summary(cfg, results, files)
    if not pending_only:
        print_detailed_table(results)
    if not no_owner_view:
        print_pending_by_owner(results, cfg)
    if not no_archive_view:
        print_archive_suggestions(results, cfg)

    _exit_code = 0
    for r in results:
        if r.issues and r.item.required:
            _exit_code = 1
            break
    if _exit_code:
        _error_console.print("\n[yellow]💡 提示：使用 [bold]bid-checklist report[/] 导出待补清单进行催办[/]")
    sys.exit(_exit_code)


@main.command("report", help="导出报告：待补CSV、完整Markdown")
@click.option("--csv/--no-csv", default=True, help="导出待补CSV")
@click.option("--markdown/--no-markdown", default=True, help="导出完整Markdown报告")
@click.option("--prefix", default=None, help="输出文件名前缀（默认用项目名）")
@click.pass_context
def report_cmd(ctx, csv, markdown, prefix):
    cfg = _load(ctx.obj["config_path"])
    scan_dirs = _resolve_scan_dirs(cfg, ctx.obj["scan_dirs"])
    files, results = _do_scan(cfg, scan_dirs, load_pdf_text=True)

    out_dir = Path(ctx.obj["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = prefix or cfg.project_name or "bid-checklist"

    ts = ""
    if ctx.obj["verbose"]:
        from datetime import datetime
        ts = "_" + datetime.now().strftime("%Y%m%d_%H%M%S")

    if csv:
        export_pending_csv(results, cfg, out_dir / f"{stem}_待补清单{ts}.csv")
    if markdown:
        export_summary_markdown(results, cfg, files, out_dir / f"{stem}_完整报告{ts}.md")

    console.print(f"\n✅ 报告输出目录：[bold]{out_dir.resolve()}[/]")


@main.command("archive", help="将匹配成功且无问题的文件整理到归档目录")
@click.option("--dest", default=None, help="归档目标目录（默认：<output-dir>/归档）")
@click.option("--link/--copy", default=False,
              help="使用硬链接代替复制（同分区可节省空间，默认复制）")
@click.option("--dry-run", is_flag=True, help="仅预览不实际复制")
@click.pass_context
def archive_cmd(ctx, dest, link, dry_run):
    cfg = _load(ctx.obj["config_path"])
    scan_dirs = _resolve_scan_dirs(cfg, ctx.obj["scan_dirs"])
    files, results = _do_scan(cfg, scan_dirs, load_pdf_text=True)

    if not dest:
        dest = str(Path(ctx.obj["output_dir"]) / "归档")

    dest_path = Path(dest).expanduser().resolve()
    console.print(f"📦 归档目标：[bold]{dest_path}[/]（{'预览' if dry_run else '执行'}）")

    if dry_run:
        print_archive_suggestions(results, cfg)
        return

    n = create_archive_directory(results, cfg, dest_path, copy=not link)
    if n == 0:
        _error_console.print("[yellow]暂无可归档文件（先处理待补清单）[/]")


@main.command("init", help="生成示例配置模板到当前目录")
@click.option("-f", "--force", is_flag=True, help="覆盖已存在的文件")
@click.argument("output", default="bid-checklist.yaml", required=False)
def init_cmd(output, force):
    target = Path(output)
    if target.exists() and not force:
        _error_console.print(f"[red]文件已存在：[/]{target}（加 -f 覆盖）")
        sys.exit(1)

    template = _get_template_yaml()
    target.write_text(template, encoding="utf-8")
    console.print(f"✅ 示例配置已生成：[bold]{target.resolve()}[/]")
    console.print("💡 编辑清单后执行：[bold]bid-checklist -c bid-checklist.yaml scan[/]")


def _get_template_yaml() -> str:
    return """# =========================================================
# 招投标附件清单器 配置模板
# =========================================================
project_name: "XX项目-技术标"              # 项目名（用于报告标题和归档文件名）
bid_deadline: "2026-07-15"                 # 封标/投标截止日（影响过期判断、即将过期告警）
default_owner: "张工"                       # 默认负责人（条目未指定时使用）
# 扫描目录（可多个，也可用命令行 -d 覆盖）
scan_dirs:
  - "./资料-营业执照"
  - "./资料-人员证书"
  - "./资料-业绩合同"
  - "./资料-盖章版标书"
# 最终版识别关键字（命中则优先选用）
final_keywords: ["最终版", "终稿", "定稿", "封标版", "final"]
# 草稿识别关键字（命中则降权）
draft_keywords: ["草稿", "draft", "未盖章", "草签", "初稿", "v0"]

# ============ 附件清单（从招标文件中照抄，补充关键字和负责人）============
attachments:
  # ---- 一、企业资质 ----
  - section: "一、企业资质"
    name: "营业执照"
    category: "营业执照"
    keywords: ["营业执照", "统一社会信用代码"]
    owner: "李总"
    expire_date: "2028-06-30"        # 证照有效期
    require_stamp: true              # 要求盖章
    expected_pages: 1

  - section: "一、企业资质"
    name: "法定代表人授权书"
    category: "授权书"
    keywords: ["授权委托书", "法定代表人", "授权书"]
    owner: "李总"
    authorized_person: "王小明"       # 要求出现的授权人姓名（自动比对）
    require_stamp: true
    expected_pages: 2

  # ---- 二、人员证书 ----
  - section: "二、人员证书"
    name: "项目经理-建造师证书"
    category: "人员证书"
    keywords: ["建造师", "项目经理", "一级建造师"]
    owner: "张工"
    expire_date: "2027-12-31"
    expected_pages: 2

  - section: "二、人员证书"
    name: "项目经理-安全生产考核B证"
    category: "人员证书"
    keywords: ["安全生产考核", "B证", "安全员B"]
    owner: "张工"
    expire_date: "2026-08-31"

  - section: "二、人员证书"
    name: "技术负责人-高级工程师职称"
    category: "人员证书"
    keywords: ["高级工程师", "职称证", "技术负责人"]
    owner: "张工"

  # ---- 三、业绩合同 ----
  - section: "三、业绩合同"
    name: "业绩合同1-XX广场"
    category: "业绩合同"
    keywords: ["XX广场", "合同", "协议书"]
    owner: "王经理"
    page_range: "20-60"              # 页数范围
    require_stamp: true

  - section: "三、业绩合同"
    name: "业绩合同2-YY大厦"
    category: "业绩合同"
    keywords: ["YY大厦", "合同"]
    owner: "王经理"
    page_range: "+15"                # 页数 >= 15
    require_stamp: true

  # ---- 四、盖章版标书 ----
  - section: "四、盖章版标书"
    name: "技术标-盖章版PDF"
    category: "盖章版PDF"
    keywords: ["技术标", "盖章", "最终版"]
    owner: "张工"
    require_stamp: true
    page_range: "80-120"

  - section: "四、盖章版标书"
    name: "商务标-盖章版PDF"
    category: "盖章版PDF"
    keywords: ["商务标", "盖章", "最终版"]
    owner: "李总"
    require_stamp: true
"""


if __name__ == "__main__":
    main()
