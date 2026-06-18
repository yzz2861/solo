import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Unit } from '../../engine';

interface NumberInputWithUnitProps {
  value: number;
  unit: Unit | 'g' | 'ml';
  onChange: (value: number, unit: Unit | 'g' | 'ml') => void;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unitOptions?: (Unit | 'g' | 'ml')[];
  disabled?: boolean;
  showIncrementButtons?: boolean;
}

const NumberInputWithUnit: React.FC<NumberInputWithUnitProps> = ({
  value,
  unit,
  onChange,
  label,
  placeholder = '0',
  min = 0,
  max = 10000,
  step = 1,
  unitOptions = ['g', 'ml', '%'],
  disabled = false,
  showIncrementButtons = true,
}) => {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(Math.max(min, Math.min(max, newValue)), unit);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(value, e.target.value as Unit);
  };

  const increment = () => {
    onChange(Math.min(max, value + step), unit);
  };

  const decrement = () => {
    onChange(Math.max(min, value - step), unit);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-chocolate-700">{label}</label>
      <div className="flex items-center gap-2">
        {showIncrementButtons && (
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || value <= min}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream-100 text-chocolate-700 hover:bg-cream-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus size={18} />
          </button>
        )}
        <input
          type="number"
          value={value === 0 ? '' : value}
          onChange={handleValueChange}
          placeholder={placeholder}
          disabled={disabled}
          className="input-field flex-1 text-center text-lg font-medium"
          min={min}
          max={max}
          step={step}
        />
        {showIncrementButtons && (
          <button
            type="button"
            onClick={increment}
            disabled={disabled || value >= max}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream-100 text-chocolate-700 hover:bg-cream-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
          </button>
        )}
        <select
          value={unit}
          onChange={handleUnitChange}
          disabled={disabled}
          className="select-field w-20 text-center font-medium"
        >
          {unitOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default NumberInputWithUnit;
