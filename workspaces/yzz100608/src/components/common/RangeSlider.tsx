import React from 'react';

interface RangeSliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  hint?: React.ReactNode;
  valueFormatter?: (v: number) => string;
  className?: string;
  showMarkers?: boolean;
  markerCount?: number;
  accentColor?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  labelRight,
  hint,
  valueFormatter,
  className = '',
  showMarkers = false,
  markerCount = 5,
  accentColor = 'var(--accent-primary)',
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const [drag, setDrag] = React.useState(false);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {(label || labelRight) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <div className="text-xs font-medium text-text-secondary tracking-wide">{label}</div>
          )}
          {labelRight ?? (
            <div
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md"
              style={{
                background: `${accentColor}22`,
                color: accentColor,
                border: `1px solid ${accentColor}44`,
              }}
            >
              {valueFormatter ? valueFormatter(value) : value.toFixed(step < 1 ? 1 : 0)}
            </div>
          )}
        </div>
      )}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-[6px] rounded-full bg-[rgba(10,22,40,0.8)] border border-custom overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
              boxShadow: drag ? `0 0 12px ${accentColor}88` : `0 0 6px ${accentColor}55`,
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setDrag(true)}
          onMouseUp={() => setDrag(false)}
          onTouchStart={() => setDrag(true)}
          onTouchEnd={() => setDrag(false)}
          className="range-slider relative z-10 opacity-0 cursor-pointer"
        />
        <div
          className={`absolute pointer-events-none w-[18px] h-[18px] rounded-full border-2 border-[#0a1628] transition-all duration-100 ${
            drag ? 'scale-115' : ''
          }`}
          style={{
            left: `calc(${pct}% - 9px)`,
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            boxShadow: drag
              ? `0 0 0 6px ${accentColor}22, 0 2px 10px ${accentColor}77`
              : `0 2px 6px ${accentColor}55`,
          }}
        />
        {showMarkers && (
          <div className="absolute inset-x-0 top-[22px] flex justify-between px-[9px] pointer-events-none">
            {Array.from({ length: markerCount }).map((_, i) => {
              const v = min + ((max - min) * i) / (markerCount - 1);
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-px h-1.5 bg-text-muted/40" />
                  <div className="text-[9px] text-text-muted mt-0.5 font-mono">
                    {valueFormatter ? valueFormatter(v) : Math.round(v)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hint && <div className="text-[11px] text-text-muted leading-tight mt-1">{hint}</div>}
    </div>
  );
};
