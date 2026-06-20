import { Droplets, CircleDot, TrendingUp } from 'lucide-react';
import type { DrainageResult } from '@/types';
import { cn } from '@/lib/utils';

interface ResultSummaryProps {
  result: DrainageResult;
  className?: string;
}

export function ResultSummary({ result, className }: ResultSummaryProps) {
  const slopeConfig = {
    excellent: { label: '优秀', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    good: { label: '良好', color: 'text-blue-600', bg: 'bg-blue-100' },
    poor: { label: '不足', color: 'text-amber-600', bg: 'bg-amber-100' },
    zero: { label: '为零', color: 'text-red-600', bg: 'bg-red-100' },
  };

  const slope = slopeConfig[result.slopeStatus];
  const capacityRatio = (result.drainCapacity / result.rainwaterVolume) * 100;
  const hasEnoughCapacity = capacityRatio >= 125;

  return (
    <div className={cn('border-2 border-zinc-300 p-4', className)}>
      <h3 className="text-sm font-semibold text-blue-800 mb-4 tracking-wide">
        计算结果摘要
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100">
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs text-zinc-500">雨水量</span>
          </div>
          <div className="text-xl font-bold text-zinc-800">
            {result.rainwaterVolume.toFixed(2)}
            <span className="text-sm font-normal text-zinc-500 ml-1">L/s</span>
          </div>
        </div>

        <div className="p-3 bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-100">
              <CircleDot className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs text-zinc-500">排水能力</span>
          </div>
          <div className="text-xl font-bold text-zinc-800">
            {result.drainCapacity.toFixed(2)}
            <span className="text-sm font-normal text-zinc-500 ml-1">L/s</span>
          </div>
        </div>

        <div className="p-3 bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs text-zinc-500">排水裕量</span>
          </div>
          <div className={cn(
            'text-xl font-bold',
            hasEnoughCapacity ? 'text-emerald-600' : 'text-amber-600'
          )}>
            {capacityRatio.toFixed(0)}
            <span className="text-sm font-normal text-zinc-500 ml-1">%</span>
          </div>
        </div>

        <div className="p-3 bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('p-1.5', slope.bg)}>
              <TrendingUp className={cn('w-4 h-4', slope.color)} />
            </div>
            <span className="text-xs text-zinc-500">坡度状态</span>
          </div>
          <div className={cn('text-xl font-bold', slope.color)}>
            {slope.label}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-zinc-500">汇水面积：</span>
            <span className="font-medium text-zinc-800">{result.areaM2.toFixed(2)} m²</span>
          </div>
          <div>
            <span className="text-zinc-500">单口排水：</span>
            <span className="font-medium text-zinc-800">{result.singleDrainCapacity.toFixed(2)} L/s</span>
          </div>
          <div>
            <span className="text-zinc-500">设计雨强：</span>
            <span className="font-medium text-zinc-800">{result.rainfallMmMin.toFixed(3)} mm/min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
