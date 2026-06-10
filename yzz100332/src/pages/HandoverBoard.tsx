import { useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import StatCard from "@/components/board/StatCard";
import LogTable from "@/components/board/LogTable";
import ExportBtn from "@/components/board/ExportBtn";
import { ClipboardCheck, CheckSquare, FileCheck2, TrendingUp, User } from "lucide-react";
import { todayStr } from "@/utils/id";

export default function HandoverBoard() {
  const tags = useAppStore((s) => s.tags);
  const logs = useAppStore((s) => s.logs);
  const [dateFilter, setDateFilter] = useState(todayStr());

  const stats = useMemo(() => {
    const confirmed = tags.filter((t) => t.status === "confirmed").length;
    const printed = tags.filter((t) => t.status === "printed").length;
    const draft = tags.filter((t) => t.status === "draft").length;
    return { confirmed, printed, draft, total: tags.length };
  }, [tags]);

  const filteredLogs = useMemo(() => {
    if (!dateFilter) return logs;
    return logs.filter((l) => l.timestamp.startsWith(dateFilter));
  }, [logs, dateFilter]);

  const printedByMap = useMemo(() => {
    const map = new Map<string, number>();
    tags
      .filter((t) => t.status === "printed" && t.printedBy)
      .forEach((t) => {
        map.set(t.printedBy!, (map.get(t.printedBy!) || 0) + 1);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tags]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-100 to-gray-50 no-print">
      <div className="bg-white border-b border-brand-500/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-brand-500 flex items-center gap-2">
            📊 交班看板
          </h2>
          <p className="text-xs text-ink-light mt-0.5">
            今日 {tags.length} 张价签 · 三方核对无误后即可交班
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-light">
            按日期筛选
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 focus:border-brand-500 focus:outline-none text-sm"
            />
            {dateFilter && (
              <button
                className="text-xs text-brand-500 hover:underline"
                onClick={() => setDateFilter("")}
              >
                清除
              </button>
            )}
          </label>
          <ExportBtn />
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="草稿 · 未提交确认"
            value={stats.draft}
            tone="gray"
            icon={<ClipboardCheck size={24} />}
            sub={`${stats.total > 0 ? Math.round((stats.draft / stats.total) * 100) : 0}%`}
          />
          <StatCard
            label="待打印 · 老板已确认"
            value={stats.confirmed}
            tone="warn"
            icon={<CheckSquare size={24} />}
            sub="请尽快打印"
            highlight
          />
          <StatCard
            label="已打印 · 完成"
            value={stats.printed}
            tone="success"
            icon={<FileCheck2 size={24} />}
            sub={<TrendingUp size={12} className="inline" />}
          />
          <StatCard
            label="总计"
            value={stats.total}
            tone="brand"
            icon={<span className="text-2xl">📋</span>}
            sub={`草稿+待打印+已打印`}
          />
        </div>

        {printedByMap.length > 0 && (
          <div className="panel p-5">
            <h3 className="font-display text-lg text-brand-500 mb-3 flex items-center gap-2">
              <User size={18} className="text-brand-300" /> 今日操作人统计
            </h3>
            <div className="flex flex-wrap gap-3">
              {printedByMap.map(([name, n]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-brand-500/8 to-brand-500/4 border border-brand-500/10"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
                    {name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{name}</div>
                    <div className="text-xs text-ink-light">
                      打印 <b className="font-mono text-success-dark">{n}</b> 张
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel p-5">
          <h3 className="font-display text-lg text-brand-500 mb-3 flex items-center justify-between">
            <span>📜 操作流水表（{filteredLogs.length} 条）</span>
            <span className="text-xs text-ink-light font-normal">
              仅显示 {dateFilter || "全部日期"} 的操作记录
            </span>
          </h3>
          <LogTable logs={filteredLogs} tags={tags} />
        </div>

        <div className="panel p-5">
          <h3 className="font-display text-lg text-brand-500 mb-3">🗂️ 全部价签状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tags.length === 0 ? (
              <div className="col-span-full text-center text-ink-light py-10 text-sm">
                还没有任何价签记录
              </div>
            ) : (
              tags.map((t) => {
                const tone =
                  t.status === "printed"
                    ? "border-success/30 bg-success/5"
                    : t.status === "confirmed"
                    ? "border-warn/40 bg-warn/5"
                    : "border-gray-300 bg-gray-50";
                const label =
                  t.status === "printed"
                    ? "已打印"
                    : t.status === "confirmed"
                    ? "待打印"
                    : "草稿";
                const labelTone =
                  t.status === "printed"
                    ? "badge-success"
                    : t.status === "confirmed"
                    ? "badge-warn"
                    : "badge-info";
                return (
                  <div
                    key={t.id}
                    className={`rounded-lg border-2 p-3 flex items-start justify-between gap-2 ${tone}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base text-brand-500">
                          {t.name || "(无名)"}
                        </span>
                        <span className={`badge ${labelTone}`}>{label}</span>
                      </div>
                      <div className="text-xs text-ink-light mt-1 truncate">
                        {t.category}｜{t.origin}｜{t.grade || "-"}｜{t.boxSpec}斤
                      </div>
                      <div className="text-xs text-ink/80 font-mono mt-1">
                        斤¥{t.jinPrice.toFixed(2)} 箱¥{t.boxPrice.toFixed(2)}
                      </div>
                      {(t.printedBy || t.confirmedBy) && (
                        <div className="text-[11px] text-ink-light mt-1 font-mono">
                          {t.confirmedBy && `✓ 确认:${t.confirmedBy} `}
                          {t.printedBy && `🖨 打印:${t.printedBy}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
