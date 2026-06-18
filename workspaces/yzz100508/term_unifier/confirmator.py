import sys
from typing import List, Dict
from .models import Match, Document


def confirm_interactive(doc: Document, matches: List[Match]) -> Dict[int, Match]:
    """交互式确认。返回一个 dict: segment_index -> Match（只包含被批准的 match）。
    当非交互模式或全部自动接受时返回所有 matches。
    """
    if not matches:
        return {}
    forbidden = [m for m in matches if m.status.value == "forbidden"]
    need_review = [m for m in matches if m.needs_manual_review or m.status.value == "needs_review"]
    auto_ok = [m for m in matches if m not in forbidden and m not in need_review]

    for m in auto_ok:
        m.approved = True

    for m in forbidden:
        m.approved = True

    if need_review:
        try:
            _do_review_loop(doc, need_review)
        except (EOFError, KeyboardInterrupt):
            print("\n\n中止。未确认项不会被替换。", file=sys.stderr)

    return {id(m): m for m in matches if m.approved}


def _do_review_loop(doc: Document, need_review: List[Match]) -> None:
    total = len(need_review)
    print(f"\n共有 {total} 项需要人工确认。", file=sys.stderr)
    print("操作: [y]es 确认替换  [n]o 保留原文  [e]dit 修改建议  "
          "[a]ll 全确认  [q]uit 剩余不处理\n", file=sys.stderr)

    all_confirmed = False
    for idx, m in enumerate(need_review, 1):
        if all_confirmed:
            m.approved = True
            continue
        seg = doc.segments[m.segment_index]
        print("─" * 68, file=sys.stderr)
        print(f"[{idx}/{total}] 片段#{seg.index}"
              + (f" 章节:{seg.chapter}" if seg.chapter else "")
              + (f" 时间:{seg.timestamp}" if seg.timestamp else ""), file=sys.stderr)
        context = f"…{m.context_before}>>>{m.original}<<<{m.context_after}…"
        print(f"上下文: {context}", file=sys.stderr)
        print(f"建议:   「{m.original}」 → 「{m.suggested}」", file=sys.stderr)
        print(f"术语源: {m.term_source}   理由: {m.reason}", file=sys.stderr)
        while True:
            try:
                ans = input(f"确认? [y/n/e/a/q] (y): ").strip().lower()
            except EOFError:
                raise
            if ans == "" or ans == "y":
                m.approved = True
                break
            if ans == "n":
                m.approved = False
                break
            if ans == "e":
                new = input(f"输入替换为 [{m.suggested}]: ").strip()
                if new:
                    m.suggested = new
                    m.reviewer_note = f"人工修改: {new}"
                m.approved = True
                break
            if ans == "a":
                m.approved = True
                all_confirmed = True
                break
            if ans == "q":
                return
            print("无效输入，请使用 y/n/e/a/q", file=sys.stderr)
