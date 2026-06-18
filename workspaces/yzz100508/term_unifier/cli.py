#!/usr/bin/env python3
"""术语统一替换器 CLI - term_unifier

读取字幕 (.srt/.vtt) 或 Markdown 文档 + 术语表，
输出预览与冲突报告 → 交互式确认 → 生成修订版、原文件备份、差异对照、替换审计日志。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List

from . import __version__
from .models import ConflictReport
from .glossary_loader import load_glossary
from .document_loader import load_document, detect_file_type, FileType
from .matcher import find_matches
from .reporter import build_conflict_report, generate_preview, generate_report_text
from .confirmator import confirm_interactive
from .writer import write_revised, write_diff, write_audit_log


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="term-unifier",
        description="翻译组术语统一替换器：批量处理字幕/Markdown 术语，保留决定理由与审计记录。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
示例:
  # 1) 只预览，不生成任何文件
  term-unifier -g glossary.csv -i episode01.srt --preview-only

  # 2) 交互式处理，生成修订版+审计
  term-unifier -g glossary.csv -i episode01.srt -o out/

  # 3) 非交互模式，自动批准所有自动替换+禁用替换，待确认项跳过
  term-unifier -g glossary.csv -i notes.md -o out/ --yes --skip-review

  # 4) 指定翻译负责人、替换理由
  term-unifier -g glossary.csv -i ep*.vtt -o out/ --reviewer 王小明 --reason "S2术语表v3确认"
""",
    )
    p.add_argument("--version", action="version", version=f"term-unifier {__version__}")
    p.add_argument("-g", "--glossary", required=True, help="术语表 (CSV/TSV/JSON)")
    p.add_argument("-i", "--input", nargs="+", required=True, help="输入字幕或 Markdown 文件 (可多个)")
    p.add_argument("-o", "--output-dir", default=None, help="输出目录（默认与输入文件同目录）")
    p.add_argument("-r", "--reason", default="术语统一", help="默认替换理由")
    p.add_argument("--reviewer", default="", help="翻译负责人姓名（写入审计日志）")
    p.add_argument("--preview-only", action="store_true", help="只输出预览和报告，不生成修订文件")
    p.add_argument("--report-path", default=None, help="冲突报告输出路径 (Markdown)")
    p.add_argument("--yes", "-y", action="store_true", help="跳过交互式确认开头提示")
    p.add_argument("--skip-review", action="store_true", help="跳过『需人工确认』的项（只替换自动替换项和禁用项）")
    p.add_argument("--no-color", action="store_true", help="输出不含 ANSI 颜色")
    p.add_argument("--no-diff", action="store_true", help="不生成 HTML diff 对照")
    p.add_argument("--no-audit-master", action="store_true", help="不累积写入 master 审计 CSV")
    p.add_argument("--no-backup", action="store_true", help="不保留原文件备份")
    return p


def _strip_ansi(s: str) -> str:
    import re
    return re.sub(r'\x1b\[[0-9;]*m', '', s)


def main(argv: List[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.no_color:
        import os
        os.environ["NO_COLOR"] = "1"

    glossary_path = Path(args.glossary)
    if not glossary_path.exists():
        print(f"错误: 术语表不存在: {glossary_path}", file=sys.stderr)
        return 2

    try:
        terms = load_glossary(glossary_path)
    except Exception as e:
        print(f"错误: 加载术语表失败: {e}", file=sys.stderr)
        return 2
    if not terms:
        print("警告: 术语表为空，无可处理条目。", file=sys.stderr)

    print(f"✔ 加载术语表: {len(terms)} 条", file=sys.stderr)

    out_dir = Path(args.output_dir) if args.output_dir else None
    total_processed = 0
    total_matches = 0

    for input_pattern in args.input:
        import glob
        input_paths = [Path(p) for p in glob.glob(input_pattern)] if any(c in input_pattern for c in "*?[") else [Path(input_pattern)]
        for input_path in input_paths:
            if not input_path.exists():
                print(f"  跳过不存在文件: {input_path}", file=sys.stderr)
                continue
            ft = detect_file_type(input_path)
            if ft == FileType.UNKNOWN:
                print(f"  跳过不支持的文件: {input_path}", file=sys.stderr)
                continue
            try:
                doc = load_document(input_path)
            except Exception as e:
                print(f"  加载失败 {input_path}: {e}", file=sys.stderr)
                continue

            matches = find_matches(doc, terms)
            report = build_conflict_report(matches)
            total_matches += len(matches)
            total_processed += 1

            print(f"\n📄 {input_path.name}: "
                  f"共 {len(matches)} 匹配 "
                  f"(禁用:{report.total_forbidden} 待确认:{report.total_needs_review} "
                  f"自动:{report.total_inconsistent})", file=sys.stderr)

            preview_text = generate_preview(doc, matches)
            if args.no_color:
                preview_text = _strip_ansi(preview_text)
            print(preview_text)

            report_md = generate_report_text(doc, matches, report)
            if args.report_path:
                rp = Path(args.report_path)
                rp.parent.mkdir(parents=True, exist_ok=True)
                rp.write_text(report_md, encoding="utf-8")
                print(f"✔ 冲突报告已写: {rp}", file=sys.stderr)

            if args.preview_only:
                continue

            approved = {}
            if args.skip_review:
                for m in matches:
                    if m.needs_manual_review or m.status.value == "needs_review":
                        m.approved = False
                    else:
                        m.approved = True
                approved = {id(m): m for m in matches if m.approved}
            else:
                try:
                    approved = confirm_interactive(doc, matches)
                except Exception as e:
                    print(f"  确认中断: {e}", file=sys.stderr)
                    continue

            n_approved = sum(1 for m in approved.values() if m.approved)
            print(f"  批准 {n_approved}/{len(matches)} 处替换", file=sys.stderr)

            file_out_dir = Path(out_dir) if out_dir else input_path.parent
            try:
                revised_path, backup_path, audit = write_revised(
                    doc, matches, approved,
                    out_dir=file_out_dir,
                    reviewer=args.reviewer,
                    reason_default=args.reason,
                )
            except Exception as e:
                print(f"  写修订版失败: {e}", file=sys.stderr)
                continue

            print(f"✔ 修订版: {revised_path}", file=sys.stderr)
            if not args.no_backup:
                print(f"✔ 原备份: {backup_path}", file=sys.stderr)
            else:
                try:
                    backup_path.unlink()
                except Exception:
                    pass

            if not args.no_diff:
                try:
                    diff_path = write_diff(doc, revised_path, file_out_dir)
                    print(f"✔ 差异对照: {diff_path}", file=sys.stderr)
                except Exception as e:
                    print(f"  生成 diff 失败: {e}", file=sys.stderr)

            try:
                audit_path = write_audit_log(audit, file_out_dir, doc_path=input_path)
                print(f"✔ 审计日志: {audit_path}", file=sys.stderr)
            except Exception as e:
                print(f"  写审计日志失败: {e}", file=sys.stderr)

    print(f"\n── 完成 ── 处理文件: {total_processed}  总匹配: {total_matches}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
