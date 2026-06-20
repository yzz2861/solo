import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { WarningItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const TYPE_STYLE: Record<WarningItem['type'], { icon: React.ComponentType<{ className?: string }>; chip: string; iconCls: string; bar: string; hover: string }> = {
  error: {
    icon: AlertTriangle,
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    iconCls: 'text-rose-600',
    bar: 'bg-rose-500',
    hover: 'hover:bg-rose-50/70',
  },
  warning: {
    icon: AlertCircle,
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    iconCls: 'text-amber-600',
    bar: 'bg-amber-500',
    hover: 'hover:bg-amber-50/70',
  },
  info: {
    icon: Info,
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    iconCls: 'text-sky-600',
    bar: 'bg-sky-500',
    hover: 'hover:bg-sky-50/70',
  },
};

const TYPE_LABEL: Record<WarningItem['type'], string> = {
  error: '危险',
  warning: '警告',
  info: '提示',
};

export default function WarningList() {
  const warnings = useAppStore((s) => s.warnings);
  const updateBox = useAppStore((s) => s.updateBox);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (warnings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-emerald-600" stroke="currentColor" strokeWidth="3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="mt-3 text-sm font-bold text-emerald-700">全部安全</div>
        <div className="text-xs text-slate-500 mt-1">暂未检测到任何风险项</div>
      </div>
    );
  }

  const stats = {
    error: warnings.filter((w) => w.type === 'error').length,
    warning: warnings.filter((w) => w.type === 'warning').length,
    info: warnings.filter((w) => w.type === 'info').length,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[380px]">
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            风险与提醒
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">共 {warnings.length} 条</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
          {stats.error > 0 && (
            <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700">{stats.error} 危险</span>
          )}
          {stats.warning > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">{stats.warning} 警告</span>
          )}
          {stats.info > 0 && (
            <span className="px-2 py-1 rounded-full bg-sky-100 text-sky-700">{stats.info} 提示</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {warnings
          .filter((_, i) => !dismissed.has(String(i)))
          .map((w, idx) => {
            const s = TYPE_STYLE[w.type];
            const Icon = s.icon;
            const origIdx = warnings.indexOf(w);
            return (
              <div key={idx} className={`relative pl-3 flex gap-3 p-3 transition ${s.hover}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${s.chip} border`}>
                  <Icon className={`w-4 h-4 ${s.iconCls}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${s.chip} border`}>
                      {TYPE_LABEL[w.type]}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{w.message}</span>
                    {w.code === 'OVER_SINGLE_LIMIT' && w.boxId && (
                      <button
                        onClick={() => {
                          if (w.layerIndex !== undefined) {
                            const targetZones = ['tl', 'tr', 'bl', 'br'] as const;
                            const z = targetZones[Math.floor(Math.random() * targetZones.length)];
                            updateBox(w.boxId!, { positionZone: z, layerIndex: Math.max(0, w.layerIndex! - 1) });
                          }
                        }}
                        className="ml-auto text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                      >
                        建议分散<ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {w.code === 'CENTER_HEAVY' && (
                      <button
                        onClick={() => setDismissed((prev) => new Set(prev).add(String(origIdx)))}
                        className="ml-auto text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        我知道了
                      </button>
                    )}
                  </div>
                  {w.detail && (
                    <div className="mt-1 text-[11px] text-slate-600 leading-relaxed">{w.detail}</div>
                  )}
                </div>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(String(origIdx)))}
                  className="shrink-0 p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition self-start -mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
