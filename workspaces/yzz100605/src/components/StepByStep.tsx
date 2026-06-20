import { useBufferStore } from '@/store/useBufferStore';
import { Calculator } from 'lucide-react';

export default function StepByStep() {
  const showSteps = useBufferStore((s) => s.showSteps);
  const result = useBufferStore((s) => s.result);

  if (!showSteps || !result) return null;

  return (
    <div className="animate-fade-in-up rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-teal-600" />
        <h3 className="font-serif text-lg font-bold text-slate-800">逐步计算过程</h3>
      </div>
      <div className="space-y-4">
        {result.steps.map((step) => (
          <div
            key={step.step}
            className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
          >
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                {step.step}
              </span>
              <h4 className="font-serif text-sm font-bold text-slate-700">{step.title}</h4>
            </div>
            <div className="ml-10 space-y-2">
              <div className="rounded-lg bg-white px-3 py-2">
                <p className="text-xs text-slate-400">公式</p>
                <p className="font-mono text-sm text-teal-700">{step.formula}</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2">
                <p className="text-xs text-slate-400">代入数值</p>
                <p className="font-mono text-sm text-amber-700">{step.substitution}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-500">结果</p>
                <p className="font-mono text-sm font-bold text-amber-800">{step.result}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
