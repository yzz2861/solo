import { AlertTriangle } from 'lucide-react';
import { useCalculationStore } from '@/store/useCalculationStore';
import { cn } from '@/lib/utils';

export function SlopeInput() {
  const slope = useCalculationStore((state) => state.input.slope);
  const setSlope = useCalculationStore((state) => state.setSlope);

  const hasError = slope <= 0;
  const hasWarning = slope > 0 && slope < 3;

  const inputClass = cn(
    'h-10 px-3 text-sm border-2 bg-white',
    'focus:outline-none focus:border-blue-700',
    'transition-all duration-200 w-full',
    hasError ? 'border-red-500' : hasWarning ? 'border-amber-500' : 'border-zinc-300'
  );

  return (
    <div className="border-2 border-zinc-300 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-4 tracking-wide">
        排水坡度
      </h3>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          坡度 (‰)
        </label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={slope}
              onChange={(e) => setSlope(Number(e.target.value))}
              className={inputClass}
              step="0.1"
            />
          </div>
          <span className="text-sm font-medium text-zinc-500">‰</span>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
          <div>
            <p>推荐最小坡度：3‰</p>
            <p>坡度换算：1‰ = 每米降低1mm</p>
            <p>坡度为零时雨水无法自流排放！</p>
          </div>
        </div>
        {slope > 0 && slope < 3 && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 border border-amber-200">
            警告：当前坡度 {slope}‰ 小于推荐最小值 3‰，排水不畅风险较高
          </div>
        )}
        {slope <= 0 && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 border border-red-200">
            危险：坡度为零或负数，必须调整！
          </div>
        )}
      </div>
    </div>
  );
}
