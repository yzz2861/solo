import type { CalculationStep } from '@/types';
import { cn } from '@/lib/utils';

interface FormulaDisplayProps {
  steps: CalculationStep[];
  className?: string;
}

export function FormulaDisplay({ steps, className }: FormulaDisplayProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {steps.map((step) => (
        <div
          key={step.step}
          className="border border-zinc-200 bg-zinc-50 p-3 hover:bg-white transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 bg-blue-700 text-white text-xs font-bold">
              {step.step}
            </span>
            <span className="text-sm font-semibold text-zinc-800">{step.title}</span>
          </div>
          <div className="ml-8 space-y-1 text-sm">
            <div className="font-mono text-zinc-600">
              公式：<span className="text-blue-700">{step.formula}</span>
            </div>
            <div className="font-mono text-zinc-600">
              代入：<span className="text-zinc-800">{step.values}</span>
            </div>
            <div className="font-mono font-semibold">
              结果：<span className="text-emerald-700">{step.result}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
