import { useMemo, useState } from 'react';
import type { WasteAnalysis, Dish } from '@/types';
import { getWasteColor } from '@/components/StatBadge';
import { AlertCircle } from 'lucide-react';

interface HeatmapProps {
  wasteData: WasteAnalysis[];
  dishes: Dish[];
  dates: string[];
}

export default function WasteHeatmap({ wasteData, dishes, dates }: HeatmapProps) {
  const [hovered, setHovered] = useState<{ dishId: string; date: string } | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, WasteAnalysis>();
    for (const w of wasteData) {
      map.set(`${w.dishId}__${w.date}`, w);
    }
    return map;
  }, [wasteData]);

  const visibleDishes = dishes.slice(0, 12);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex">
          <div className="w-28 flex-shrink-0" />
          <div className="flex">
            {dates.map((date) => {
              const d = new Date(date);
              const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={date}
                  className="w-10 h-10 flex flex-col items-center justify-center text-[10px] leading-tight flex-shrink-0"
                >
                  <span className={isWeekend ? 'text-brand-400 font-medium' : 'text-surface-700'}>
                    {d.getMonth() + 1}/{d.getDate()}
                  </span>
                  <span className="text-surface-700/60">{dayOfWeek}</span>
                </div>
              );
            })}
          </div>
        </div>

        {visibleDishes.map((dish, rowIdx) => (
          <div key={dish.id} className="flex" style={{ animationDelay: `${rowIdx * 30}ms` }}>
            <div className="w-28 h-9 pr-2 flex items-center justify-end text-xs text-slate-300 truncate flex-shrink-0">
              {dish.name}
            </div>
            <div className="flex">
              {dates.map((date) => {
                const w = cellMap.get(`${dish.id}__${date}`);
                const isHovered = hovered?.dishId === dish.id && hovered?.date === date;

                if (!w) {
                  return (
                    <div
                      key={`${dish.id}-${date}`}
                      className="w-10 h-9 m-px rounded bg-surface-850/40 flex items-center justify-center"
                    >
                      <span className="text-[8px] text-surface-800">—</span>
                    </div>
                  );
                }

                const colors = getWasteColor(w.wasteRate);
                const intensity = Math.min(w.wasteRate / 100, 1);

                return (
                  <div
                    key={`${dish.id}-${date}`}
                    className="w-10 h-9 m-px rounded cursor-pointer flex items-center justify-center relative transition-all duration-150"
                    style={{
                      backgroundColor: `hsl(var(--hsl-${w.wasteRate < 15 ? 'success' : w.wasteRate < 30 ? 'warning' : 'danger'}) / ${0.15 + intensity * 0.7})`,
                      background: w.wasteRate < 15
                        ? `rgba(16, 185, 129, ${0.15 + intensity * 0.5})`
                        : w.wasteRate < 30
                        ? `rgba(245, 158, 11, ${0.15 + intensity * 0.5})`
                        : `rgba(244, 63, 94, ${0.15 + intensity * 0.6})`,
                      transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                      boxShadow: isHovered ? '0 0 16px rgba(249,115,22,0.4)' : 'none',
                    }}
                    onMouseEnter={() => setHovered({ dishId: dish.id, date })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className={`text-[10px] font-mono font-semibold ${colors.text}`}>
                      {w.wasteRate.toFixed(0)}
                    </span>
                    {w.isEstimated && (
                      <AlertCircle className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-warning-400" />
                    )}

                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-surface-950 border border-surface-700 rounded-lg p-3 shadow-2xl text-left">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white text-sm">{dish.name}</span>
                          <span className="text-xs text-surface-700">{date}</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-surface-700">浪费率</span>
                            <span className={`font-mono ${colors.text}`}>{w.wasteRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-700">浪费量</span>
                            <span className="font-mono text-slate-200">{w.wastedKg.toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-surface-700">浪费金额</span>
                            <span className="font-mono text-brand-400">¥{w.wastedCost.toFixed(0)}</span>
                          </div>
                          {w.isEstimated && (
                            <div className="pt-1 mt-1 border-t border-surface-800 text-warning-400">
                              ⚠ 为估算值，当日缺称重
                            </div>
                          )}
                          {w.note && (
                            <div className="pt-1 mt-1 border-t border-surface-800 text-slate-300">
                              备注：{w.note}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex mt-6 items-center gap-3 pl-28">
          <span className="text-xs text-surface-700">浪费率：</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ background: 'rgba(16, 185, 129, 0.35)' }} />
            <span className="text-xs text-success-400">低</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ background: 'rgba(245, 158, 11, 0.45)' }} />
            <span className="text-xs text-warning-400">中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded" style={{ background: 'rgba(244, 63, 94, 0.55)' }} />
            <span className="text-xs text-danger-400">高</span>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <AlertCircle className="w-3 h-3 text-warning-400" />
            <span className="text-xs text-surface-700">估算值（缺称重）</span>
          </div>
        </div>
      </div>
    </div>
  );
}
