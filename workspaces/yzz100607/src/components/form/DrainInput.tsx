import { CircleDot } from 'lucide-react';
import { useCalculationStore } from '@/store/useCalculationStore';
import { cn } from '@/lib/utils';

export function DrainInput() {
  const drainCount = useCalculationStore((state) => state.input.drainCount);
  const drainDiameter = useCalculationStore((state) => state.input.drainDiameter);
  const drainBlocked = useCalculationStore((state) => state.input.drainBlocked);
  const setDrainCount = useCalculationStore((state) => state.setDrainCount);
  const setDrainDiameter = useCalculationStore((state) => state.setDrainDiameter);
  const setDrainBlocked = useCalculationStore((state) => state.setDrainBlocked);

  const countError = drainCount <= 0;
  const diameterError = drainDiameter <= 0;

  const inputClass = (hasError: boolean) =>
    cn(
      'h-10 px-3 text-sm border-2 bg-white',
      'focus:outline-none focus:border-blue-700',
      'transition-all duration-200 w-full',
      hasError ? 'border-red-500' : 'border-zinc-300'
    );

  const diameterOptions = [75, 100, 125, 150, 200, 250, 300];

  return (
    <div className="border-2 border-zinc-300 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-4 tracking-wide">
        排水口参数
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            排水口数量
          </label>
          <input
            type="number"
            value={drainCount}
            onChange={(e) => setDrainCount(Number(e.target.value))}
            className={inputClass(countError)}
            min="1"
            step="1"
          />
          {countError && (
            <p className="mt-1 text-xs text-red-500">数量必须大于0</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            排水口口径 (mm)
          </label>
          <select
            value={drainDiameter}
            onChange={(e) => setDrainDiameter(Number(e.target.value))}
            className={inputClass(diameterError)}
          >
            {diameterOptions.map((d) => (
              <option key={d} value={d}>
                {d} mm
              </option>
            ))}
          </select>
          {diameterError && (
            <p className="mt-1 text-xs text-red-500">口径必须大于0</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={drainBlocked}
            onChange={(e) => setDrainBlocked(e.target.checked)}
            className="w-4 h-4 border-2 border-zinc-300 rounded text-blue-700 focus:ring-blue-700"
          />
          <span className="text-sm text-zinc-700">排水口被遮挡</span>
        </label>
        {drainBlocked && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 border border-red-200">
            警告：排水口被遮挡，排水能力降低50%，建议清理或增设排水口
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
        <CircleDot className="w-4 h-4 mt-0.5 text-zinc-400 flex-shrink-0" />
        <div>
          <p>单口排水能力参考：</p>
          <p>100mm: 2.0 L/s | 150mm: 4.5 L/s | 200mm: 8.0 L/s</p>
        </div>
      </div>
    </div>
  );
}
