import type { VolumeUnit } from '@/types';
import { VOLUME_UNITS } from '@/utils/unitConverter';

interface VolumeInputProps {
  label: string;
  value: number;
  unit: VolumeUnit;
  onChange: (value: number) => void;
  onUnitChange: (unit: VolumeUnit) => void;
  placeholder?: string;
}

export default function VolumeInput({ label, value, unit, onChange, onUnitChange, placeholder }: VolumeInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-stretch">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder || '请输入'}
          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 bg-white"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as VolumeUnit)}
          className="px-3 py-2.5 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
        >
          {VOLUME_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
