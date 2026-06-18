import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app';
import { StatCard } from '@/components/StatCard';
import { Tag, Button } from '@/components/UI';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Download,
  ShieldAlert,
  Package,
  Lock,
  CalendarRange,
  Users,
  AlertTriangle,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { dayjs, downloadCSV, formatDateTime } from '@/utils';
import { VIOLATION_LABEL, LOST_ITEM_LABEL } from '@/types';
import { cn } from '@/lib/utils';

type Granularity = 'daily' | 'weekly';
const GRANULE: { key: Granularity; label: string }[] = [
  { key: 'daily', label: '按日' },
  { key: 'weekly', label: '按周' },
];
const DAY_WINDOW = [7, 14, 30];

interface UtilRow {
  period: string;
  dateStart: string;
  seats: number;
  reservations: number;
  avgOccupancy: number;
  peak: number;
  violations: number;
  lostItems: number;
}

export default function OwnerPage() {
  const seats = useAppStore((s) => s.seats);
  const lockers = useAppStore((s) => s.lockers);
  const reservations = useAppStore((s) => s.reservations);
  const violations = useAppStore((s) => s.violations);
  const lostItems = useAppStore((s) => s.lostItems);
  const snapshots = useAppStore((s) => s.snapshots);
  const clearances = useAppStore((s) => s.clearances);

  const [window, setWindow] = useState(14);
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [tab, setTab] = useState<'overview' | 'violations' | 'lockers' | 'lost'>('overview');

  const totalSeats = seats.length || 60;
  const totalLockers = lockers.length || 60;

  const utilRows: UtilRow[] = useMemo(() => {
    const days: string[] = [];
    for (let i = window - 1; i >= 0; i--) {
      days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    }
    const perDay: UtilRow[] = days.map((d) => {
      const dSnaps = snapshots.filter((s) => s.date === d);
      const occList = dSnaps.map((s) => s.occupiedSeats);
      const rates = occList.map((o) => Math.round((o / totalSeats) * 100));
      const reserv = reservations.filter((r) =>
        dayjs(r.reservedAt).isSame(dayjs(d), 'day'),
      ).length;
      const viol = violations.filter((v) =>
        dayjs(v.occurredAt).isSame(dayjs(d), 'day'),
      ).length;
      const lost = lostItems.filter((l) =>
        dayjs(l.foundAt).isSame(dayjs(d), 'day'),
      ).length;
      const avg = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
      const peak = rates.length ? Math.max(...rates) : 0;
      return {
        period: dayjs(d).format('M/D'),
        dateStart: d,
        seats: totalSeats,
        reservations: reserv,
        avgOccupancy: avg,
        peak,
        violations: viol,
        lostItems: lost,
      };
    });
    if (granularity === 'weekly') {
      const buckets: UtilRow[][] = [];
      perDay.forEach((row, i) => {
        const bucketIdx = Math.floor(i / 7);
        (buckets[bucketIdx] ||= []).push(row);
      });
      return buckets.map((group, gIdx) => {
        const first = group[0].dateStart;
        const last = group[group.length - 1].dateStart;
        const avg =
          group.reduce((a, b) => a + b.avgOccupancy, 0) / Math.max(1, group.length);
        return {
          period: `第${gIdx + 1}周`,
          dateStart: `${first}~${last}`,
          seats: totalSeats,
          reservations: group.reduce((a, b) => a + b.reservations, 0),
          avgOccupancy: Math.round(avg),
          peak: Math.max(...group.map((x) => x.peak)),
          violations: group.reduce((a, b) => a + b.violations, 0),
          lostItems: group.reduce((a, b) => a + b.lostItems, 0),
        };
      });
    }
    return perDay.map((d) => ({
      period: dayjs(d.dateStart).format('M/D'),
      dateStart: d.dateStart,
      seats: d.seats,
      reservations: d.reservations,
      avgOccupancy: d.avgOccupancy,
      peak: d.peak,
      violations: d.violations,
      lostItems: d.lostItems,
    }));
  }, [window, granularity, snapshots, reservations, violations, lostItems, totalSeats]);

  const periodStats = useMemo(() => {
    const avg =
      utilRows.reduce((a, b) => a + b.avgOccupancy, 0) / Math.max(1, utilRows.length);
    const reservTotal = utilRows.reduce((a, b) => a + b.reservations, 0);
    const violTotal = utilRows.reduce((a, b) => a + b.violations, 0);
    const lostTotal = utilRows.reduce((a, b) => a + b.lostItems, 0);
    const peak = Math.max(...utilRows.map((x) => x.peak), 0);

    const reservCompleted = reservations.filter(
      (r) => r.status === 'completed' && dayjs(r.reservedAt).isAfter(dayjs().subtract(window, 'day')),
    );
    const avgMinutes =
      reservCompleted.length > 0
        ? Math.round(
            reservCompleted.reduce((a, r) => a + (r.totalMinutes || 0), 0) /
              reservCompleted.length,
          )
        : 0;
    const turnover = reservCompleted.length;

    const inUseLockers = lockers.filter((l) => l.status === 'in_use').length;
    const maintLockers = lockers.filter((l) => l.status === 'maintenance').length;
    const lockerUtil = Math.round((inUseLockers / Math.max(1, totalLockers - maintLockers)) * 100);

    return {
      avg: Math.round(avg),
      reservTotal,
      violTotal,
      lostTotal,
      peak,
      avgMinutes,
      turnover,
      inUseLockers,
      maintLockers,
      lockerUtil,
    };
  }, [utilRows, reservations, lockers, totalLockers, window]);

  const violationTypeRows = useMemo(() => {
    const from = dayjs().subtract(window, 'day').startOf('day').valueOf();
    const map = new Map<string, number>();
    for (const v of violations) {
      if (v.occurredAt >= from) map.set(v.type, (map.get(v.type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      type: k,
      label: VIOLATION_LABEL[k as keyof typeof VIOLATION_LABEL] ?? k,
      count: v,
    }));
  }, [violations, window]);

  const pieColors = ['#2D5C48', '#E8A838', '#C25450', '#5C9178', '#A36D18', '#7D5313'];

  const lockerData = useMemo(() => {
    const avail = lockers.filter((l) => l.status === 'available').length;
    const inUse = lockers.filter((l) => l.status === 'in_use').length;
    const maint = lockers.filter((l) => l.status === 'maintenance').length;
    return [
      { name: '使用中', value: inUse, color: '#2D5C48' },
      { name: '空闲', value: avail, color: '#B7CDC0' },
      { name: '维修中', value: maint, color: '#C25450' },
    ];
  }, [lockers]);

  const doExportUtil = () => {
    const rows = utilRows.map((r) => ({
      周期: r.period,
      日期范围: r.dateStart,
      座位数: r.seats,
      预约数: r.reservations,
      平均上座率: r.avgOccupancy + '%',
      峰值上座率: r.peak + '%',
      违规数: r.violations,
      遗留物数: r.lostItems,
    }));
    downloadCSV(`利用率报表_${dayjs().format('YYYYMMDD_HHmm')}.csv`, rows);
  };

  const doExportViolations = () => {
    const from = dayjs().subtract(window, 'day').startOf('day').valueOf();
    const rows = violations
      .filter((v) => v.occurredAt >= from)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .map((v) => ({
        时间: formatDateTime(v.occurredAt),
        座位: v.seatCode,
        学生: v.studentName ?? '--',
        类型: VIOLATION_LABEL[v.type] ?? v.type,
        说明: v.description,
        处理状态: v.handled ? '已处理' : '待处理',
        处理人: v.handledBy ?? '--',
        处理时间: v.handledAt ? formatDateTime(v.handledAt) : '--',
      }));
    downloadCSV(`违规报表_${dayjs().format('YYYYMMDD_HHmm')}.csv`, rows);
  };

  const doExportLost = () => {
    const rows = lostItems
      .sort((a, b) => b.foundAt - a.foundAt)
      .map((l) => ({
        座位: l.seatCode,
        类型: LOST_ITEM_LABEL[l.type] ?? l.type,
        描述: l.description,
        发现时间: formatDateTime(l.foundAt),
        清场批次: l.clearanceId,
        认领状态: l.claimed ? '已认领' : '待认领',
        认领人: l.claimedBy ?? '--',
        认领时间: l.claimedAt ? formatDateTime(l.claimedAt) : '--',
      }));
    downloadCSV(`遗留物报表_${dayjs().format('YYYYMMDD_HHmm')}.csv`, rows);
  };

  const doExportLockers = () => {
    const rows = lockers.map((l) => ({
      柜号: l.code,
      区域: l.zone + '区 ' + l.floor + '楼',
      状态: ({ available: '空闲', in_use: '使用中', maintenance: '维修中' } as Record<string, string>)[l.status],
      关联座位: seats.find((s) => s.id === l.seatId)?.code ?? '--',
      学生: seats.find((s) => s.id === l.seatId)?.studentName ?? '--',
    }));
    downloadCSV(`储物柜状态_${dayjs().format('YYYYMMDD_HHmm')}.csv`, rows);
  };

  return (
    <div className="grain-bg min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-800">老板仪表盘</h1>
            <p className="mt-1 text-sm text-ink-500">
              经营指标总览 · 违规与柜位分析 · 一键导出CSV报表
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <CalendarRange className="text-ink-400" size={16} />
              <span className="text-sm text-ink-500 mr-2">时间窗口</span>
              <div className="flex rounded-xl border border-ink-200 bg-white p-1">
                {DAY_WINDOW.map((d) => (
                  <button
                    key={d}
                    onClick={() => setWindow(d)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                      window === d ? 'bg-ink-700 text-white' : 'text-ink-600 hover:bg-ink-50',
                    )}
                  >
                    {d}天
                  </button>
                ))}
              </div>
              <div className="ml-2 flex rounded-xl border border-ink-200 bg-white p-1">
                {GRANULE.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGranularity(g.key)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                      granularity === g.key
                        ? 'bg-ink-700 text-white'
                        : 'text-ink-600 hover:bg-ink-50',
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 p-1">
              <ChevronDown className="ml-1 text-amber-600" size={14} />
              <Button variant="ghost" size="sm" onClick={doExportUtil}>
                <FileSpreadsheet size={14} /> 利用率
              </Button>
              <Button variant="ghost" size="sm" onClick={doExportViolations}>
                <ShieldAlert size={14} /> 违规
              </Button>
              <Button variant="ghost" size="sm" onClick={doExportLost}>
                <Package size={14} /> 遗留物
              </Button>
              <Button variant="ghost" size="sm" onClick={doExportLockers}>
                <Lock size={14} /> 柜位
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatCard
            label="平均上座率"
            value={`${periodStats.avg}%`}
            trend={{ value: 6, label: '环比' }}
            accent="ink"
            icon={<TrendingUp size={20} />}
          />
          <StatCard
            label="峰值上座率"
            value={`${periodStats.peak}%`}
            hint={`${window}天内最高`}
            accent="moss"
            icon={<BarChart3 size={20} />}
          />
          <StatCard
            label="累计预约"
            value={periodStats.reservTotal}
            hint="含已完成/取消"
            accent="ink"
            icon={<Users size={20} />}
          />
          <StatCard
            label="周转次数"
            value={periodStats.turnover}
            hint={periodStats.avgMinutes ? `单均${periodStats.avgMinutes}分钟` : '暂无数据'}
            accent="moss"
            icon={<CheckCircle2 size={20} />}
          />
          <StatCard
            label="累计违规"
            value={periodStats.violTotal}
            hint={`${window}天范围`}
            accent="clay"
            icon={<AlertTriangle size={20} />}
          />
          <StatCard
            label="柜位利用率"
            value={`${periodStats.lockerUtil}%`}
            hint={`维修中${periodStats.maintLockers}个`}
            accent="amber"
            icon={<Lock size={20} />}
          />
        </div>

        <div className="mt-6 mb-4 flex items-center gap-1 border-b border-ink-100">
          {(['overview', 'violations', 'lockers', 'lost'] as const).map((t) => {
            const icons = {
              overview: BarChart3,
              violations: ShieldAlert,
              lockers: Lock,
              lost: Package,
            };
            const labels = {
              overview: '经营总览',
              violations: '违规分析',
              lockers: '柜位分析',
              lost: '遗留物台账',
            };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px',
                  tab === t
                    ? 'text-ink-800 border-ink-700'
                    : 'text-ink-500 border-transparent hover:text-ink-700',
                )}
              >
                <Icon size={15} />
                {labels[t]}
              </button>
            );
          })}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-800">
                      上座率与预约数趋势
                    </h3>
                    <p className="mt-1 text-xs text-ink-500">
                      面积为平均上座率（%），折线为预约数量
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={doExportUtil}>
                    <Download size={14} /> 导出此表
                  </Button>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={utilRows}>
                      <defs>
                        <linearGradient id="occG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2D5C48" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#2D5C48" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 4" stroke="#DBE6DF" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={{ stroke: '#B7CDC0' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                        width={40}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: '#A36D18' }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #DBE6DF',
                          fontSize: 12,
                          boxShadow: '0 8px 24px rgba(15,42,32,0.08)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="avgOccupancy"
                        name="平均上座率"
                        stroke="#2D5C48"
                        strokeWidth={2.5}
                        fill="url(#occG)"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="reservations"
                        name="预约数"
                        stroke="#E8A838"
                        strokeWidth={2}
                        fill="none"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-ink-800">
                    周期明细
                  </h3>
                  <span className="text-xs text-ink-500">{utilRows.length} 条记录</span>
                </div>
                <div className="overflow-x-auto scrollbar-thin -mx-2 px-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                        <th className="py-2.5 pr-4 font-medium">周期</th>
                        <th className="py-2.5 pr-4 font-medium">日期范围</th>
                        <th className="py-2.5 pr-4 font-medium">预约</th>
                        <th className="py-2.5 pr-4 font-medium">均上座</th>
                        <th className="py-2.5 pr-4 font-medium">峰值</th>
                        <th className="py-2.5 pr-4 font-medium">违规</th>
                        <th className="py-2.5 font-medium">遗留物</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilRows.map((r, i) => (
                        <tr
                          key={i}
                          className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40"
                        >
                          <td className="py-3 pr-4 font-medium text-ink-800">{r.period}</td>
                          <td className="py-3 pr-4 text-ink-500 text-xs">{r.dateStart}</td>
                          <td className="py-3 pr-4 text-ink-700">
                            <Tag tone="ink">{r.reservations}</Tag>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-moss-400 to-ink-500"
                                  style={{ width: `${r.avgOccupancy}%` }}
                                />
                              </div>
                              <span className="text-xs text-ink-700 tabular-nums">
                                {r.avgOccupancy}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-ink-700 tabular-nums">{r.peak}%</td>
                          <td className="py-3 pr-4">
                            {r.violations > 0 ? (
                              <Tag tone="clay">{r.violations}</Tag>
                            ) : (
                              <span className="text-ink-400">0</span>
                            )}
                          </td>
                          <td className="py-3">
                            {r.lostItems > 0 ? (
                              <Tag tone="amber">{r.lostItems}</Tag>
                            ) : (
                              <span className="text-ink-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-ink-800">
                    柜位状态概览
                  </h3>
                  <Button size="sm" variant="ghost" onClick={doExportLockers}>
                    <Download size={12} /> 导出
                  </Button>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lockerData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={4}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {lockerData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DBE6DF', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                  {lockerData.map((e, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-ink-600">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: e.color }} />
                        {e.name}
                      </div>
                      <b className="text-ink-800 tabular-nums">{e.value}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-ink-800">
                    违规类型占比
                  </h3>
                  <Button size="sm" variant="ghost" onClick={doExportViolations}>
                    <Download size={12} /> 导出
                  </Button>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={violationTypeRows}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={50}
                        outerRadius={82}
                        paddingAngle={4}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {violationTypeRows.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DBE6DF', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5 text-xs">
                  {violationTypeRows.map((e, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-ink-600">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: pieColors[i % pieColors.length] }}
                        />
                        {e.label}
                      </div>
                      <b className="text-ink-800 tabular-nums">{e.count}</b>
                    </div>
                  ))}
                  {violationTypeRows.length === 0 && (
                    <div className="py-6 text-center text-xs text-ink-500">暂无违规</div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {tab === 'violations' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-ink-800">违规流水</h3>
                <Button variant="outline" size="sm" onClick={doExportViolations}>
                  <Download size={14} /> 导出CSV
                </Button>
              </div>
              <div className="space-y-2 max-h-[620px] overflow-y-auto scrollbar-thin pr-1">
                {[...violations]
                  .sort((a, b) => b.occurredAt - a.occurredAt)
                  .map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-ink-100 p-4 transition hover:card-shadow"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag tone={v.handled ? 'moss' : 'clay'}>
                            {VIOLATION_LABEL[v.type]}
                          </Tag>
                          <b className="text-ink-800">座位 {v.seatCode}</b>
                          {v.studentName && (
                            <span className="text-sm text-ink-600 truncate">
                              {v.studentName}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ink-500 shrink-0">
                          {formatDateTime(v.occurredAt)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-ink-600 leading-relaxed">
                        {v.description}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        {v.handled ? (
                          <span className="text-moss-600">
                            ✓ {v.handledBy} 处理于 {v.handledAt ? formatDateTime(v.handledAt) : '--'}
                          </span>
                        ) : (
                          <span className="text-clay-600">待处理</span>
                        )}
                      </div>
                    </div>
                  ))}
                {violations.length === 0 && (
                  <div className="py-16 text-center text-sm text-ink-500">暂无违规记录</div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
                <h3 className="mb-4 font-display text-base font-semibold text-ink-800">违规类型</h3>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={violationTypeRows.map((r) => ({ name: r.label, 数量: r.count }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 4" stroke="#DBE6DF" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={84}
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DBE6DF', fontSize: 12 }} />
                      <Bar dataKey="数量" fill="#C25450" radius={[0, 8, 8, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'lockers' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-ink-800">
                  储物柜状态分布
                </h3>
                <Button variant="outline" size="sm" onClick={doExportLockers}>
                  <Download size={14} /> 导出状态表
                </Button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lockerData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      stroke="#fff"
                      strokeWidth={3}
                      label={({ name, value, percent }) =>
                        `${name} ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {lockerData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #DBE6DF', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-semibold text-ink-800">
                柜位问题汇总
              </h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-clay-200 bg-clay-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-clay-500" size={18} />
                      <b className="text-clay-700">维修中柜位</b>
                    </div>
                    <Tag tone="clay">{periodStats.maintLockers} 个</Tag>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lockers
                      .filter((l) => l.status === 'maintenance')
                      .map((l) => (
                        <span
                          key={l.id}
                          className="rounded-md bg-white border border-clay-200 px-2 py-1 text-xs text-clay-600"
                        >
                          {l.code} · {l.zone}区
                        </span>
                      ))}
                    {periodStats.maintLockers === 0 && (
                      <span className="text-xs text-ink-500">暂无维修中的柜位</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="text-amber-600" size={18} />
                      <b className="text-amber-700">当前使用率</b>
                    </div>
                    <Tag tone="amber">{periodStats.lockerUtil}%</Tag>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                      style={{ width: `${periodStats.lockerUtil}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-amber-700">
                    使用 {periodStats.inUseLockers} / 可用 {totalLockers - periodStats.maintLockers} · 空闲{' '}
                    {lockers.filter((l) => l.status === 'available').length}
                  </div>
                </div>
                <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-600 leading-relaxed">
                  <p>
                    <b className="text-ink-800">建议：</b>
                    {periodStats.lockerUtil > 85
                      ? `柜位使用率超过85%，考虑在高峰时段开放备用柜位，或引导同学更换楼层。`
                      : periodStats.lockerUtil < 40
                        ? `柜位利用率偏低，可考虑缩减维修柜位的优先处理，或配合座位调整。`
                        : `柜位使用状态良好，建议维持每周一次巡检。`}
                  </p>
                  {periodStats.maintLockers > 0 && (
                    <p className="mt-2">
                      另有 <b>{periodStats.maintLockers}</b> 个柜位待维修，请尽快安排以释放容量。
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'lost' && (
          <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-display text-lg font-semibold text-ink-800">遗留物台账</h3>
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span>
                  共 <b className="text-ink-800">{lostItems.length}</b> 件，待认领{' '}
                  <b className="text-amber-600">{lostItems.filter((l) => !l.claimed).length}</b> 件
                </span>
                <Button variant="outline" size="sm" onClick={doExportLost}>
                  <Download size={14} /> 导出CSV
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin -mx-2 px-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-ink-500 border-b border-ink-100">
                    <th className="py-3 pr-4 font-medium">座位</th>
                    <th className="py-3 pr-4 font-medium">类型</th>
                    <th className="py-3 pr-4 font-medium">详细描述</th>
                    <th className="py-3 pr-4 font-medium">发现时间</th>
                    <th className="py-3 pr-4 font-medium">关联清场</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 font-medium">认领信息</th>
                  </tr>
                </thead>
                <tbody>
                  {[...lostItems]
                    .sort((a, b) => b.foundAt - a.foundAt)
                    .map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40"
                      >
                        <td className="py-3 pr-4">
                          <b className="text-ink-800">{l.seatCode}</b>
                        </td>
                        <td className="py-3 pr-4">
                          <Tag tone={l.claimed ? 'moss' : 'amber'}>
                            {LOST_ITEM_LABEL[l.type]}
                          </Tag>
                        </td>
                        <td className="py-3 pr-4 text-ink-700 max-w-[360px]">{l.description}</td>
                        <td className="py-3 pr-4 text-ink-500 text-xs">
                          {formatDateTime(l.foundAt)}
                        </td>
                        <td className="py-3 pr-4 text-ink-500 text-xs">
                          {clearances.find((c) => c.id === l.clearanceId)?.date ?? '--'}
                        </td>
                        <td className="py-3 pr-4">
                          {l.claimed ? (
                            <Tag tone="moss">已认领</Tag>
                          ) : (
                            <Tag tone="clay">待认领</Tag>
                          )}
                        </td>
                        <td className="py-3 text-ink-600 text-xs">
                          {l.claimed ? (
                            <div>
                              <div>{l.claimedBy}</div>
                              <div className="text-ink-400 mt-0.5">
                                {l.claimedAt ? formatDateTime(l.claimedAt) : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-ink-400">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {lostItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm text-ink-500">
                        暂无遗留物记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
