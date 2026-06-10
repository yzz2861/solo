import { useRef } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { PriceTag } from "@/types";
import { issuesCountByTag, worstIssueLevel } from "@/utils/validator";
import { CATEGORIES, GRADES } from "@/types";

const STATUS_LABEL: Record<PriceTag["status"], { text: string; cls: string }> = {
  draft: { text: "草稿", cls: "bg-gray-400/20 text-gray-600 border-gray-400/30" },
  confirmed: { text: "待打印", cls: "bg-warn/15 text-warn-dark border-warn/40" },
  printed: { text: "已打印", cls: "bg-success/15 text-success-dark border-success/30" },
};

export default function EditableTable({
  highlightId,
  setHighlightId,
}: {
  highlightId?: string | null;
  setHighlightId?: (id: string | null) => void;
}) {
  const tags = useAppStore((s) => s.tags);
  const issues = useAppStore((s) => s.issues);
  const updateTag = useAppStore((s) => s.updateTag);
  const removeTag = useAppStore((s) => s.removeTag);

  const issueMap = issuesCountByTag(issues);
  const tbodyRef = useRef<HTMLDivElement>(null);

  function scrollToTag(id: string) {
    const el = document.querySelector(`[data-row-id="${id}"]`);
    if (el && tbodyRef.current) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }

  if (highlightId) {
    setTimeout(() => scrollToTag(highlightId), 20);
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAF5] min-w-0 overflow-hidden no-print">
      <div className="flex items-center justify-between px-5 py-3 border-b border-brand-500/10">
        <h2 className="font-display text-lg text-brand-500 flex items-center gap-2">
          <GripVertical size={16} className="text-brand-300" /> 价签编辑表
        </h2>
        <div className="flex items-center gap-3 text-xs text-ink-light">
          <span>共 <b className="font-mono text-brand-500 text-sm">{tags.length}</b> 行</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tags.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ink-light text-sm p-10">
            <div className="text-center space-y-3">
              <div className="text-5xl opacity-30">📋</div>
              <p>还没有价签数据</p>
              <p className="text-xs opacity-70">
                请从左侧 <b>批量粘贴</b> Excel 内容，或点击 <b>示例</b> 快速体验
              </p>
            </div>
          </div>
        ) : (
          <div ref={tbodyRef} className="min-w-[960px]">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-[#FAFAF5]">
                <tr>
                  <th className="th-cell !w-10 text-center">#</th>
                  <th className="th-cell">品类</th>
                  <th className="th-cell">品名</th>
                  <th className="th-cell">产地</th>
                  <th className="th-cell">等级</th>
                  <th className="th-cell num !text-right w-20">箱规(斤)</th>
                  <th className="th-cell num !text-right w-24">斤价</th>
                  <th className="th-cell num !text-right w-24">箱价</th>
                  <th className="th-cell num !text-right w-20">折扣</th>
                  <th className="th-cell w-32">促销开始</th>
                  <th className="th-cell w-32">促销结束</th>
                  <th className="th-cell">备注</th>
                  <th className="th-cell !w-20">状态</th>
                  <th className="th-cell !w-10"></th>
                </tr>
              </thead>
              <tbody>
                {tags.map((t, idx) => {
                  const counts = issueMap[t.id];
                  const worst = worstIssueLevel(counts);
                  const status = STATUS_LABEL[t.status];
                  const barCls =
                    worst === "error"
                      ? "bg-danger"
                      : worst === "warning"
                      ? "bg-warn"
                      : "bg-success/50";
                  const rowHighlight = highlightId === t.id;
                  return (
                    <tr
                      key={t.id}
                      data-row-id={t.id}
                      className={[
                        "group border-b border-brand-500/5 transition-colors",
                        rowHighlight ? "bg-yellow-50 animate-issue-blink" : "hover:bg-brand-500/3",
                      ].join(" ")}
                      onMouseEnter={() => setHighlightId?.(t.id)}
                      onMouseLeave={() => setHighlightId?.(null)}
                    >
                      <td className="relative py-1 pl-1 pr-2 align-top">
                        <div
                          className={[
                            "absolute left-0 top-1 bottom-1 w-1 rounded-r",
                            barCls,
                            worst ? "animate-issue-blink" : "",
                          ].join(" ")}
                          style={{ animationIterationCount: worst ? 2 : 0 }}
                        />
                        <div className="ml-2 text-xs font-mono text-ink-light pt-1.5">
                          {idx + 1}
                        </div>
                      </td>
                      <Td>
                        <select
                          className="input-cell"
                          value={t.category}
                          onChange={(e) => updateTag(t.id, { category: e.target.value })}
                          disabled={t.status === "printed"}
                        >
                          <option value="">— 选品类 —</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <input
                          className="input-cell"
                          value={t.name}
                          onChange={(e) => updateTag(t.id, { name: e.target.value })}
                          placeholder="品名"
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <input
                          className={[
                            "input-cell",
                            worst === "error" &&
                            issues.some((i) => i.tagId === t.id && i.field === "origin")
                              ? "!bg-danger/10 !border-danger/40"
                              : "",
                          ].join(" ")}
                          value={t.origin}
                          onChange={(e) => updateTag(t.id, { origin: e.target.value })}
                          placeholder="如：云南"
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <select
                          className={[
                            "input-cell",
                            worst === "error" &&
                            issues.some((i) => i.tagId === t.id && i.field === "grade")
                              ? "!bg-danger/10 !border-danger/40"
                              : "",
                          ].join(" ")}
                          value={t.grade}
                          onChange={(e) => updateTag(t.id, { grade: e.target.value })}
                          disabled={t.status === "printed"}
                        >
                          <option value="">— 等级 —</option>
                          {GRADES.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td num>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="input-cell text-right"
                          value={t.boxSpec || ""}
                          onChange={(e) =>
                            updateTag(t.id, { boxSpec: parseFloat(e.target.value) || 0 })
                          }
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td num>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input-cell text-right"
                          value={t.jinPrice || ""}
                          onChange={(e) =>
                            updateTag(t.id, { jinPrice: parseFloat(e.target.value) || 0 })
                          }
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td num>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={[
                            "input-cell text-right",
                            worst === "warning" &&
                            issues.some(
                              (i) => i.tagId === t.id && i.type === "price" && i.field === "boxPrice"
                            )
                              ? "!bg-warn/10 !border-warn/40"
                              : "",
                          ].join(" ")}
                          value={t.boxPrice || ""}
                          onChange={(e) =>
                            updateTag(t.id, { boxPrice: parseFloat(e.target.value) || 0 })
                          }
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td num>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1"
                          className="input-cell text-right"
                          value={t.memberDiscount}
                          onChange={(e) =>
                            updateTag(t.id, {
                              memberDiscount: parseFloat(e.target.value) || 1,
                            })
                          }
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <input
                          type="date"
                          className="input-cell"
                          value={t.promoStart}
                          onChange={(e) => updateTag(t.id, { promoStart: e.target.value })}
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <input
                          type="date"
                          className={[
                            "input-cell",
                            issues.some(
                              (i) => i.tagId === t.id && i.type === "promotion" && i.field === "promoEnd"
                            )
                              ? "!bg-danger/10 !border-danger/40"
                              : "",
                          ].join(" ")}
                          value={t.promoEnd}
                          onChange={(e) => updateTag(t.id, { promoEnd: e.target.value })}
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <input
                          className="input-cell"
                          value={t.remark}
                          onChange={(e) => updateTag(t.id, { remark: e.target.value })}
                          placeholder="备注"
                          disabled={t.status === "printed"}
                        />
                      </Td>
                      <Td>
                        <span className={["badge", status.cls].join(" ")}>{status.text}</span>
                      </Td>
                      <Td className="pr-2 align-top py-1.5">
                        <button
                          className="p-1.5 rounded text-ink-light hover:text-danger hover:bg-danger/10 disabled:opacity-30"
                          onClick={() => {
                            if (confirm(`确定删除这行价签吗？\n${t.name || t.category}`)) {
                              removeTag(t.id);
                            }
                          }}
                          disabled={t.status === "printed"}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Td({
  children,
  num,
  className: extraCls,
}: {
  children: React.ReactNode;
  num?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "py-1 px-2 align-top",
        num ? "num text-right" : "",
        extraCls || "",
      ].join(" ")}
    >
      {children}
    </td>
  );
}
