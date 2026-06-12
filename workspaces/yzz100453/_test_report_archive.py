"""测试report和archive命令."""
import os, sys, io, shutil
from pathlib import Path

os.environ["TERM"] = "dumb"
os.environ["FORCE_COLOR"] = "0"
sys.path.insert(0, "src")

from rich.console import Console
import bid_checklist.reporter as reporter_module
alt_console = Console(force_terminal=False, width=120)
reporter_module.console = alt_console

from bid_checklist.config_loader import load_config
from bid_checklist.scanner import scan_directories
from bid_checklist.matcher import match_attachments
from bid_checklist.checker import run_all_checks
from bid_checklist.reporter import (
    export_pending_csv,
    export_summary_markdown,
    create_archive_directory,
)

cfg = load_config("test-config.yaml")
scan_dirs = [os.path.abspath(d) for d in cfg.scan_dirs]
files = scan_directories(scan_dirs, cfg, load_pdf=True)
results = match_attachments(cfg.attachments, files)
run_all_checks(results, cfg)

out_dir = Path("./test-report")
if out_dir.exists():
    shutil.rmtree(out_dir)
out_dir.mkdir(parents=True)

print("📤 导出待补CSV...", file=sys.stderr)
export_pending_csv(results, cfg, out_dir / "待补清单.csv")

print("📤 导出Markdown报告...", file=sys.stderr)
export_summary_markdown(results, cfg, files, out_dir / "完整报告.md")

print("📦 生成归档目录...", file=sys.stderr)
create_archive_directory(results, cfg, out_dir / "归档", copy=True)

print(f"\n✅ 完成！输出目录: {out_dir.resolve()}", file=sys.stderr)
for p in sorted(out_dir.rglob("*")):
    rel = p.relative_to(out_dir)
    if p.is_file():
        print(f"  📄 {rel} ({p.stat().st_size} bytes", file=sys.stderr)
    elif p.is_dir():
        print(f"  📁 {rel}/", file=sys.stderr)
