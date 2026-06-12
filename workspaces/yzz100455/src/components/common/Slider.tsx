interface SliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  valueFormat?: (val: number) => string;
  className?: string;
}

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  valueFormat,
  className = '',
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const displayValue = valueFormat ? valueFormat(value) : value.toString();

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <label className="label-text mb-0">{label}</label>
          {showValue && (
            <span className="text-sm font-medium text-ice-600">{displayValue}</span>
          )}
        </div>
      )}
      <div className="relative h-2 bg-slate-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-ice-400 to-ice-500 rounded-full transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-ice-500 rounded-full shadow-md pointer-events-none transition-all duration-100"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}
