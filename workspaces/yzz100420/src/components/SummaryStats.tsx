import {
  Thermometer,
  Timer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Gauge,
  Zap,
  Moon,
  Aperture,
} from 'lucide-react';
import type { FiringRecord } from '../types';
import { formatHours, formatTemp } from '../utils/curveCalc';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'fire' | 'cool' | 'warn' | 'good';
  iconBg?: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color = 'default',
  iconBg,
}: StatCardProps) => {
  const colorClasses: Record<string, string> = {
    default: 'text-kiln-800',
    fire: 'text-fire-600',
    cool: 'text-blue-600',
    warn: 'text-amber-600',
    good: 'text-emerald-600',
  };

  return (
    <div className="card-hoverable card p-4 group">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
            iconBg || 'bg-kiln-100 text-kiln-700'
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-kiln-500 uppercase tracking-wider">
            {label}
          </p>
          <p className={`mt-0.5 text-xl font-bold font-display ${colorClasses[color]} leading-tight`}>
            {value}
          </p>
          {sub && <p className="text-[11px] text-kiln-500 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

interface SummaryStatsProps {
  record: FiringRecord;
}

const SummaryStats = ({ record }: SummaryStatsProps) => {
  const s = record.summary;
  const gradeColors: Record<string, string> = {
    A: 'bg-gradient-to-br from-emerald-400 to-green-600',
    B: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    C: 'bg-gradient-to-br from-amber-400 to-orange-500',
    D: 'bg-gradient-to-br from-red-500 to-rose-700',
  };
  const gradeLabels: Record<string, string> = {
    A: '优秀',
    B: '良好',
    C: '一般',
    D: '待改进',
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 bg-gradient-to-br from-white/90 via-fire-50/40 to-kiln-50/60 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-kiln-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-kiln-900">
              {record.name}
            </h2>
            <p className="text-xs text-kiln-500 mt-1">
              {new Date(record.startAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ~{' '}
              {new Date(record.endAt).toLocaleString('zh-CN', {
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-kiln-600">
                <Thermometer className="w-3.5 h-3.5 text-fire-500" />
                {record.logPoints.length} 个测温点
              </span>
              <span className="flex items-center gap-1 text-xs text-kiln-600">
                <Timer className="w-3.5 h-3.5 text-kiln-500" />
                {formatHours(record.durationHours)}
              </span>
              {s.overnight && (
                <span className="flex items-center gap-1 text-xs text-indigo-600 badge bg-indigo-50 border-indigo-200">
                  <Moon className="w-3 h-3" />
                  跨夜烧成
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`grade-ring w-20 h-20 text-3xl shadow-xl ${
                gradeColors[record.overallGrade]
              }`}
            >
              {record.overallGrade}
            </div>
            <span className="text-xs font-semibold text-kiln-600 mt-2">
              {gradeLabels[record.overallGrade]}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Thermometer}
          label="峰值温度"
          value={formatTemp(s.peakTemp, record.unit)}
          sub={`在 T+${s.peakTime.toFixed(1)}h 到达`}
          color="fire"
          iconBg="bg-gradient-to-br from-fire-400 to-orange-500 text-white"
        />
        <StatCard
          icon={TrendingUp}
          label="平均升温速率"
          value={`${s.avgHeatingRate.toFixed(0)} ℃/h`}
          sub={s.avgHeatingRate > 150 ? '偏快，注意坯裂' : '升温节奏稳定'}
          color={s.avgHeatingRate > 150 ? 'warn' : 'good'}
          iconBg="bg-gradient-to-br from-orange-400 to-fire-500 text-white"
        />
        <StatCard
          icon={Aperture}
          label="总保温时长"
          value={formatHours(s.totalHoldingHours)}
          sub={s.totalHoldingHours < 1 ? '偏短，釉料反应不足' : '保温充足'}
          color={s.totalHoldingHours < 1 ? 'warn' : 'good'}
          iconBg="bg-gradient-to-br from-amber-400 to-yellow-500 text-white"
        />
        <StatCard
          icon={TrendingDown}
          label="平均降温速率"
          value={`${Math.abs(s.avgCoolingRate).toFixed(0)} ℃/h`}
          sub={Math.abs(s.avgCoolingRate) > 130 ? '偏快，易惊釉' : '冷却节奏正常'}
          color={Math.abs(s.avgCoolingRate) > 130 ? 'warn' : 'cool'}
          iconBg="bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Gauge}
          label="平均偏差"
          value={`±${s.avgDeviation.toFixed(1)} ℃`}
          sub={s.avgDeviation < 15 ? '控制良好' : s.avgDeviation < 30 ? '稍有波动' : '偏差较大'}
          color={s.avgDeviation < 15 ? 'good' : s.avgDeviation < 30 ? 'warn' : 'warn'}
          iconBg="bg-gradient-to-br from-emerald-400 to-green-600 text-white"
        />
        <StatCard
          icon={AlertTriangle}
          label="最大偏差"
          value={`${s.maxDeviation.toFixed(0)} ℃`}
          sub={`${s.deviationPeriods} 处高偏差时段`}
          color={s.maxDeviation > 40 ? 'warn' : 'default'}
          iconBg="bg-gradient-to-br from-red-400 to-rose-600 text-white"
        />
        <StatCard
          icon={Zap}
          label="日志断点"
          value={`${s.logGaps} 处`}
          sub={s.logGaps === 0 ? '记录完整' : '需关注数据缺失段'}
          color={s.logGaps === 0 ? 'good' : 'warn'}
          iconBg="bg-gradient-to-br from-purple-400 to-violet-600 text-white"
        />
        <StatCard
          icon={Moon}
          label="烧成时段"
          value={s.overnight ? '跨夜间' : '单日'}
          sub={formatHours(record.durationHours)}
          color="default"
          iconBg="bg-gradient-to-br from-indigo-400 to-purple-600 text-white"
        />
      </div>
    </div>
  );
};

export default SummaryStats;
