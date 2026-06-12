"""直接运行scan测试，输出到文件."""
import os, sys, io

os.environ["TERM"] = "dumb"
os.environ["FORCE_COLOR"] = "0"
sys.path.insert(0, "src")

from rich.console import Console
import bid_checklist.reporter as reporter_module
reporter_module.console = Console(force_terminal=False, width=120)

from bid_checklist.config_loader import load_config
from bid_checklist.scanner import scan_directories
from bid_checklist.matcher import match_attachments
from bid_checklist.checker import run_all_checks
from bid_checklist.reporter import (
    print_summary, print_detailed_table,
    print_pending_by_owner, print_archive_suggestions,
)

output_buf = io.StringIO()
alt_console = Console(file=output_buf, force_terminal=False, width=120)
reporter_module.console = alt_console

cfg = load_config("test-config.yaml")
scan_dirs = [os.path.abspath(d) for d in cfg.scan_dirs]
print(f"扫描目录: {scan_dirs}", file=sys.stderr)

files = scan_directories(scan_dirs, cfg, load_pdf=True)
print(f"找到 {len(files)} 个文件", file=sys.stderr)
for f in files:
    print(f"  - {f.name} (pages={f.page_count}, final={f.is_final}, draft={f.is_draft})", file=sys.stderr)

results = match_attachments(cfg.attachments, files)
print(f"\n匹配结果:", file=sys.stderr)
for r in results:
    f = r.matched_file.name if r.matched_file else "(none)"
    avg = max((c.avg_score() for c in r.candidates), default=0)
    print(f"  {r.item.name}: {f}  avg={avg:.0f}  status={r.status.value}", file=sys.stderr)
    for c in r.candidates[:4]:
        scores_str = ", ".join(f"{k}:{int(s)}" for k, s in c.scores)
        print(f"    候选 {c.file.name}: avg={c.avg_score():.0f} total={c.total_score:.0f} chosen={c.is_chosen}", file=sys.stderr)
        print(f"      命中分数: [{scores_str}]", file=sys.stderr)
        print(f"      PDF文本前200字: {(c.file.pdf_text_cache or '')[:150].replace(chr(10), ' ')}", file=sys.stderr)

run_all_checks(results, cfg)

print_summary(cfg, results, files)
print_detailed_table(results)
print_pending_by_owner(results, cfg)
print_archive_suggestions(results, cfg)

with open("/tmp/scan_result.txt", "w") as f:
    f.write(output_buf.getvalue())
print(f"\n✅ 结果已写入 /tmp/scan_result.txt", file=sys.stderr)
