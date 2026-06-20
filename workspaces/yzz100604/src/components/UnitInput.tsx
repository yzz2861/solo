import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { roundTo } from '@/engine/unitConversions';
import type { TempUnit, WindUnit } from '@/engine/types';
import { celsiusToTemp, tempToCelsius, msToWind, windToMs } from '@/engine/unitConversions';

type UnitKind = 'temp' | 'wind';

interface UnitInputProps {
  value: number | null;
  onChange: (v: number) => void;
  unit: TempUnit | WindUnit;
  onUnitChange: (u: TempUnit | WindUnit) => void;
  kind: UnitKind;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  nullable?: boolean;
  onNullChange?: (isNull: boolean) => void;
}

const tempOptions: { key: TempUnit; label: string }[] = [
  { key: 'C', label: '℃' },
  { key: 'F', label: '℉' },
];

const windOptions: { key: WindUnit; label: string }[] = [
  { key: 'm/s', label: 'm/s' },
  { key: 'km/h', label: 'km/h' },
  { key: 'mph', label: 'mph' },
];

export function UnitInput({
  value,
  onChange,
  unit,
  onUnitChange,
  kind,
  min,
  max,
  step = 0.1,
  placeholder = '0',
  disabled = false,
  label,
  icon,
  className,
  inputClassName,
  nullable = false,
  onNullChange,
}: UnitInputProps) {
  const options = kind === 'temp' ? tempOptions : windOptions;
  const [displayValue, setDisplayValue] = useState<string>(value == null ? '' : String(value));

  useEffect(() => {
    if (value == null) {
      setDisplayValue('');
    } else {
      setDisplayValue(String(roundTo(value, 2)));
    }
  }, [value]);

  const handleUnitChange = (nextUnit: TempUnit | WindUnit) => {
    if (value == null) {
      onUnitChange(nextUnit);
      return;
    }
    let converted: number;
    if (kind === 'temp') {
      const c = tempToCelsius(value, unit as TempUnit);
      converted = celsiusToTemp(c, nextUnit as TempUnit);
    } else {
      const ms = windToMs(value, unit as WindUnit);
      converted = msToWind(ms, nextUnit as WindUnit);
    }
    const rounded = roundTo(converted, 2);
    onUnitChange(nextUnit);
    onChange(rounded);
  };

  const handleBlur = () => {
    const trimmed = displayValue.trim();
    if (trimmed === '') {
      if (nullable) {
        onNullChange?.(true);
        setDisplayValue('');
      } else {
        setDisplayValue(value == null ? '' : String(roundTo(value, 2)));
      }
      return;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num)) {
      let clamped = num;
      if (typeof min === 'number') clamped = Math.max(min, clamped);
      if (typeof max === 'number') clamped = Math.min(max, clamped);
      const rounded = roundTo(clamped, step < 1 ? 2 : 0);
      setDisplayValue(String(rounded));
      if (nullable) onNullChange?.(false);
      onChange(rounded);
    } else {
      setDisplayValue(value == null ? '' : String(roundTo(value, 2)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div
        className={cn(
          'flex items-stretch rounded-lg border bg-white transition-all duration-200',
          'focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100',
          disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300',
          'shadow-sm',
        )}
      >
        {icon && (
          <div className="flex items-center px-3 text-slate-400 border-r border-slate-200 bg-slate-50 rounded-l-lg">
            {icon}
          </div>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setDisplayValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium text-slate-800 bg-transparent outline-none min-w-0',
            inputClassName,
          )}
        />
        <div className="flex items-stretch rounded-r-lg overflow-hidden">
          {options.map((opt, idx) => (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              onClick={() => handleUnitChange(opt.key as TempUnit | WindUnit)}
              className={cn(
                'px-3 text-xs font-semibold transition-all duration-150',
                'border-l first:border-l-0 border-slate-200',
                unit === opt.key
                  ? 'bg-sky-500 text-white shadow-inner'
                  : 'bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
