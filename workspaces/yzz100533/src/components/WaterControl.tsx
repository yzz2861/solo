import { useState } from 'react';
import { Droplets, ArrowDownCircle } from 'lucide-react';
import type { WaterAmount } from '@/types';
import { WATER_AMOUNT_LABELS } from '@/data/plants';

interface WaterControlProps {
  onWater: (amount: WaterAmount) => void;
  onDrain: () => void;
  disabled: boolean;
  hasDrainHole: boolean;
  currentMoisture: number;
}

const amounts: { value: WaterAmount; label: string; color: string; activeColor: string }[] = [
  { value: 1, label: WATER_AMOUNT_LABELS[1], color: 'bg-blue-100 text-blue-600 border-blue-200', activeColor: 'bg-blue-200 text-blue-800 border-blue-400 ring-2 ring-blue-300' },
  { value: 2, label: WATER_AMOUNT_LABELS[2], color: 'bg-blue-200 text-blue-700 border-blue-300', activeColor: 'bg-blue-300 text-blue-900 border-blue-500 ring-2 ring-blue-400' },
  { value: 3, label: WATER_AMOUNT_LABELS[3], color: 'bg-blue-300 text-blue-800 border-blue-400', activeColor: 'bg-blue-400 text-white border-blue-600 ring-2 ring-blue-500' },
];

export default function WaterControl({ onWater, onDrain, disabled, hasDrainHole, currentMoisture }: WaterControlProps) {
  const [selected, setSelected] = useState<WaterAmount>(2);
  const isFlooded = currentMoisture >= 75;
  const waterDisabled = disabled || isFlooded;
  const drainDisabled = disabled || !hasDrainHole;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {amounts.map((item) => (
          <button
            key={item.value}
            onClick={() => setSelected(item.value)}
            disabled={waterDisabled}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              selected === item.value ? item.activeColor : item.color
            } ${waterDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            <Droplets size={16} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onWater(selected)}
          disabled={waterDisabled}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-base font-bold text-white transition-all ${
            waterDisabled
              ? 'cursor-not-allowed bg-stone-300'
              : 'bg-[#4A7C59] active:scale-95 hover:bg-[#3D6A4B]'
          }`}
        >
          <Droplets size={20} />
          浇水
        </button>

        <button
          onClick={onDrain}
          disabled={drainDisabled}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
            drainDisabled
              ? 'cursor-not-allowed bg-stone-200 text-stone-400'
              : 'bg-amber-100 text-amber-700 active:scale-95 hover:bg-amber-200'
          }`}
        >
          <ArrowDownCircle size={18} />
          排水
        </button>
      </div>

      {isFlooded && (
        <p className="text-center text-xs text-red-500">土壤积水，不能再浇水了！</p>
      )}
      {!hasDrainHole && (
        <p className="text-center text-xs text-amber-600">此花盆无排水孔，无法排水</p>
      )}
    </div>
  );
}
