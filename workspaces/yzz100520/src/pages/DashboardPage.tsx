import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import LevelBadge from '@/components/LevelBadge';
import { cn } from '@/lib/utils';
import type { AnomalyLevel, BuildingAnomalySummary, WaterReading } from '@shared/types';
import { api } from '@/api/client';

interface ChartPoint {
  date: string;
  avgConsumption: number;
  isAnomaly: number;
}

const heatmapBg: Record<AnomalyLevel, string> = {
  severe: 'bg-gradient-to-br from-danger-500 to-danger-600',
  warning: 'bg-gradient-to-br from-warn-400 to-warn-500',
  normal: 'bg-gradient-to-br from-aqua-300 to-aqua-400',
};

function SummaryCards({
  overview,
  pendingRepairs,
}: {
  overview: BuildingAnomalySummary[];
  pendingRepairs: number;
}) {
  const stats = [
    {
      label: '总楼栋数',
      value: overview.length,
      icon: Building,
      color: 'text-ocean-600',
      bg: 'bg-ocean-50',
    },
    {
      label: '严重异常楼栋',
      value: overview.filter((o) => o.anomalyLevel === 'severe').length,
      icon: AlertTriangle,
      color: 'text-danger-500',
      bg: 'bg-red-50',
    },
    {
      label: '警告楼栋',
      value: overview.filter((o) => o.anomalyLevel === 'warning').length,
      icon: AlertCircle,
      color: 'text-warn-500',
      bg: 'bg-amber-50',
    },
    {
      label: '待处理维修单',
      value: pendingRepairs,
      icon: Wrench,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-xl p-5 shadow-card flex items-center"
        >
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', s.bg)}>
            <s.icon className={cn('w-6 h-6', s.color)} />
          </div>
          <div className="ml-4">
            <p className="text-sm text-ocean-500">{s.label}</p>
            <p className="text-2xl font-bold text-ocean-800 mt-0.5">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnomalyHeatmap({ overview }: { overview: BuildingAnomalySummary[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl p-5 shadow-card mb-6">
      <h3 className="text-lg font-semibold text-ocean-800 mb-4">异常热力图</h3>
      <div className="grid grid-cols-4 gap-4">
        {overview.map((b) => (
          <button
            key={b.buildingId}
            onClick={() => navigate(`/building/${b.buildingId}`)}
            className={cn(
              'text-white rounded-lg p-4 text-left transition-all',
              'hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer',
              heatmapBg[b.anomalyLevel]
            )}
          >
            <div className="flex items-start justify-between">
              <span className="font-bold text-lg">{b.buildingCode}</span>
              <LevelBadge level={b.anomalyLevel} />
            </div>
            <p className="text-sm mt-1 opacity-90 truncate">{b.buildingName}</p>
            <div className="mt-3 flex justify-between text-xs">
              <div>
                <span className="opacity-75">夜间峰值</span>
                <p className="font-semibold">{b.nightPeakConsumption} 吨</p>
              </div>
              <div className="text-right">
                <span className="opacity-75">连续异常</span>
                <p className="font-semibold">{b.consecutiveAnomalyDays} 天</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NightTrendChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card mb-6">
      <h3 className="text-lg font-semibold text-ocean-800 mb-4">近30天夜间平均用水趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="normalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5791bc" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5791bc" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="anomalyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              label={{ value: '吨', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(v: number) => [`${v} 吨`, '平均用水量']}
            />
            <Area
              type="monotone"
              dataKey="avgConsumption"
              stroke="#5791bc"
              strokeWidth={2}
              fill="url(#normalFill)"
            />
            <Area
              type="monotone"
              dataKey="isAnomaly"
              stroke="#dc2626"
              strokeWidth={0}
              fill="url(#anomalyFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AnomalyRanking({
  overview,
  excludeHoliday,
  onToggle,
}: {
  overview: BuildingAnomalySummary[];
  excludeHoliday: boolean;
  onToggle: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const sorted = useMemo(
    () => [...overview].sort((a, b) => b.nightPeakConsumption - a.nightPeakConsumption),
    [overview]
  );

  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ocean-800">异常排序榜</h3>
        <label className="flex items-center gap-2 text-sm text-ocean-600 cursor-pointer">
          <span>排除假期停用楼栋</span>
          <input
            type="checkbox"
            checked={excludeHoliday}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-4 h-4 accent-ocean-600"
          />
        </label>
      </div>
      <div className="space-y-2">
        {sorted.map((b, idx) => (
          <button
            key={b.buildingId}
            onClick={() => navigate(`/building/${b.buildingId}`)}
            className="w-full flex items-center p-3 rounded-lg hover:bg-ocean-50 transition-colors text-left"
          >
            <span
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4',
                idx < 3
                  ? 'bg-amber-400 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {idx + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-ocean-800">{b.buildingName}</p>
            </div>
            <div className="text-right mr-4">
              <p className="text-sm text-ocean-500">夜间峰值</p>
              <p className="font-semibold text-ocean-800">{b.nightPeakConsumption} 吨</p>
            </div>
            <div className="text-right mr-4">
              <p className="text-sm text-ocean-500">连续异常</p>
              <p className="font-semibold text-ocean-800">{b.consecutiveAnomalyDays} 天</p>
            </div>
            <LevelBadge level={b.anomalyLevel} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { overview, loading, excludeHoliday, setExcludeHoliday, fetchOverview, fetchBuildings } =
    useAppStore();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [pendingRepairs, setPendingRepairs] = useState(0);

  useEffect(() => {
    fetchBuildings();
    fetchOverview();
  }, [fetchBuildings, fetchOverview]);

  useEffect(() => {
    async function loadChartData() {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const readings: WaterReading[] = await api.getWaterReadings({
        startDate: fmt(start),
        endDate: fmt(today),
      });
      const nightReadings = readings.filter((r) => r.period === 'night');
      const byDate = new Map<string, number[]>();
      for (const r of nightReadings) {
        if (!byDate.has(r.readingDate)) byDate.set(r.readingDate, []);
        byDate.get(r.readingDate)!.push(r.consumption);
      }
      const result: ChartPoint[] = [];
      for (let i = 30; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = fmt(d);
        const vals = byDate.get(dateStr) || [];
        const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
        result.push({
          date: dateStr.slice(5),
          avgConsumption: avg,
          isAnomaly: avg > 8 ? avg : 0,
        });
      }
      setChartData(result);
    }
    async function loadRepairs() {
      const repairs = await api.getRepairs();
      setPendingRepairs(repairs.filter((r) => r.status === 'pending' || r.status === 'repairing').length);
    }
    loadChartData();
    loadRepairs();
  }, []);

  if (loading.overview) {
    return (
      <div className="flex items-center justify-center h-64 text-ocean-500">加载中...</div>
    );
  }

  return (
    <div className="p-6">
      <SummaryCards overview={overview} pendingRepairs={pendingRepairs} />
      <AnomalyHeatmap overview={overview} />
      <NightTrendChart data={chartData} />
      <AnomalyRanking
        overview={overview}
        excludeHoliday={excludeHoliday}
        onToggle={setExcludeHoliday}
      />
    </div>
  );
}
