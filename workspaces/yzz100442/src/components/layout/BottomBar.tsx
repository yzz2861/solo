import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronUp, ChevronDown, X, Target } from 'lucide-react';
import { useStudioStore } from '@/store/useStudioStore';
import type { Alert, AlertLevel } from '@/types/alert';

interface BottomBarProps {}

const levelConfig: Record<AlertLevel, { icon: any; color: string; bgColor: string; borderColor: string }> = {
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
};

export function BottomBar({}: BottomBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const alerts = useStudioStore((state) => state.alerts);
  const selectDevice = useStudioStore((state) => state.selectDevice);

  const errorCount = alerts.filter((a) => a.level === 'error').length;
  const warningCount = alerts.filter((a) => a.level === 'warning').length;
  const infoCount = alerts.filter((a) => a.level === 'info').length;

  const handleAlertClick = (alert: Alert) => {
    if (alert.deviceId) {
      selectDevice(alert.deviceId);
    }
  };

  return (
    <div className="bg-slate-900/90 border-t border-slate-700/50 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 px-4 py-2 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${errorCount > 0 ? 'text-red-400' : warningCount > 0 ? 'text-amber-400' : 'text-green-400'}`} />
          <span className="text-sm font-medium text-slate-200">智能检测</span>
        </div>

        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {errorCount} 个错误
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {warningCount} 个警告
            </span>
          )}
          {infoCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {infoCount} 条提示
            </span>
          )}
          {alerts.length === 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              布局合理，无问题
            </span>
          )}
        </div>

        <div className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="max-h-60 overflow-y-auto border-t border-slate-700/50 p-2 space-y-1.5">
          {alerts.length === 0 ? (
            <div className="py-6 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-sm text-slate-400">当前布局无问题</p>
              <p className="text-xs text-slate-500 mt-1">继续调整，智能检测会实时更新</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const config = levelConfig[alert.level];
              const Icon = config.icon;
              return (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${config.bgColor} ${config.borderColor} hover:scale-[1.01]`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${config.color}`}>{alert.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{alert.description}</p>
                      {alert.suggestion && (
                        <p className="text-xs text-slate-500 mt-1.5 italic">
                          建议：{alert.suggestion}
                        </p>
                      )}
                    </div>
                    {alert.deviceId && (
                      <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded flex-shrink-0">
                        点击定位
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
