import { useState } from 'react';
import { ChevronDown, ChevronUp, Flame, Snowflake, Timer, AlertTriangle, CheckCircle2, Gauge } from 'lucide-react';
import type { FiringSegment } from '../types';
import { formatHours, formatTemp, segmentTypeNames } from '../utils/curveCalc';
import { cn } from '../lib/utils';

const typeIcons = {
  heating: Flame,
  holding: Timer,
  cooling: Snowflake,
};

const typeColors = {
  heating: {
    bg: 'from-fire-50 to-orange-50',
    border: 'fire-200',
    accent: 'fire-600',
    text: 'fire-700',
    badgeBg: 'bg-fire-100 text-fire-700 border-fire-200',
    iconBg: 'bg-fire-500',
  },
  holding: {
    bg: 'from-amber-50 to-yellow-50',
    border: 'amber-200',
    accent: 'amber-600',
    text: 'amber-700',
    badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-500',
  },
  cooling: {
    bg: 'from-blue-50 to-sky-50',
    border: 'blue-200',
    accent: 'blue-600',
    text: 'blue-700',
    badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-500',
  },
};

interface SegmentCardProps {
  segment: FiringSegment;
  index: number;
  onClick?: () => void;
  selected?: boolean;
}

const SegmentCard = ({ segment, index, onClick, selected }: SegmentCardProps) => {
  const [expanded, setExpanded] = useState(selected || index === 0);
  const colors = typeColors[segment.type];
  const Icon = typeIcons[segment.type];

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-300 overflow-hidden',
        selected
          ? `border-${colors.border} shadow-lg shadow-${colors.accent}/10`
          : `border-${colors.border}/60 hover:border-${colors.border} hover:shadow-card`,
        `bg-gradient-to-br ${colors.bg}`,
      )}
      style={{
        borderColor: selected ? undefined : undefined,
      }}
    >
      <button
        className={cn('w-full p-4 flex items-center gap-4 text-left', onClick ? 'cursor-pointer' : '')}
        onClick={() => {
          setExpanded(!expanded);
          onClick?.();
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md',
              colors.iconBg,
            )}
          >
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <span className={`grade-ring w-7 h-7 text-xs grade-${segment.grade || 'B'}`}>
            {segment.grade || 'B'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${colors.badgeBg}`}>
              {segmentTypeNames[segment.type]}
            </span>
            <span className="text-xs font-mono text-kiln-500">段 #{index + 1}</span>
            {segment.maxDeviationValue > 20 && (
              <span className="badge bg-red-100 text-red-700 border-red-200">
                <AlertTriangle className="w-3 h-3" />
                偏差大
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`text-sm font-bold font-mono text-${colors.text}`}>
              {formatTemp(segment.startTemp, 'C', false)} →{' '}
              {formatTemp(segment.endTemp, 'C', false)} ℃
            </span>
            <span className="text-xs text-kiln-500">
              T+{segment.startTime.toFixed(1)}h ~ T+{segment.endTime.toFixed(1)}h
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end mb-1">
            <Gauge className={`w-3.5 h-3.5 text-${colors.accent}`} />
            <span className={`text-sm font-bold font-mono text-${colors.text}`}>
              {segment.rate > 0 ? '+' : ''}
              {segment.rate.toFixed(0)}
              <span className="text-[10px] font-normal ml-0.5 text-kiln-500">
                ℃/h
              </span>
            </span>
          </div>
          <p className="text-[11px] text-kiln-500">{formatHours(segment.durationHours)}</p>
        </div>

        <div className={`text-${colors.accent} transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 animate-fade-in">
          <div className="ml-15 pl-[68px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <p className="text-[10px] text-kiln-500 uppercase tracking-wider font-medium mb-1">
                  持续时长
                </p>
                <p className="text-base font-bold font-mono text-kiln-800">
                  {formatHours(segment.durationHours)}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <p className="text-[10px] text-kiln-500 uppercase tracking-wider font-medium mb-1">
                  温度变化
                </p>
                <p className={`text-base font-bold font-mono text-${colors.text}`}>
                  {segment.tempChange > 0 ? '+' : ''}
                  {segment.tempChange.toFixed(0)} ℃
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <p className="text-[10px] text-kiln-500 uppercase tracking-wider font-medium mb-1">
                  平均偏差
                </p>
                <p
                  className={cn(
                    'text-base font-bold font-mono',
                    segment.avgDeviation > 20
                      ? 'text-red-600'
                      : segment.avgDeviation > 10
                        ? 'text-amber-600'
                        : 'text-green-600',
                  )}
                >
                  ±{segment.avgDeviation.toFixed(1)} ℃
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-white">
                <p className="text-[10px] text-kiln-500 uppercase tracking-wider font-medium mb-1">
                  最大偏差
                </p>
                <p
                  className={cn(
                    'text-base font-bold font-mono',
                    Math.abs(segment.maxDeviationValue) > 30
                      ? 'text-red-600'
                      : Math.abs(segment.maxDeviationValue) > 15
                        ? 'text-amber-600'
                        : 'text-green-600',
                  )}
                >
                  {segment.maxDeviationValue > 0 ? '+' : ''}
                  {segment.maxDeviationValue.toFixed(0)} ℃
                </p>
              </div>
            </div>

            {segment.targetRate && segment.type !== 'holding' && (
              <div className="mt-3 p-3 bg-white/70 rounded-lg border border-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-kiln-600">
                    速率对比：目标 vs 实际
                  </span>
                  {Math.abs(segment.rate / segment.targetRate - 1) < 0.2 ? (
                    <span className="badge bg-green-100 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> 正常
                    </span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-700 border-amber-200">
                      <AlertTriangle className="w-3 h-3" />{' '}
                      {Math.abs(segment.rate) > Math.abs(segment.targetRate) ? '偏快' : '偏慢'}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-kiln-100 overflow-hidden relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-slate-400/40 border-r-2 border-slate-500"
                    style={{ width: `${Math.min(100, (Math.abs(segment.targetRate) / 300) * 100)}%` }}
                  />
                  <div
                    className={cn('absolute left-0 top-0 h-full', colors.iconBg)}
                    style={{ width: `${Math.min(100, (Math.abs(segment.rate) / 300) * 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-mono text-kiln-500">
                  <span>目标: {segment.targetRate.toFixed(0)} ℃/h</span>
                  <span>实际: {segment.rate.toFixed(0)} ℃/h</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SegmentPanelProps {
  segments: FiringSegment[];
  onSegmentClick?: (segmentId: string) => void;
  selectedSegmentId?: string | null;
}

const SegmentPanel = ({ segments, onSegmentClick, selectedSegmentId }: SegmentPanelProps) => {
  const heating = segments.filter((s) => s.type === 'heating');
  const holding = segments.filter((s) => s.type === 'holding');
  const cooling = segments.filter((s) => s.type === 'cooling');

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-display font-bold text-kiln-800">分段分析</h3>
          <p className="text-xs text-kiln-500 mt-0.5">
            自动识别烧成阶段：升温 {heating.length} 段 · 保温 {holding.length} 段 · 降温 {cooling.length} 段
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="badge bg-fire-100 text-fire-700 border-fire-200">
            <Flame className="w-3 h-3" />
            升温 {heating.length}
          </span>
          <span className="badge bg-amber-100 text-amber-700 border-amber-200">
            <Timer className="w-3 h-3" />
            保温 {holding.length}
          </span>
          <span className="badge bg-blue-100 text-blue-700 border-blue-200">
            <Snowflake className="w-3 h-3" />
            降温 {cooling.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 custom-scroll-container overflow-y-auto max-h-[560px] pr-1">
        {segments.map((seg, idx) => (
          <SegmentCard
            key={seg.id}
            segment={seg}
            index={idx}
            selected={selectedSegmentId === seg.id}
            onClick={() => onSegmentClick?.(seg.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default SegmentPanel;
