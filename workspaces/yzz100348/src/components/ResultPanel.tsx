import type { CSSProperties } from 'react';
import type { CalculationInput, CalculationResult } from '@/types';
import { fmt } from '@/utils/calculation';
import { AlertTriangle, CircleAlert, ArrowRight } from 'lucide-react';

interface Props {
  result: CalculationResult | null;
  input: CalculationInput;
}

export default function ResultPanel({ result, input }: Props) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-slate-400 text-sm">
        输入参数后将自动计算泵速
      </div>
    );
  }

  const hasError = result.warnings.some((w) => w.level === 'error');
  const hasWarning = result.warnings.some((w) => w.level === 'warning');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResultCard
          label="建议泵速"
          value={result.pumpRateMlPerH !== null ? fmt(result.pumpRateMlPerH) : '—'}
          unit="mL/h"
          accent={hasError ? '#DC2626' : hasWarning ? '#D97706' : '#0F6CBD'}
          large
        />
        <ResultCard
          label="体重剂量"
          value={result.weightDoseMgKgMin !== null ? fmt(result.weightDoseMgKgMin) : '—'}
          unit="mg/kg/min"
          accent="#6B7280"
        />
        <ResultCard
          label="体重剂量"
          value={result.weightDoseUgKgH !== null ? fmt(result.weightDoseUgKgH) : '—'}
          unit="μg/kg/h"
          accent="#6B7280"
        />
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 rounded-lg border"
              style={{
                backgroundColor: w.level === 'error' ? '#FEF2F2' : '#FFFBEB',
                borderColor: w.level === 'error' ? '#FECACA' : '#FDE68A',
              }}
            >
              {w.level === 'error' ? (
                <CircleAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: w.level === 'error' ? '#991B1B' : '#92400E' }}
              >
                {w.message}
              </span>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-3 tracking-wide uppercase">
          换算步骤
        </h3>
        <div className="space-y-2">
          {result.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-500 mb-1">{step.label}</div>
                <div className="font-mono text-sm text-slate-700 break-all">{step.formula}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              <div className="font-mono text-sm font-semibold text-blue-700 shrink-0">
                {step.result}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  unit,
  accent,
  large,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <div
      className="rounded-xl border bg-white shadow-sm p-4 flex flex-col items-center justify-center text-center"
      style={{ borderTop: `3px solid ${accent}` } as CSSProperties}
    >
      <span className="text-xs font-medium text-slate-500 mb-2 tracking-wide uppercase">{label}</span>
      <span
        className={`font-mono font-bold leading-none ${large ? 'text-3xl' : 'text-xl'}`}
        style={{ color: accent }}
      >
        {value}
      </span>
      <span className="text-xs text-slate-400 mt-1.5 font-mono">{unit}</span>
    </div>
  );
}
