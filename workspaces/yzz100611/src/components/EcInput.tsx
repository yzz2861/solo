import type { EcUnit } from '@/types';
import { EC_UNITS } from '@/utils/unitConverter';

interface EcInputProps {
  label: string;
  value: number;
  unit: EcUnit;
  onChange: (value: number) => void;
  onUnitChange: (unit: EcUnit) => void;
  placeholder?: string;
}

export default function EcInput({ label, value, unit, onChange, onUnitChange, placeholder }: EcInputProps) {
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
          onChange={(e) => onUnitChange(e.target.value as EcUnit)}
          className="px-3 py-2.5 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
        >
          {EC_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
