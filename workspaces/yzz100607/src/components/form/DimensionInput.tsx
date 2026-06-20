import { useCalculationStore } from '@/store/useCalculationStore';
import { LengthUnitSelector } from './UnitSelector';
import { cn } from '@/lib/utils';

export function DimensionInput() {
  const length = useCalculationStore((state) => state.input.length);
  const lengthUnit = useCalculationStore((state) => state.input.lengthUnit);
  const width = useCalculationStore((state) => state.input.width);
  const widthUnit = useCalculationStore((state) => state.input.widthUnit);
  const setLength = useCalculationStore((state) => state.setLength);
  const setLengthUnit = useCalculationStore((state) => state.setLengthUnit);
  const setWidth = useCalculationStore((state) => state.setWidth);
  const setWidthUnit = useCalculationStore((state) => state.setWidthUnit);

  const inputClass = (hasError: boolean) =>
    cn(
      'h-10 px-3 text-sm border-2 bg-white',
      'focus:outline-none focus:border-blue-700',
      'transition-all duration-200 w-full',
      hasError ? 'border-red-500' : 'border-zinc-300'
    );

  return (
    <div className="border-2 border-zinc-300 p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-4 tracking-wide">
        雨棚尺寸
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            长度
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className={inputClass(length <= 0)}
              step="any"
              min="0"
            />
            <LengthUnitSelector value={lengthUnit} onChange={setLengthUnit} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            宽度
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className={inputClass(width <= 0)}
              step="any"
              min="0"
            />
            <LengthUnitSelector value={widthUnit} onChange={setWidthUnit} />
          </div>
        </div>
      </div>
    </div>
  );
}
