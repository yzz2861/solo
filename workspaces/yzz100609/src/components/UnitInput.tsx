import React from 'react';

interface UnitInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  icon?: React.ReactNode;
}

export default function UnitInput({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  placeholder,
  icon,
}: UnitInputProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        {icon}
        {label}
      </label>
      <div className="flex items-center gap-0">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="w-full rounded-l-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-colors"
        />
        <span className="rounded-r-lg border border-l-0 border-slate-600 bg-slate-700/50 px-2.5 py-2 text-xs text-slate-400 whitespace-nowrap">
          {unit}
        </span>
      </div>
    </div>
  );
}
