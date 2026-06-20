import React from 'react';

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  disabled?: boolean;
  unitOptions?: readonly string[];
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'text-xs py-1.5 px-2.5',
  md: 'text-sm py-2 px-3',
  lg: 'text-base py-2.5 px-3.5',
};

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  className = '',
  suffix,
  prefix,
  disabled = false,
  unitOptions,
  selectedUnit,
  onUnitChange,
  decimals,
  size = 'md',
  label,
  labelRight,
  hint,
  id,
}) => {
  const [internal, setInternal] = React.useState<string>(value?.toString() ?? '');

  React.useEffect(() => {
    setInternal(value?.toString() ?? '');
  }, [value]);

  const handleBlur = () => {
    let parsed = parseFloat(internal);
    if (isNaN(parsed)) {
      parsed = 0;
    }
    if (typeof min === 'number' && parsed < min) parsed = min;
    if (typeof max === 'number' && parsed > max) parsed = max;
    if (typeof decimals === 'number') {
      parsed = parseFloat(parsed.toFixed(decimals));
    }
    if (parsed !== value) onChange(parsed);
    else setInternal(parsed.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      const s = step ?? (decimals ? Math.pow(10, -decimals) : 1);
      let parsed = parseFloat(internal);
      if (isNaN(parsed)) parsed = 0;
      parsed = parseFloat((parsed + dir * s).toFixed(decimals ?? 6));
      if (typeof min === 'number' && parsed < min) parsed = min;
      if (typeof max === 'number' && parsed > max) parsed = max;
      setInternal(parsed.toString());
      onChange(parsed);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {(label || labelRight) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-xs font-medium text-text-secondary tracking-wide">
              {label}
            </label>
          )}
          {labelRight}
        </div>
      )}
      <div className={`flex items-stretch rounded-md overflow-hidden border border-custom transition-colors focus-within:border-accent-primary focus-within:shadow-[0_0_0_3px_rgba(0,212,170,0.15)] bg-[rgba(10,22,40,0.65)] ${disabled ? 'opacity-60' : ''}`}>
        {prefix && (
          <div className="flex items-center px-3 text-text-muted border-r border-custom text-xs font-medium">
            {prefix}
          </div>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={internal}
          placeholder={placeholder}
          onChange={(e) => setInternal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`flex-1 min-w-0 bg-transparent text-text-primary outline-none ${sizeClasses[size]}`}
        />
        {suffix && (
          <div className="flex items-center px-3 text-text-muted border-l border-custom text-xs font-medium">
            {suffix}
          </div>
        )}
        {unitOptions && onUnitChange && (
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            disabled={disabled}
            className="bg-transparent text-text-secondary text-xs font-medium px-2.5 pr-7 -mr-3 border-l border-custom outline-none cursor-pointer"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              appearance: 'none',
            }}
          >
            {unitOptions.map((u) => (
              <option key={u} value={u} className="bg-[#0a1628]">
                {u}
              </option>
            ))}
          </select>
        )}
      </div>
      {hint && <div className="text-[11px] text-text-muted leading-tight">{hint}</div>}
    </div>
  );
};
