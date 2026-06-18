import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Target,
  X,
  Zap,
  Weight,
  Footprints,
  Ruler,
} from 'lucide-react';
import { useRiskStore } from '../../store/useRiskStore';
import { useObjectStore } from '../../store/useObjectStore';
import { cn } from '../../lib/utils';
import type { RiskType } from '../../types';

const riskTypeIcons: Record<RiskType, React.ElementType> = {
  overload: Weight,
  fire_exit_blocked: Footprints,
  passage_too_narrow: Ruler,
  power_crosses_flow: Zap,
  unit_error: AlertCircle,
  area_error: AlertCircle,
};

const riskTypeLabels: Record<RiskType, string> = {
  overload: '承重超载',
  fire_exit_blocked: '消防通道堵塞',
  passage_too_narrow: '通道宽度不足',
  power_crosses_flow: '电源线跨人流',
  unit_error: '参数错误',
  area_error: '面积异常',
};

export const RiskList = () => {
  const { risks, focusedRiskId, focusRisk } = useRiskStore();
  const { objects, selectObject } = useObjectStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const dangerRisks = risks.filter((r) => r.severity === 'danger');
  const warningRisks = risks.filter((r) => r.severity === 'warning');

  const handleRiskClick = (risk: typeof risks[0]) => {
    selectObject(risk.objectId);
    focusRisk(risk.id);
    
    const obj = objects.find((o) => o.id === risk.objectId);
    if (obj && risk.suggestedPosition) {
      console.log('建议位置:', risk.suggestedPosition);
    }
  };

  if (risks.length === 0) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">布展方案符合所有安全规范</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
        <div
          className="px-4 py-3 border-b border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-750/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">风险检测</span>
            </div>
            <div className="flex items-center gap-2">
              {dangerRisks.length > 0 && (
                <span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                  {dangerRisks.length} 项严重
                </span>
              )}
              {warningRisks.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">
                  {warningRisks.length} 项警告
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">点击风险项可定位到物体</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {risks.map((risk) => {
                const Icon = riskTypeIcons[risk.type];
                const obj = objects.find((o) => o.id === risk.objectId);
                const isFocused = focusedRiskId === risk.id;

                return (
                  <div
                    key={risk.id}
                    onClick={() => handleRiskClick(risk)}
                    className={cn(
                      'flex-shrink-0 w-80 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                      risk.severity === 'danger'
                        ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/15'
                        : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/15',
                      isFocused && (risk.severity === 'danger' ? 'border-red-500' : 'border-amber-500')
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            risk.severity === 'danger' ? 'bg-red-500/20' : 'bg-amber-500/20'
                          )}
                        >
                          <Icon
                            className={cn(
                              'w-4 h-4',
                              risk.severity === 'danger' ? 'text-red-400' : 'text-amber-400'
                            )}
                          />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'text-xs font-medium',
                              risk.severity === 'danger' ? 'text-red-400' : 'text-amber-400'
                            )}
                          >
                            {riskTypeLabels[risk.type]}
                          </p>
                          <p className="text-xs text-slate-400">{obj?.name || '未知物体'}</p>
                        </div>
                      </div>
                      <button
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        title="定位"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-white font-medium mb-2">{risk.message}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{risk.basis}</p>
                    {risk.suggestedPosition && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          建议位置: ({risk.suggestedPosition[0].toFixed(1)},{' '}
                          {risk.suggestedPosition[2].toFixed(1)})
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
