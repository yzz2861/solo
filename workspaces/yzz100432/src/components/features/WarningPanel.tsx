import { AlertTriangle, Zap, Eye, Ruler, Scissors } from "lucide-react";
import type { Warning } from "../../types";

interface WarningPanelProps {
  warnings: Warning[];
}

const warningIcons: Record<Warning["type"], typeof AlertTriangle> = {
  height_incomplete: Ruler,
  power_line: Zap,
  blind_spot: Eye,
  excessive_pruning: Scissors,
};

const warningLabels: Record<Warning["type"], string> = {
  height_incomplete: "高度估算",
  power_line: "电线碰撞",
  blind_spot: "照明盲区",
  excessive_pruning: "过度修剪",
};

export function WarningPanel({ warnings }: WarningPanelProps) {
  if (warnings.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <h3 className="font-semibold text-gray-800">警告检测</h3>
        </div>
        <div className="text-center py-6 text-gray-400">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-6 h-6 text-green-500">✓</div>
          </div>
          <p className="text-sm">暂无警告，修剪方案安全</p>
        </div>
      </div>
    );
  }

  const sortedWarnings = [...warnings].sort((a, b) => {
    if (a.severity === "error" && b.severity === "warning") return -1;
    if (a.severity === "warning" && b.severity === "error") return 1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-warning-500/10 rounded-lg flex items-center justify-center warning-pulse">
          <AlertTriangle className="w-4 h-4 text-warning-500" />
        </div>
        <h3 className="font-semibold text-gray-800">警告检测</h3>
        <span className="ml-auto px-2 py-0.5 bg-danger-500 text-white text-xs font-medium rounded-full">
          {warnings.length}
        </span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sortedWarnings.map((warning) => {
          const Icon = warningIcons[warning.type];
          const bgColor = warning.severity === "error" 
            ? "bg-danger-50 border-danger-200" 
            : "bg-warning-50 border-warning-200";
          const iconColor = warning.severity === "error" 
            ? "text-danger-500" 
            : "text-warning-500";

          return (
            <div
              key={warning.id}
              className={`p-3 rounded-lg border ${bgColor} animate-fade-in`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg bg-white/80 ${iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      {warningLabels[warning.type]}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        warning.severity === "error"
                          ? "bg-danger-500/20 text-danger-600"
                          : "bg-warning-500/20 text-warning-600"
                      }`}
                    >
                      {warning.severity === "error" ? "错误" : "警告"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {warning.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
