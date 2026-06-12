import { AlertTriangle, AlertCircle, CheckCircle, Shield, Box, Anchor } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function SafetyPanel() {
  const warnings = useStore((s) => s.warnings);
  const modules = useStore((s) => s.modules);
  const anchors = useStore((s) => s.anchors);

  const dangers = warnings.filter((w) => w.level === "danger");
  const caution = warnings.filter((w) => w.level === "warning");

  const maxTension = warnings
    .filter((w) => w.type === "tension")
    .reduce((max, w) => {
      const match = w.message.match(/(\d+\.?\d*)/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

  const minWidth = warnings
    .filter((w) => w.type === "width")
    .reduce((min, w) => {
      const match = w.message.match(/(\d+\.?\d*)/);
      return match ? Math.min(min, Number(match[1])) : min;
    }, Infinity);

  return (
    <div className="bg-[#0A2540] text-white p-4 rounded-lg w-72 flex flex-col gap-3 overflow-y-auto max-h-screen">
      <h2 className="text-sm font-semibold tracking-wide uppercase opacity-70">安全检测</h2>

      {warnings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <CheckCircle size={32} className="text-[#00D4AA]" />
          <div className="text-sm text-[#00D4AA] font-medium">所有检测通过</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dangers.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                危险 ({dangers.length})
              </div>
              {dangers.map((w) => (
                <div
                  key={w.message}
                  className="flex gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5"
                >
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-relaxed">{w.message}</div>
                    {w.relatedIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.relatedIds.map((id) => (
                          <span
                            key={id}
                            className="text-[10px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded"
                          >
                            {id.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {caution.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
                警告 ({caution.length})
              </div>
              {caution.map((w) => (
                <div
                  key={w.message}
                  className="flex gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5"
                >
                  <AlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-relaxed">{w.message}</div>
                    {w.relatedIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.relatedIds.map((id) => (
                          <span
                            key={id}
                            className="text-[10px] font-mono bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded"
                          >
                            {id.slice(0, 8)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center gap-2 text-xs font-semibold opacity-60 mb-2">
          <Shield size={14} />
          汇总
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <Box size={14} className="mx-auto mb-1 opacity-40" />
            <div className="text-lg font-mono">{modules.length}</div>
            <div className="text-[10px] opacity-40">模块</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <Anchor size={14} className="mx-auto mb-1 opacity-40" />
            <div className="text-lg font-mono">{anchors.length}</div>
            <div className="text-[10px] opacity-40">锚点</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-lg font-mono">
              {maxTension > 0 ? `${maxTension.toFixed(1)}` : "—"}
            </div>
            <div className="text-[10px] opacity-40">最大张力 kN</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <div className="text-lg font-mono">
              {minWidth < Infinity ? `${minWidth.toFixed(1)}` : "—"}
            </div>
            <div className="text-[10px] opacity-40">最小通宽 m</div>
          </div>
        </div>
      </div>
    </div>
  );
}
