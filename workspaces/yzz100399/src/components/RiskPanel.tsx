import { usePlaygroundStore } from "@/store/usePlaygroundStore";
import { RISK_TYPE_LABEL, RISK_SEVERITY_LABEL, COMPONENT_DEFAULTS } from "@/types";
import type { RiskType, RiskSeverity } from "@/types";
import { AlertTriangle, AlertOctagon, Info, Crosshair, Eye } from "lucide-react";

const SEVERITY_CONFIG: Record<RiskSeverity, { icon: React.ReactNode; bgClass: string; textClass: string; borderClass: string }> = {
  critical: {
    icon: <AlertOctagon size={16} />,
    bgClass: "bg-red-500/10",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-400",
    borderClass: "border-orange-500/30",
  },
  info: {
    icon: <Info size={16} />,
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
  },
};

const TYPE_ICON: Record<RiskType, React.ReactNode> = {
  height_exceed: <AlertOctagon size={14} />,
  collision: <Crosshair size={14} />,
  blind_spot: <Eye size={14} />,
  unit_error: <AlertTriangle size={14} />,
  coverage_insufficient: <AlertTriangle size={14} />,
};

export function RiskPanel() {
  const { risks, components, selectComponent } = usePlaygroundStore();

  const criticalCount = risks.filter((r) => r.severity === "critical").length;
  const warningCount = risks.filter((r) => r.severity === "warning").length;

  const handleLocate = (compId: string) => {
    selectComponent(compId);
  };

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide">风险检测</h2>
          {risks.length > 0 && (
            <div className="flex items-center gap-1.5">
              {criticalCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                  {criticalCount} 严重
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                  {warningCount} 警告
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-green-400 text-xl">✓</span>
            </div>
            <p className="text-green-400 text-sm font-medium">安全检查通过</p>
            <p className="text-slate-500 text-xs mt-1">未发现安全风险</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {risks.map((risk) => {
            const config = SEVERITY_CONFIG[risk.severity];
            const compNames = risk.componentIds
              .map((id) => components.find((c) => c.id === id)?.name || id)
              .join(" / ");

            return (
              <div
                key={risk.id}
                className={`rounded-lg border p-2.5 ${config.bgClass} ${config.borderClass} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 ${config.textClass}`}>
                    {TYPE_ICON[risk.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.bgClass} ${config.textClass}`}
                      >
                        {RISK_SEVERITY_LABEL[risk.severity]}
                      </span>
                      <span className="text-xs text-slate-400">
                        {RISK_TYPE_LABEL[risk.type]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {risk.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-slate-500 truncate">
                        {compNames}
                      </span>
                      <button
                        onClick={() => handleLocate(risk.componentIds[0])}
                        className="text-xs text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-0.5 shrink-0 ml-2"
                      >
                        <Crosshair size={10} />
                        定位
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
