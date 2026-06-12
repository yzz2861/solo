import { useState } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  placeholder?: string;
  className?: string;
  unitOptions?: { value: string; label: string }[];
  unitValue?: string;
  onUnitChange?: (u: string) => void;
}

export default function NumberInput({
  value, onChange, label, unit, min, max, step = 0.1, decimals = 2,
  placeholder, className = '', unitOptions, unitValue, onUnitChange
}: Props) {
  const [focus, setFocus] = useState(false);
  const display = Number.isFinite(value) ? (Number.isInteger(step) ? value.toFixed(0) : value.toFixed(decimals).replace(/\.?0+$/, '')) : '';
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div className={`flex items-stretch rounded border transition-all ${focus ? 'border-safety-orange/70 ring-1 ring-safety-orange/40' : 'border-dock-600/70'} bg-dock-900/80`}>
        <input
          type="number"
          value={display}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) {
              let n = v;
              if (min !== undefined) n = Math.max(min, n);
              if (max !== undefined) n = Math.min(max, n);
              onChange(n);
            }
          }}
          className="w-full bg-transparent px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none font-mono min-w-0"
        />
        {unit && !unitOptions && (
          <span className="px-2 flex items-center text-xs text-slate-400 border-l border-dock-600/70 bg-dock-950/40 rounded-r">
            {unit}
          </span>
        )}
        {unitOptions && unitValue && (
          <select
            value={unitValue}
            onChange={(e) => onUnitChange?.(e.target.value)}
            className="px-2 text-xs text-slate-300 bg-dock-950/40 border-l border-dock-600/70 rounded-r focus:outline-none cursor-pointer"
          >
            {unitOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
