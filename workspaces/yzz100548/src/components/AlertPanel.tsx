import { AlertTriangle, XCircle, Info, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Alert } from "@/types";
import { useAppStore } from "@/store/useAppStore";

interface AlertPanelProps {
  compact?: boolean;
}

export default function AlertPanel({ compact = false }: AlertPanelProps) {
  const { alerts } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (alerts.length === 0) {
    if (compact) return null;
    return (
      <div className="card p-4">
        <div className="flex items-center gap-3 text-success-600">
          <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-sm">分组状态良好</p>
            <p className="text-xs text-neutral-500">暂无任何提醒</p>
          </div>
        </div>
      </div>
    );
  }

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return XCircle;
      case "warning":
        return AlertTriangle;
      case "info":
      default:
        return Info;
    }
  };

  const getColorClasses = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "bg-danger-50 border-danger-200 text-danger-700";
      case "warning":
        return "bg-warning-50 border-warning-200 text-warning-700";
      case "info":
      default:
        return "bg-primary-50 border-primary-200 text-primary-700";
    }
  };

  const getIconBgColor = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "bg-danger-500";
      case "warning":
        return "bg-warning-500";
      case "info":
      default:
        return "bg-primary-500";
    }
  };

  if (compact) {
    return (
      <div
        className={`fixed top-4 right-4 z-40 cursor-pointer animate-bounce-in`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div
          className={`relative px-4 py-2 rounded-full shadow-lg flex items-center gap-2 ${
            alerts.some((a) => a.type === "error")
              ? "bg-danger-500 text-white"
              : alerts.some((a) => a.type === "warning")
              ? "bg-warning-500 text-white"
              : "bg-primary-500 text-white"
          }`}
        >
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{alerts.length} 条提醒</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={20}
            className={
              alerts.some((a) => a.type === "error")
                ? "text-danger-500"
                : "text-warning-500"
            }
          />
          <span className="font-semibold text-neutral-800">
            智能提醒
          </span>
          <span className="badge bg-danger-100 text-danger-600">
            {alerts.length} 条
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-neutral-400" />
        ) : (
          <ChevronDown size={18} className="text-neutral-400" />
        )}
      </div>

      {isExpanded && (
        <div className="space-y-2 pt-1 animate-slide-up">
          {alerts.map((alert, index) => {
            const Icon = getIcon(alert.type);
            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border ${getColorClasses(
                  alert.type
                )} animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${getIconBgColor(
                      alert.type
                    )} text-white`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs opacity-80 mt-0.5">
                      {alert.description}
                    </p>
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
