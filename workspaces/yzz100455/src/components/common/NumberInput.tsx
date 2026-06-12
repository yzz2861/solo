interface NumberInputProps {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  className?: string;
  unitOptions?: { value: string; label: string }[];
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
}

export default function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  placeholder = '请输入',
  className = '',
  unitOptions,
  unitValue,
  onUnitChange,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || val === '-') {
      onChange(null);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= min && num <= max) {
        onChange(num);
      }
    }
  };

  return (
    <div className={className}>
      {label && <label className="label-text">{label}</label>}
      <div className="relative flex items-stretch">
        <input
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="input-field flex-1 pr-16"
        />
        {unitOptions && unitValue && onUnitChange ? (
          <select
            value={unitValue}
            onChange={(e) => onUnitChange(e.target.value)}
            className="absolute right-1 top-1 bottom-1 px-2 text-sm text-ice-600 bg-ice-50 border-0 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-ice-400/50"
          >
            {unitOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              {unit}
            </span>
          )
        )}
      </div>
    </div>
  );
}
