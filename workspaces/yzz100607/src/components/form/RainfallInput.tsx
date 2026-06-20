import { CloudRain } from 'lucide-react';
import { useCalculationStore } from '@/store/useCalculationStore';
import { RainfallUnitSelector } from './UnitSelector';
import { cn } from '@/lib/utils';
import { toMmPerMin } from '@/utils/unitConversion';

export function RainfallInput() {
  const rainfallIntensity = useCalculationStore((state) => state.input.rainfallIntensity);
  const rainfallUnit = useCalculationStore((state) => state.input.rainfallUnit);
  const setRainfallIntensity = useCalculationStore((state) => state.setRainfallIntensity);
  const setRainfallUnit = useCalculationStore((state) => state.setRainfallUnit);

  const rainfallMmMin = toMmPerMin(rainfallIntensity, rainfallUnit);
  const hasError = rainfallIntensity <= 0;
  const hasWarning = rainfallMmMin > 5;
  const hasInfo = rainfallMmMin < 0.5;

  const inputClass = cn(
    'h-10 px-3 text-sm border-2 bg-white',
    'focus:outline-none focus:border-blue-700',
    'transition-all duration-200 w-full',
    hasError ? 'border-red-500' : hasWarning ? 'border-amber-500' : 'border-zinc-300'
  );

  return (
    <div className="border-2 border-zinc-300 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-4 tracking-wide">
        设计雨强
      </h3>
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          当地设计暴雨强度
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={rainfallIntensity}
            onChange={(e) => setRainfallIntensity(Number(e.target.value))}
            className={inputClass}
            step="any"
            min="0"
          />
          <RainfallUnitSelector value={rainfallUnit} onChange={setRainfallUnit} />
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
          <CloudRain className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
          <div>
            <p>常用范围：30-300 mm/h（0.5-5 mm/min）</p>
            <p>请查询当地《暴雨强度公式》获取准确值</p>
          </div>
        </div>
        {hasWarning && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 border border-amber-200">
            警告：雨强 {rainfallIntensity} {rainfallUnit} 超出常用范围，请核实数据准确性
          </div>
        )}
        {hasInfo && !hasError && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 border border-blue-200">
            提示：雨强偏小，请确认当地设计暴雨强度是否正确
          </div>
        )}
        {hasError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 border border-red-200">
            危险：雨强必须大于0
          </div>
        )}
      </div>
    </div>
  );
}
