import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  subText?: string;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, gradient, subText, trend, className, delay = 0 }: StatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 800;
      const start = performance.now();
      const from = 0;
      const to = value;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div
      className={cn(
        'stat-card animate-fade-in-up',
        className
      )}
      style={{ background: gradient, animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-1/4 translate-x-1/4 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center text-white">
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <span className={cn(
              'text-xs font-medium px-2 py-1 rounded-md bg-white/20 text-white/90 backdrop-blur-sm',
              trend === 'up' && 'bg-emerald-400/30',
              trend === 'down' && 'bg-rose-400/30'
            )}>
              {trend === 'up' ? '↑ 上升' : trend === 'down' ? '↓ 下降' : '→ 持平'}
            </span>
          )}
        </div>
        <div className="text-3xl font-mono font-bold text-white mb-1 tracking-tight">
          {display.toLocaleString()}
        </div>
        <div className="text-sm text-white/85 font-medium">
          {label}
        </div>
        {subText && (
          <div className="mt-2 text-xs text-white/70">
            {subText}
          </div>
        )}
      </div>
    </div>
  );
}
