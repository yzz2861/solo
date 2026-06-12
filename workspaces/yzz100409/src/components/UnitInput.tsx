import { useState, useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface UnitOption<T extends string> {
  value: T;
  label: string;
}

interface UnitInputProps<T extends string> {
  label: string;
  hint?: string;
  value: number | null;
  unit: T;
  unitOptions: UnitOption<T>[];
  placeholder?: string;
  onChangeValue: (v: number | null) => void;
  onChangeUnit: (u: T) => void;
  onBlurRaw?: (raw: { value: number; unit: T }) => void;
  warning?: 'none' | 'warn' | 'error';
  warningMsg?: string;
  min?: number;
  max?: number;
  step?: number | string;
}

function UnitInput<T extends string>({
  label,
  hint,
  value,
  unit,
  unitOptions,
  placeholder,
  onChangeValue,
  onChangeUnit,
  onBlurRaw,
  warning = 'none',
  warningMsg,
  min,
  max,
  step = 'any',
}: UnitInputProps<T>) {
  const id = useId();
  const [localStr, setLocalStr] = useState(
    value === null ? '' : String(value)
  );

  const commit = (str: string) => {
    if (str.trim() === '') {
      onChangeValue(null);
      return;
    }
    const num = Number(str);
    if (!Number.isFinite(num)) return;
    const clamped =
      min !== undefined && max !== undefined
        ? Math.max(min, Math.min(max, num))
        : num;
    onChangeValue(clamped);
    onBlurRaw?.({ value: clamped, unit });
  };

  const cls = clsx('input-base pr-24 text-right tabular-nums', {
    'input-warning': warning === 'warn',
    'input-error': warning === 'error',
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-greenhouse-800"
        >
          {label}
        </label>
        {hint && (
          <span className="text-xs text-greenhouse-400">{hint}</span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={cls}
          placeholder={placeholder}
          value={localStr}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setLocalStr(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          <select
            value={unit}
            onChange={(e) => {
              onChangeUnit(e.target.value as T);
              if (localStr !== '') commit(localStr);
            }}
            className="bg-greenhouse-50 border border-greenhouse-100 rounded-lg px-2 py-1.5 text-xs font-medium text-greenhouse-700 focus:outline-none focus:ring-2 focus:ring-greenhouse-400 cursor-pointer"
          >
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {warning !== 'none' && warningMsg && (
        <div className="flex items-start gap-1.5 text-xs text-warning-600 pt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{warningMsg}</span>
        </div>
      )}
    </div>
  );
}

export default UnitInput;
