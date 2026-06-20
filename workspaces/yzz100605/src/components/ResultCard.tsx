import { useBufferStore } from '@/store/useBufferStore';
import { formatVolume, formatNumber } from '@/engine/convert';
import { FlaskConical, Droplets, GlassWater, Gauge, AlertTriangle } from 'lucide-react';

export default function ResultCard() {
  const result = useBufferStore((s) => s.result);
  const input = useBufferStore((s) => s.input);
  const toggleSteps = useBufferStore((s) => s.toggleSteps);

  if (!result) return null;

  const hasErrors = result.warnings.some((w) => w.level === 'error');

  return (
    <div className="animate-fade-in-up space-y-4">
      {hasErrors && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-serif text-lg font-bold text-red-700">无法配制</h3>
          </div>
          <p className="text-sm text-red-700">
            当前参数无法配制出目标缓冲液。请根据以下提示调整参数：
          </p>
          <ul className="mt-2 space-y-1">
            {result.warnings
              .filter((w) => w.level === 'error')
              .map((w, i) => (
                <li key={i} className="text-sm text-red-600">
                  • {w.message} — {w.suggestion}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="group rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">
              {input.acidName || '酸组分'}
            </span>
          </div>
          <p className="font-mono text-3xl font-bold text-teal-800">
            {formatVolume(result.acidVolume_mL)}
          </p>
          <p className="mt-1 text-xs text-teal-500">
            浓度 {formatNumber(result.finalAcidConc_molL, 4)} mol/L
          </p>
        </div>

        <div className="group rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              {input.baseName || '碱组分'}
            </span>
          </div>
          <p className="font-mono text-3xl font-bold text-amber-800">
            {formatVolume(result.baseVolume_mL)}
          </p>
          <p className="mt-1 text-xs text-amber-500">
            浓度 {formatNumber(result.finalBaseConc_molL, 4)} mol/L
          </p>
        </div>

        <div className="group rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="mb-2 flex items-center gap-2">
            <GlassWater className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">定容用水</span>
          </div>
          <p className="font-mono text-3xl font-bold text-sky-800">
            {formatVolume(result.waterVolume_mL)}
          </p>
          <p className="mt-1 text-xs text-sky-500">
            定容至 {formatVolume(result.totalVolume_mL)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">缓冲容量</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, result.bufferCapacity * 500)}%` }}
            />
          </div>
          <span className="font-mono text-sm font-bold text-slate-700">
            {formatNumber(result.bufferCapacity, 4)} mol/(L·pH)
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          碱/酸浓度比 R = {formatNumber(result.ratio, 4)}
        </p>
      </div>

      <button
        onClick={toggleSteps}
        className="text-sm font-medium text-amber-600 underline decoration-amber-300 underline-offset-2 transition-colors hover:text-amber-700"
      >
        查看逐步计算过程
      </button>
    </div>
  );
}
