import { useState, useRef, useCallback, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  error?: boolean;
  disabled?: boolean;
}

const ScoreSlider: React.FC<ScoreSliderProps> = ({
  value,
  onChange,
  label,
  min = 0,
  max = 10,
  step = 0.25,
  error = false,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const isOutOfRange = value < min || value > max;
  const clampedPercentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const getScoreColor = (score: number): string => {
    if (score > max) return 'from-red-500 to-red-700';
    if (score < min) return 'from-red-400 to-red-600';
    if (score >= 9) return 'from-emerald-400 to-emerald-600';
    if (score >= 8) return 'from-green-400 to-green-600';
    if (score >= 7) return 'from-amber-400 to-amber-600';
    if (score >= 6) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score > max) return '超出上限';
    if (score < min) return '低于下限';
    if (score >= 9.5) return '卓越';
    if (score >= 9.0) return '优秀';
    if (score >= 8.5) return '很好';
    if (score >= 8.0) return '好';
    if (score >= 7.5) return '良好';
    if (score >= 7.0) return '中等偏上';
    if (score >= 6.0) return '中等';
    if (score >= 5.0) return '中下';
    return '较差';
  };

  const updateValueFromEvent = useCallback(
    (clientX: number) => {
      if (!sliderRef.current || disabled) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const rawValue = min + pct * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));
      
      onChange(Number(clampedValue.toFixed(2)));
    },
    [min, max, step, onChange, disabled]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      setIsDragging(true);
      updateValueFromEvent(e.clientX);
    },
    [disabled, updateValueFromEvent]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValueFromEvent(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValueFromEvent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(Number(val.toFixed(2)));
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-coffee-700">{label}</label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-lg font-bold font-serif',
              isOutOfRange ? 'text-red-600' : 'text-coffee-900'
            )}
          >
            {value.toFixed(2)}
          </span>
          <span
            className={cn(
              'text-xs',
              isOutOfRange ? 'text-red-500 font-semibold' : 'text-coffee-500'
            )}
          >
            {isOutOfRange && <AlertCircle className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
            {getScoreLabel(value)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div
          ref={sliderRef}
          className={cn(
            'relative flex-1 h-3 rounded-full cursor-pointer select-none',
            'bg-coffee-200',
            isOutOfRange && 'ring-2 ring-red-400 ring-offset-1',
            error && 'ring-2 ring-red-400 ring-offset-1',
            isDragging && 'cursor-grabbing',
            !disabled && 'hover:bg-coffee-300',
            'transition-colors'
          )}
          onMouseDown={handleMouseDown}
        >
          <div
            className={cn(
              'absolute top-0 left-0 h-full rounded-full bg-gradient-to-r',
              getScoreColor(value)
            )}
            style={{ width: `${clampedPercentage}%` }}
          />
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
              'w-6 h-6 rounded-full bg-white shadow-lg border-2',
              isOutOfRange ? 'border-red-400' : 'border-coffee-400',
              'transition-transform',
              isDragging && 'scale-110',
              isDragging && !isOutOfRange && 'border-coffee-600',
              !disabled && 'hover:scale-110 hover:border-coffee-500'
            )}
            style={{ left: `${clampedPercentage}%` }}
          />
        </div>

        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          step={step}
          disabled={disabled}
          className={cn(
            'w-20 px-2 py-1.5 text-center text-sm font-medium',
            'border rounded-lg bg-white',
            'focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent',
            isOutOfRange
              ? 'border-red-400 text-red-600 bg-red-50'
              : 'border-coffee-300 text-coffee-800',
            disabled && 'bg-coffee-100 cursor-not-allowed'
          )}
        />
      </div>

      {isOutOfRange && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          分数必须在 {min}-{max} 之间
        </p>
      )}

      <div className="flex justify-between text-xs text-coffee-400">
        <span>{min}</span>
        <span>{(max / 2).toFixed(0)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default ScoreSlider;
