import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  isAlert?: boolean;
  colorClass?: string;
  delay?: number;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 800;
    const start = 0;
    const startTime = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (value - start) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

export default function KpiCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  isAlert,
  colorClass = 'text-primary-700',
  delay = 0,
}: KpiCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const hasDecimals = typeof value === 'number' && !Number.isInteger(value);

  return (
    <div
      className={clsx('stat-card', isAlert && 'stat-card-alert')}
      style={{ animationDelay: `${delay}ms`, opacity: 0, animation: 'fade-in-up 0.5s ease-out forwards' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-warm-500 font-medium">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className={clsx('text-3xl font-serif font-bold', colorClass)}>
              {typeof value === 'number' ? (
                <AnimatedNumber value={numericValue} decimals={hasDecimals ? 1 : 0} />
              ) : (
                value
              )}
            </span>
            {unit && <span className="text-sm text-warm-500">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-accent-500" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-warm-400" />
              )}
              <span className={clsx(
                'text-xs font-medium',
                trend > 0 ? 'text-accent-500' : trend < 0 ? 'text-green-600' : 'text-warm-400'
              )}>
                {trend > 0 ? '+' : ''}{trend}% {trendLabel || '较上月'}
              </span>
            </div>
          )}
        </div>
        <div className={clsx(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          isAlert ? 'bg-accent-100 text-accent-600' : 'bg-primary-50 text-primary-600'
        )}>
          {icon}
        </div>
      </div>
      <div className={clsx(
        'absolute bottom-0 left-0 right-0 h-1',
        isAlert ? 'bg-gradient-to-r from-accent-400 to-accent-500' : 'bg-gradient-to-r from-primary-400 to-primary-600'
      )} style={{ transformOrigin: 'left', animation: 'scaleX 1s ease-out forwards', animationDelay: `${delay + 200}ms` }} />
    </div>
  );
}
