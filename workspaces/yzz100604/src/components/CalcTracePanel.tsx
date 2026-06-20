import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalcTrace } from '@/engine/types';

interface CalcTracePanelProps {
  trace: CalcTrace;
  className?: string;
}

export function CalcTracePanel({ trace, className }: CalcTracePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = JSON.stringify(trace, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 14 4 10 8 6" />
              <polyline points="16 6 20 10 16 14" />
              <line x1="14" y1="4" x2="6" y2="20" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">计算依据留档</div>
            <div className="text-xs text-slate-500">算法版本 {trace.formulaVersion}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200">
          <div className="p-4 space-y-4 bg-slate-50/50">
            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                标准化参数
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Object.entries(trace.normalizedParams).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-600 font-mono">{k}</span>
                    <span className="text-slate-800 font-semibold font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                中间得分
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Object.entries(trace.intermediateScores).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-600 font-mono">{k}</span>
                    <span className={cn(
                      'font-semibold font-mono',
                      typeof v === 'number' && v < 0 ? 'text-emerald-600' : 'text-slate-800',
                    )}>
                      {typeof v === 'number' && v > 0 ? '+' : ''}{v}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                修正标记
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-block w-2 h-2 rounded-full',
                    trace.saltCorrectionApplied ? 'bg-orange-500' : 'bg-slate-300',
                  )} />
                  <span className="text-slate-600">撒盐衰减修正：</span>
                  <span className="text-slate-800 font-semibold">
                    {trace.saltCorrectionApplied ? '已应用' : '未触发'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'inline-block w-2 h-2 rounded-full',
                      trace.missingDataFallback ? 'bg-amber-500' : 'bg-slate-300',
                    )} />
                    <span className="text-slate-600">缺失数据回退：</span>
                    <span className="text-slate-800 font-semibold">
                      {trace.missingDataFallback ? '生效' : '无'}
                    </span>
                  </div>
                  {trace.missingDataFallback && (
                    <div className="mt-1 ml-4 px-2 py-1.5 rounded bg-amber-50 border border-amber-100 text-amber-700 font-mono text-[11px]">
                      {trace.missingDataFallback}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1">
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                查看阈值快照
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-[11px] overflow-x-auto font-mono leading-relaxed">
                {JSON.stringify(trace.thresholdsUsed, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
