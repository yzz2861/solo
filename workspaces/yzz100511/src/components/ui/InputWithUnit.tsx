import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { WeightUnit, AreaUnit } from '../../types';

interface InputWithUnitProps {
  label: string;
  value: number;
  unit: string;
  units: Array<{ value: string; label: string }>;
  onChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
  placeholder?: string;
  error?: string;
  warning?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const InputWithUnit = ({
  label,
  value,
  unit,
  units,
  onChange,
  onUnitChange,
  placeholder,
  error,
  warning,
  min,
  max,
  step = 0.1,
  className,
}: InputWithUnitProps) => {
  const [inputValue, setInputValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleBlur = () => {
    setIsFocused(false);
    let num = parseFloat(inputValue);
    if (isNaN(num)) {
      num = 0;
    }
    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;
    setInputValue(String(num));
    onChange(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  const inputBorderColor = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    : warning
    ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500/30'
    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30';

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className={cn(
              'w-full px-3 py-2 bg-slate-800 border rounded-lg text-white text-sm',
              'transition-all duration-200 outline-none',
              'focus:ring-2',
              inputBorderColor,
              isFocused && 'bg-slate-750'
            )}
          />
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-red-400 text-lg">⚠</span>
            </div>
          )}
          {warning && !error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-amber-400 text-lg">⚠</span>
            </div>
          )}
        </div>
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-medium transition-all duration-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 hover:bg-slate-750 cursor-pointer"
        >
          {units.map((u) => (
            <option key={u.value} value={u.value} className="bg-slate-800">
              {u.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {warning && !error && <p className="text-xs text-amber-400">{warning}</p>}
    </div>
  );
};

interface WeightInputProps {
  value: number;
  unit: WeightUnit;
  onChange: (value: number) => void;
  onUnitChange: (unit: WeightUnit) => void;
  error?: string;
  warning?: string;
}

export const WeightInput = ({ value, unit, onChange, onUnitChange, error, warning }: WeightInputProps) => (
  <InputWithUnit
    label="重量"
    value={value}
    unit={unit}
    units={[
      { value: 'kg', label: '千克 (kg)' },
      { value: 'ton', label: '吨 (t)' },
    ]}
    onChange={onChange}
    onUnitChange={(u) => onUnitChange(u as WeightUnit)}
    min={0}
    step={unit === 'ton' ? 0.1 : 1}
    error={error}
    warning={warning}
  />
);

interface AreaInputProps {
  value: number;
  unit: AreaUnit;
  onChange: (value: number) => void;
  onUnitChange: (unit: AreaUnit) => void;
  error?: string;
  warning?: string;
}

export const AreaInput = ({ value, unit, onChange, onUnitChange, error, warning }: AreaInputProps) => (
  <InputWithUnit
    label="占地面积"
    value={value}
    unit={unit}
    units={[
      { value: 'm2', label: '平方米 (m²)' },
      { value: 'ft2', label: '平方英尺 (ft²)' },
    ]}
    onChange={onChange}
    onUnitChange={(u) => onUnitChange(u as AreaUnit)}
    min={0}
    step={0.1}
    error={error}
    warning={warning}
  />
);
