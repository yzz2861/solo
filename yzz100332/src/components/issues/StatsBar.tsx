import { useAppStore } from "@/store/useAppStore";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

export default function StatsBar() {
  const issues = useAppStore((s) => s.issues);
  const tags = useAppStore((s) => s.tags);
  const issuesDrawerOpen = useAppStore((s) => s.issuesDrawerOpen);
  const setIssuesDrawerOpen = useAppStore((s) => s.setIssuesDrawerOpen);

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const infos = issues.filter((i) => i.level === "info").length;
  const cleanTags = tags.filter((t) => {
    const tagIssues = issues.filter((i) => i.tagId === t.id);
    return tagIssues.length === 0;
  }).length;

  const totalIssue = errors + warnings + infos;

  return (
    <div className="bg-brand-500/90 border-b border-white/8 px-5 py-2.5 flex items-center gap-4 no-print">
      {totalIssue === 0 ? (
        <div className="flex items-center gap-2 text-success-light text-sm">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          校验通过 · 当前 {tags.length} 张价签均无异常
        </div>
      ) : (
        <button
          onClick={() => setIssuesDrawerOpen(!issuesDrawerOpen)}
          className="flex items-center gap-4 text-sm hover:bg-white/5 rounded px-2 py-1 transition-colors"
        >
          {errors > 0 && (
            <span className="flex items-center gap-1.5 text-danger-light">
              <AlertCircle size={14} /> 错误 <b className="font-mono">{errors}</b>
            </span>
          )}
          {warnings > 0 && (
            <span className="flex items-center gap-1.5 text-warn-light">
              <AlertTriangle size={14} /> 警告 <b className="font-mono">{warnings}</b>
            </span>
          )}
          {infos > 0 && (
            <span className="flex items-center gap-1.5 text-blue-200">
              <Info size={14} /> 提示 <b className="font-mono">{infos}</b>
            </span>
          )}
          <span className="text-white/30 text-xs ml-1">
            已通过 {cleanTags} / {tags.length}
          </span>
          <span className="text-white/50 text-xs ml-auto">
            {issuesDrawerOpen ? "▼ 收起异常面板" : "▲ 展开异常面板"}
          </span>
        </button>
      )}
    </div>
  );
}
