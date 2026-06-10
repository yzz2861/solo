import { useAppStore } from "@/store/useAppStore";
import { AlertCircle, AlertTriangle, Info, X, ChevronRight, MapPin, Hash, Percent, Calendar, FileText } from "lucide-react";
import type { ValidationIssue } from "@/types";

const TYPE_ICON: Record<ValidationIssue["type"], typeof MapPin> = {
  empty: FileText,
  duplicate: Hash,
  price: Percent,
  promotion: Calendar,
};
const TYPE_LABEL: Record<ValidationIssue["type"], string> = {
  empty: "空值类",
  duplicate: "重复类",
  price: "价格校验",
  promotion: "促销时段",
};

export default function IssuesDrawer() {
  const issues = useAppStore((s) => s.issues);
  const tags = useAppStore((s) => s.tags);
  const open = useAppStore((s) => s.issuesDrawerOpen);
  const setOpen = useAppStore((s) => s.setIssuesDrawerOpen);

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");

  const byType: Record<ValidationIssue["type"], ValidationIssue[]> = {
    empty: issues.filter((i) => i.type === "empty"),
    duplicate: issues.filter((i) => i.type === "duplicate"),
    price: issues.filter((i) => i.type === "price"),
    promotion: issues.filter((i) => i.type === "promotion"),
  };

  return (
    <div
      className={[
        "relative transition-all duration-300 ease-out border-t border-white/8 bg-brand-600/90 backdrop-blur text-white no-print overflow-hidden",
        open ? "max-h-[340px]" : "max-h-0",
      ].join(" ")}
    >
      <div className="flex h-[340px] min-h-0">
        <div className="w-[260px] shrink-0 border-r border-white/10 p-3 flex flex-col gap-2 overflow-y-auto">
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">
            异常分类
          </h3>
          <Section label="错误" count={errors.length} tone="danger" items={errors} />
          <Section label="警告" count={warnings.length} tone="warn" items={warnings} />
          <Section label="提示" count={infos.length} tone="info" items={infos} />

          <div className="mt-auto pt-3 border-t border-white/10">
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
              按类型统计
            </h4>
            <div className="space-y-1">
              {(Object.keys(byType) as ValidationIssue["type"][]).map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  {(() => {
                    const I = TYPE_ICON[k];
                    return <I size={12} className="text-white/50 shrink-0" />;
                  })()}
                  <span className="text-white/80">{TYPE_LABEL[k]}</span>
                  <span className="ml-auto font-mono text-white/50">
                    {byType[k].length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg text-white/90">异常明细</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded hover:bg-white/10 text-white/60"
            >
              <X size={16} />
            </button>
          </div>

          {issues.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-white/40 text-sm">
              🎉 太好了，没有任何异常
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {issues.map((issue) => {
                const tag = tags.find((t) => t.id === issue.tagId);
                const I =
                  issue.level === "error"
                    ? AlertCircle
                    : issue.level === "warning"
                    ? AlertTriangle
                    : Info;
                const toneCls =
                  issue.level === "error"
                    ? "border-danger/40 bg-danger/10 text-danger-light"
                    : issue.level === "warning"
                    ? "border-warn/40 bg-warn/10 text-warn-light"
                    : "border-blue-400/40 bg-blue-500/10 text-blue-100";
                return (
                  <div
                    key={issue.tagId + issue.message}
                    onClick={() => {
                      setOpen(false);
                      const el = document.querySelector(
                        `[data-row-id="${issue.tagId}"]`
                      ) as HTMLElement | null;
                      el?.scrollIntoView({ block: "center", behavior: "smooth" });
                      el?.classList.add("animate-issue-blink");
                      setTimeout(() => el?.classList.remove("animate-issue-blink"), 2200);
                    }}
                    className={[
                      "group flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all hover:-translate-y-0.5 hover:border-white/30",
                      toneCls,
                    ].join(" ")}
                  >
                    <I size={16} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-snug">
                        {issue.message}
                      </div>
                      {tag && (
                        <div className="mt-1 text-[11px] text-white/50 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{tag.category || "未分类"}</span>
                          <span>·</span>
                          <span className="text-white/70 font-semibold">
                            {tag.name || "（无名）"}
                          </span>
                          <span>·</span>
                          <MapPin size={10} />
                          <span>{tag.origin || "—"}</span>
                          {tag.grade && (
                            <>
                              <span>·</span>
                              <span className="bg-white/10 px-1 rounded text-white/70">
                                {tag.grade}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className="mt-1 opacity-0 group-hover:opacity-70 transition-opacity"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  tone,
  items,
}: {
  label: string;
  count: number;
  tone: "danger" | "warn" | "info";
  items: ValidationIssue[];
}) {
  const toneBg =
    tone === "danger"
      ? "bg-danger/15 text-danger-light border-danger/25"
      : tone === "warn"
      ? "bg-warn/15 text-warn-light border-warn/25"
      : "bg-blue-500/15 text-blue-100 border-blue-400/25";
  if (count === 0) return null;
  return (
    <div
      className={[
        "rounded-lg border p-2.5",
        toneBg,
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold">{label}</span>
        <span className="text-xs font-mono opacity-80">{count}</span>
      </div>
      <ul className="space-y-0.5 max-h-32 overflow-y-auto text-[11px] leading-relaxed opacity-90 pr-1">
        {items.slice(0, 5).map((i, idx) => (
          <li key={idx} className="truncate">
            · {i.message}
          </li>
        ))}
        {items.length > 5 && (
          <li className="opacity-60">+{items.length - 5} 更多…</li>
        )}
      </ul>
    </div>
  );
}
