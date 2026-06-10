import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { issuesCountByTag } from "@/utils/validator";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { useState } from "react";
import PriceTagCard from "./PriceTagCard";
import { CATEGORIES } from "@/types";

export default function PreviewWall({
  highlightId,
  setHighlightId,
}: {
  highlightId?: string | null;
  setHighlightId?: (id: string | null) => void;
}) {
  const tags = useAppStore((s) => s.tags);
  const issues = useAppStore((s) => s.issues);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);

  const issueMap = useMemo(() => issuesCountByTag(issues), [issues]);

  const cats = useMemo(() => {
    const set = new Set(tags.map((t) => t.category).filter(Boolean));
    return ["全部", ...CATEGORIES.filter((c) => set.has(c))];
  }, [tags]);

  const filteredTags = useMemo(
    () => (selectedCategory === "全部" ? tags : tags.filter((t) => t.category === selectedCategory)),
    [tags, selectedCategory]
  );

  const groupedByOrigin = useMemo(() => {
    const map = new Map<string, typeof filteredTags>();
    filteredTags.forEach((t) => {
      const key = t.origin || "未填写产地";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [filteredTags]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="w-[460px] shrink-0 h-full bg-white border-l border-brand-500/10 flex flex-col min-w-0 overflow-hidden no-print">
      <div className="px-4 py-3 border-b border-brand-500/10 flex items-center justify-between">
        <h2 className="font-display text-lg text-brand-500 flex items-center gap-2">
          <Package size={16} className="text-brand-300" /> 价签预览墙
        </h2>
        <span className="text-xs text-ink-light font-mono">
          {filteredTags.length} 张
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-brand-500/5 overflow-x-auto">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={[
              "px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
              selectedCategory === c
                ? "bg-brand-500 text-white shadow-press"
                : "bg-brand-500/8 text-brand-500/80 hover:bg-brand-500/15",
            ].join(" ")}
          >
            {c}
            <span className="ml-1 opacity-60 text-[10px]">
              {c === "全部"
                ? tags.length
                : tags.filter((t) => t.category === c).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {filteredTags.length === 0 ? (
          <div className="h-full flex items-center justify-center text-ink-light text-xs opacity-70">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-30">🏷️</div>
              <p>此分类暂无价签</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByOrigin.map(([origin, list]) => {
              const isCollapsed = collapsed[origin];
              return (
                <div key={origin}>
                  <button
                    className="flex items-center gap-1.5 w-full text-left mb-2 group"
                    onClick={() =>
                      setCollapsed((s) => ({ ...s, [origin]: !s[origin] }))
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} className="text-brand-400" />
                    ) : (
                      <ChevronDown size={14} className="text-brand-400" />
                    )}
                    <span className="text-sm font-semibold text-ink-dark">
                      {origin}
                    </span>
                    <span className="text-[11px] text-ink-light font-mono ml-1">
                      {list.length} 张
                    </span>
                    <span className="flex-1 h-px bg-gradient-to-r from-brand-500/20 to-transparent ml-2" />
                  </button>
                  {!isCollapsed && (
                    <div className="grid grid-cols-2 gap-2.5 pl-3 border-l-2 border-brand-500/10">
                      {list.map((t, i) => (
                        <div key={t.id} className="animate-tag-in">
                          <PriceTagCard
                            tag={t}
                            issueCounts={issueMap[t.id]}
                            issuesForTag={issues.filter((ii) => ii.tagId === t.id)}
                            highlighted={highlightId === t.id}
                            delay={i * 40}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
