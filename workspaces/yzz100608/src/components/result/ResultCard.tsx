import React from 'react';
import { Card } from '../common/Card';
import { useAppStore } from '../../store/useAppStore';
import { ResultPMView } from './ResultPMView';
import { ResultEngineeringView } from './ResultEngineeringView';
import { ResultViewMode } from '../../types';

const MODES: { id: ResultViewMode; label: string; icon: string; hint: string }[] = [
  { id: 'pm', label: '产品经理', icon: '📋', hint: '简洁续航结论' },
  { id: 'engineering', label: '工程师', icon: '🔬', hint: '计算细节溯源' },
];

export const ResultCard: React.FC = () => {
  const result = useAppStore((s) => s.result);
  const resultViewMode = useAppStore((s) => s.resultViewMode);
  const setResultViewMode = useAppStore((s) => s.setResultViewMode);
  const alerts = useAppStore((s) => s.alerts);

  const hasError = alerts.some((a) => a.level === 'error');
  const canCompute = result && !hasError;

  return (
    <Card
      id="result"
      title="续航估算结果"
      icon="⏱️"
      accent="info"
      animationDelay={0.16}
      titleExtra={
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/30 border border-custom">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setResultViewMode(m.id)}
              className={`relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                resultViewMode === m.id
                  ? 'text-[#0a1628] shadow-md'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title={m.hint}
            >
              {resultViewMode === m.id && (
                <span
                  className="absolute inset-0 rounded-md"
                  style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
                />
              )}
              <span className="relative z-10 text-sm">{m.icon}</span>
              <span className="relative z-10 hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>
      }
    >
      {!canCompute ? (
        <EmptyResultState hasError={hasError} />
      ) : resultViewMode === 'pm' ? (
        <ResultPMView />
      ) : (
        <ResultEngineeringView />
      )}
    </Card>
  );
};

const EmptyResultState: React.FC<{ hasError: boolean }> = ({ hasError }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="relative mb-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 flex items-center justify-center animate-pulse-glow">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </div>
    <h3 className="text-base font-semibold text-text-primary mb-1.5">
      {hasError ? '存在错误项需要修正' : '等待完整输入…'}
    </h3>
    <p className="text-sm text-text-muted max-w-xs">
      {hasError
        ? '请查看上方告警横幅，标红的参数修正后即可实时估算'
        : '配置电池容量、至少一个负载阶段以及修正系数后，此处将实时显示典型与最差续航'}
    </p>
    <div className="mt-5 grid grid-cols-3 gap-3 w-full max-w-sm">
      {[
        { label: '电池', icon: '🔋', done: !alerts.some((a) => a.anchor === '#battery') },
        { label: '负载', icon: '📊', done: !alerts.some((a) => a.anchor?.startsWith('#phase') && a.level === 'error') },
        { label: '修正', icon: '🌡️', done: !alerts.some((a) => a.anchor === '#corrections' && a.level === 'error') },
      ].map((s) => (
        <div
          key={s.label}
          className={`rounded-lg border p-3 transition-all ${
            s.done
              ? 'border-success/40 bg-success/8 text-success'
              : 'border-custom bg-black/20 text-text-muted'
          }`}
        >
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <span>{s.label}</span>
            {s.done ? <span>✓</span> : <span className="text-text-muted">…</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);
