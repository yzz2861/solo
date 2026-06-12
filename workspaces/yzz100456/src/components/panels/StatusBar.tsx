import { useState, useEffect } from 'react';
import { MapPin, Navigation, Ruler, Move3d } from 'lucide-react';
import type { LiftPlan } from '@/types';
import type { OperationRisk } from '@/hooks/useRiskEngine';

interface Props {
  plan: LiftPlan;
  operationRisks: OperationRisk[];
  firstOpSafeRadius: number;
}

export default function StatusBar({ plan, operationRisks, firstOpSafeRadius }: Props) {
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState<'persp' | 'top' | 'front'>('persp');
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hasDanger = operationRisks.some(or => or.risks.some(r => r.level === 'danger'));
  const craneModel = `${plan.crane.brand ?? ''} ${plan.crane.model}`.trim();

  return (
    <footer className="h-8 flex items-center px-4 bg-dock-900/95 border-t border-dock-700/60 text-[11px] text-slate-400 font-mono relative z-20">
      <div className="flex items-center gap-1 mr-4">
        <div className={`w-2 h-2 rounded-full ${hasDanger ? 'bg-safety-red animate-pulse' : 'bg-safety-green'}`} />
        <span className={hasDanger ? 'text-safety-red' : 'text-safety-green'}>
          {hasDanger ? '⚠ 存在待处理风险' : '✓ 风险状态已评估'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mr-4 px-2 py-0.5 rounded bg-dock-800/50">
        <Ruler className="w-3 h-3 text-safety-blue" />
        <span>安全半径 <b className="text-slate-200">{firstOpSafeRadius.toFixed(2)}m</b></span>
      </div>

      <div className="flex items-center gap-1.5 mr-4 px-2 py-0.5 rounded bg-dock-800/50">
        <Navigation className="w-3 h-3 text-safety-orange" />
        <span>吊车 <b className="text-slate-200">{craneModel}</b></span>
      </div>

      <div className="flex items-center gap-1.5 mr-4 px-2 py-0.5 rounded bg-dock-800/50">
        <MapPin className="w-3 h-3 text-safety-yellow" />
        <span>基准: ({plan.crane.basePosition[0]}, {plan.crane.basePosition[2]})</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 mr-4">
        <span className="text-slate-500 mr-1">视图:</span>
        {(['persp', 'top', 'front'] as const).map(v => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`px-1.5 py-0.5 rounded border text-[10px] transition ${
              viewMode === v
                ? 'border-safety-orange text-safety-orange bg-safety-orange/10'
                : 'border-dock-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {v === 'persp' ? '透视' : v === 'top' ? '顶视' : '正视'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 text-slate-500">
        <Move3d className="w-3 h-3" />
        <span>左键:旋转 · 右键:平移 · 滚轮:缩放</span>
      </div>

      <div className="ml-4 pl-4 border-l border-dock-700 text-slate-500">
        {now.toLocaleString('zh-CN', { hour12: false })}
      </div>
    </footer>
  );
}
