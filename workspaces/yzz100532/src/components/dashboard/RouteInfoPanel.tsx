import { motion } from "framer-motion";
import {
  Route,
  Clock,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Shield,
  Ruler,
  ChevronRight,
} from "lucide-react";
import { HudPanel } from "@/components/ui/HudPanel";
import { WarningBadge } from "@/components/ui/WarningBadge";
import { useSceneStore } from "@/store/useSceneStore";
import { useScenarioStore } from "@/store/useScenarioStore";
import { cn } from "@/lib/utils";
import type { RouteWarning } from "@/types";

export function RouteInfoPanel() {
  const getNodeById = useSceneStore((state) => state.getNodeById);
  const calculatedRoute = useScenarioStore((state) => state.calculatedRoute);
  const warnings = useScenarioStore((state) => state.warnings);

  const hasRoute = !!calculatedRoute;
  const hasDangerWarning = warnings.some((w) => w.severity === "danger");

  const formatTime = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs.toString().padStart(2, "0")}秒`;
  };

  const getRiskLevel = () => {
    if (!hasRoute) return { level: "未知", color: "gray", icon: <AlertCircle size={16} /> };
    if (hasDangerWarning)
      return { level: "危险", color: "alert-red", icon: <AlertCircle size={16} /> };
    if (warnings.length > 0)
      return { level: "警告", color: "warning-orange", icon: <AlertTriangle size={16} /> };
    return { level: "安全", color: "safety-green", icon: <Shield size={16} /> };
  };

  const riskLevel = getRiskLevel();

  const getWarningIcon = (warning: RouteWarning) => {
    switch (warning.type) {
      case "blocked":
        return <AlertCircle size={16} />;
      case "water_depth":
        return <AlertTriangle size={16} />;
      case "ventilation":
        return <AlertTriangle size={16} />;
      case "closed":
        return <AlertCircle size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <HudPanel
        title="路线信息"
        accentColor={hasDangerWarning ? "red" : hasRoute ? "cyan" : "cyan"}
      >
        {!hasRoute ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-mine-blue-dark/50 flex items-center justify-center mb-4">
              <Route size={32} className="text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">暂无路线数据</p>
            <p className="text-gray-600 text-xs mt-1">
              请选择起终点并点击"一键推演"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-mine-blue-dark/50 rounded border border-tech-cyan/20">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler size={14} className="text-tech-cyan" />
                  <span className="text-xs text-gray-400">总距离</span>
                </div>
                <p className="text-xl font-bold font-orbitron text-tech-cyan">
                  {calculatedRoute.totalDistance.toFixed(1)}
                  <span className="text-sm font-normal ml-1">米</span>
                </p>
              </div>
              <div className="p-3 bg-mine-blue-dark/50 rounded border border-safety-green/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} className="text-safety-green" />
                  <span className="text-xs text-gray-400">预计时间</span>
                </div>
                <p className="text-xl font-bold font-orbitron text-safety-green">
                  {formatTime(calculatedRoute.estimatedTime)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-mine-blue-dark/50 rounded border border-metal-gray/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield
                    size={18}
                    className={cn(`text-${riskLevel.color}`)}
                  />
                  <span className="text-sm text-gray-300">风险等级</span>
                </div>
                <WarningBadge
                  level={
                    riskLevel.color === "alert-red"
                      ? "danger"
                      : riskLevel.color === "warning-orange"
                      ? "warning"
                      : "info"
                  }
                >
                  {riskLevel.level}
                </WarningBadge>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-2">
                途经节点
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {calculatedRoute.nodes.map((nodeId, index) => {
                  const node = getNodeById(nodeId);
                  const isStart = index === 0;
                  const isEnd = index === calculatedRoute.nodes.length - 1;
                  return (
                    <motion.div
                      key={nodeId}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-2 p-2 rounded bg-mine-blue-dark/30"
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          isStart
                            ? "bg-safety-green/20 text-safety-green"
                            : isEnd
                            ? "bg-alert-red/20 text-alert-red"
                            : "bg-tech-cyan/20 text-tech-cyan"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {node?.name || nodeId}
                        </p>
                        {isStart && (
                          <p className="text-xs text-safety-green">起点</p>
                        )}
                        {isEnd && <p className="text-xs text-alert-red">终点</p>}
                      </div>
                      <MapPin
                        size={14}
                        className={cn(
                          isStart
                            ? "text-safety-green"
                            : isEnd
                            ? "text-alert-red"
                            : "text-gray-500"
                        )}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="border-t border-metal-gray/30 pt-4">
                <p className="text-xs text-gray-400 font-orbitron uppercase tracking-wider mb-2">
                  预警信息 ({warnings.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {warnings.map((warning, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className={cn(
                        "p-3 rounded border",
                        warning.severity === "danger"
                          ? "bg-alert-red/10 border-alert-red/30"
                          : "bg-warning-orange/10 border-warning-orange/30"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5",
                            warning.severity === "danger"
                              ? "text-alert-red"
                              : "text-warning-orange"
                          )}
                        >
                          {getWarningIcon(warning)}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <WarningBadge
                              level={
                                warning.severity === "danger"
                                  ? "danger"
                                  : "warning"
                              }
                              pulse={warning.severity === "danger"}
                            >
                              {warning.severity === "danger" ? "危险" : "警告"}
                            </WarningBadge>
                            <span className="text-xs text-gray-500">
                              {warning.edgeId}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {warning.message}
                          </p>
                          {warning.suggestedAction && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <ChevronRight size={12} />
                              建议: {warning.suggestedAction}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </HudPanel>
    </motion.div>
  );
}
