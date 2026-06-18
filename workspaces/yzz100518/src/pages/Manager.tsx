import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/app';
import { StatCard } from '@/components/StatCard';
import { Tag } from '@/components/UI';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  LineChart,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  CalendarClock,
  Sparkles as Magic,
  Users,
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';
import { dayjs, formatDateTime } from '@/utils';
import { cn } from '@/lib/utils';

type RangeKey = 'today' | '7d' | '30d';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: 'today', label: '今日', days: 1 },
  { key: '7d', label: '近7天', days: 7 },
  { key: '30d', label: '近30天', days: 30 },
];

const OCCUPANCY_BAR_COLOR = '#2D5C48';
const TEMP_BAR_COLOR = '#E8A838';
const VIOLATION_BAR_COLOR = '#C25450';
const LINE_COLOR_7D = '#2D5C48';
const LINE_COLOR_TODAY = '#E8A838';

interface DayAgg {
  date: string;
  avgOccupancy: number;
  peak: number;
  low: number;
  violations: number;
}

export default function ManagerPage() {
  const snapshots = useAppStore((s) => s.snapshots);
  const seats = useAppStore((s) => s.seats);
  const violations = useAppStore((s) => s.violations);
  const reservations = useAppStore((s) => s.reservations);
  const clearances = useAppStore((s) => s.clearances);

  const [range, setRange] = useState<RangeKey>('7d');
  const [focusHour, setFocusHour] = useState<number | null>(null);

  const rangeConfig = RANGES.find((r) => r.key === range)!;

  const filteredSnaps = useMemo(() => {
    const from = dayjs().subtract(rangeConfig.days - 1, 'day').startOf('day');
    return snapshots
      .filter((s) => dayjs(s.recordedAt).isSame(from) || dayjs(s.recordedAt).isAfter(from))
      .sort((a, b) => a.recordedAt - b.recordedAt);
  }, [snapshots, rangeConfig]);

  const hourlyData = useMemo(() => {
    const total = seats.length || 60;
    const map = new Map<number, { count: number; occ: number; temp: number; viol: number }>();
    for (let h = 0; h < 24; h++) map.set(h, { count: 0, occ: 0, temp: 0, viol: 0 });
    for (const s of filteredSnaps) {
      const m = map.get(s.hour)!;
      m.count += 1;
      m.occ += s.occupiedSeats;
      m.temp += s.tempAwaySeats;
      m.viol += s.violationCount;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, m]) => ({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        occupancy: m.count ? Math.round((m.occ / m.count / total) * 100) : 0,
        tempAway: m.count ? Math.round((m.temp / m.count / total) * 100) : 0,
        violations: m.count ? +(m.viol / m.count).toFixed(1) : 0,
      }));
  }, [filteredSnaps, seats]);

  const dayAggregations: DayAgg[] = useMemo(() => {
    const total = seats.length || 60;
    const byDate = new Map<string, { occ: number[]; viol: number }>();
    for (const s of filteredSnaps) {
      const entry = byDate.get(s.date) ?? { occ: [], viol: 0 };
      entry.occ.push(s.occupiedSeats);
      entry.viol += s.violationCount;
      byDate.set(s.date, entry);
    }
    const dates: string[] = [];
    for (let i = rangeConfig.days - 1; i >= 0; i--) {
      dates.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'));
    }
    return dates.map((d) => {
      const e = byDate.get(d);
      if (!e || e.occ.length === 0) {
        return { date: d, avgOccupancy: 0, peak: 0, low: 0, violations: 0 };
      }
      const rates = e.occ.map((o) => Math.round((o / total) * 100));
      return {
        date: dayjs(d).format('M/D'),
        avgOccupancy: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
        peak: Math.max(...rates),
        low: Math.min(...rates),
        violations: e.viol,
      };
    });
  }, [filteredSnaps, rangeConfig, seats]);

  const suggestions = useMemo(() => {
    const list: { icon: unknown; tone: 'moss' | 'amber' | 'ink'; title: string; detail: string }[] = [];
    const lowHours = hourlyData.filter((h) => h.occupancy < 25 && h.hour >= 8 && h.hour <= 22);
    if (lowHours.length >= 2) {
      const slots = lowHours
        .reduce<number[][]>((acc, h) => {
          const last = acc[acc.length - 1];
          if (last && last[last.length - 1] === h.hour - 1) last.push(h.hour);
          else acc.push([h.hour]);
          return acc;
        }, [])
        .filter((s) => s.length >= 2)
        .map((s) => `${s[0]}:00-${s[s.length - 1] + 1}:00`);
      if (slots.length) {
        list.push({
          icon: Sparkles,
          tone: 'moss',
          title: `保洁时段建议：${slots.join('、')}`,
          detail: '上座率低于25%的时段适合安排深度保洁，对客流影响最小。',
        });
      }
    }
    const evening = hourlyData.filter((h) => h.hour >= 18 && h.hour <= 22);
    const eveningAvg = evening.length
      ? evening.reduce((a, b) => a + b.occupancy, 0) / evening.length
      : 0;
    if (eveningAvg > 82) {
      list.push({
        icon: Moon,
        tone: 'amber',
        title: `晚间上座率 ${eveningAvg.toFixed(0)}% · 建议推出夜间套餐`,
        detail: '18:00-22:00持续高位，可推出「晚间4小时票」「夜猫通票」提升营收。',
      });
    } else if (eveningAvg < 55) {
      list.push({
        icon: Moon,
        tone: 'ink',
        title: `晚间上座率 ${eveningAvg.toFixed(0)}% · 建议做拉新`,
        detail: '晚间客流偏低，可试做「晚场拼团」「老带新」等活动。',
      });
    }
    const peak = hourlyData.filter((h) => h.occupancy >= 85);
    if (peak.length >= 4) {
      const hrs = peak.map((h) => h.hour);
      list.push({
        icon: Sun,
        tone: 'amber',
        title: `高峰时段 ${hrs[0]}:00-${hrs[hrs.length - 1] + 1}:00 拥挤`,
        detail: '建议高峰期间引导学生使用2楼C/D区，并缩短临时离座时限。',
      });
    }
    const morning = hourlyData.filter((h) => h.hour >= 8 && h.hour <= 11);
    const morningAvg = morning.length
      ? morning.reduce((a, b) => a + b.occupancy, 0) / morning.length
      : 0;
    if (morningAvg < 40) {
      list.push({
        icon: CalendarClock,
        tone: 'ink',
        title: `早场偏冷 · 上座率 ${morningAvg.toFixed(0)}%`,
        detail: '建议推出「早安票」8-12点专属，拉动早场客流。',
      });
    }
    if (list.length === 0) {
      list.push({
        icon: Magic,
        tone: 'moss',
        title: '经营平稳 · 暂无调整建议',
        detail: '各时段客流分布均衡，建议维持当前策略并持续观察。',
      });
    }
    return list;
  }, [hourlyData]);

  const todayStats = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const todaySnaps = snapshots.filter((s) => s.date === today);
    const total = seats.length || 60;
    const avgOcc =
      todaySnaps.length > 0
        ? Math.round(
            (todaySnaps.reduce((a, b) => a + b.occupiedSeats, 0) / todaySnaps.length / total) * 100,
          )
        : 0;
    const todayViol = violations.filter((v) =>
      dayjs(v.occurredAt).isSame(dayjs(), 'day'),
    ).length;
    const todayReserv = reservations.filter((r) =>
      dayjs(r.reservedAt).isSame(dayjs(), 'day'),
    ).length;
    const latestClear = [...clearances].sort((a, b) => b.startedAt - a.startedAt)[0];
    return { avgOcc, todayViol, todayReserv, latestClear };
  }, [snapshots, seats, violations, reservations, clearances]);

  const violationTypeData = useMemo(() => {
    const from = dayjs().subtract(rangeConfig.days - 1, 'day').startOf('day').valueOf();
    const inRange = violations.filter((v) => v.occurredAt >= from);
    const count = new Map<string, number>();
    for (const v of inRange) count.set(v.type, (count.get(v.type) ?? 0) + 1);
    const label: Record<string, string> = {
      no_show: '未签到',
      over_temp_away: '离座超时',
      multi_seat_attempt: '多占座位',
      unattended: '长时间无人',
      forced_release: '前台释放',
    };
    const colors = ['#2D5C48', '#E8A838', '#C25450', '#5C9178', '#A36D18'];
    return Array.from(count.entries()).map(([k, v], i) => ({
      name: label[k] ?? k,
      value: v,
      color: colors[i % colors.length],
    }));
  }, [violations, rangeConfig]);

  return (
    <div className="grain-bg min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-800">店长分析台</h1>
            <p className="mt-1 text-sm text-ink-500">
              按时段观察空座率 · 智能推荐经营与保洁调整方案
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-500 mr-2 flex items-center gap-1">
              <ChevronDown size={14} /> 统计范围
            </span>
            <div className="flex rounded-xl border border-ink-200 bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                    range === r.key ? 'bg-ink-700 text-white' : 'text-ink-600 hover:bg-ink-50',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="时段平均上座率"
            value={`${todayStats.avgOcc}%`}
            trend={{ value: 8, label: '环比' }}
            accent="ink"
            icon={<TrendingUp size={22} />}
          />
          <StatCard
            label="今日预约数"
            value={todayStats.todayReserv}
            hint="含未签到"
            accent="moss"
            icon={<Users size={22} />}
          />
          <StatCard
            label="今日违规数"
            value={todayStats.todayViol}
            hint="含未处理"
            accent="clay"
            icon={<AlertTriangle size={22} />}
          />
          <StatCard
            label="最近清场"
            value={todayStats.latestClear ? dayjs(todayStats.latestClear.startedAt).format('MM-DD HH:mm') : '--'}
            hint={
              todayStats.latestClear
                ? `释放${todayStats.latestClear.seatsReleased}座·失物${todayStats.latestClear.lostItemsFound}件`
                : '暂无记录'
            }
            accent="amber"
            icon={<Clock size={22} />}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-800">
                    24小时空座率分布
                  </h3>
                  <p className="mt-1 text-xs text-ink-500">
                    {rangeConfig.label}平均 · 柱体越高代表上座率越高，黄色部分为临时离座占比
                  </p>
                </div>
                {focusHour !== null && (
                  <Tag tone="amber">
                    选中时段 {String(focusHour).padStart(2, '0')}:00 上座率{' '}
                    {hourlyData[focusHour]?.occupancy ?? 0}%
                  </Tag>
                )}
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hourlyData}
                    barSize={18}
                    onClick={(e) => {
                      if (e && typeof e.activeTooltipIndex === 'number') {
                        setFocusHour(e.activeTooltipIndex);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 4" stroke="#DBE6DF" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#5C9178' }}
                      axisLine={{ stroke: '#B7CDC0' }}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#5C9178' }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                      width={42}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(232,168,56,0.08)' }}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #DBE6DF',
                        fontSize: 12,
                        padding: '8px 12px',
                        boxShadow: '0 8px 24px rgba(15,42,32,0.08)',
                      }}
                      formatter={(value: number, name: string) => [
                        value + '%',
                        { occupancy: '上座率', tempAway: '临时离座占比' }[name] ?? name,
                      ]}
                    />
                    <ReferenceLine
                      y={75}
                      stroke="#C25450"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: '高峰线 75%',
                        fill: '#C25450',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <ReferenceLine
                      y={25}
                      stroke="#4CA771"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{
                        value: '保洁建议线 25%',
                        fill: '#4CA771',
                        fontSize: 10,
                        position: 'insideTopRight',
                        offset: 16,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Bar
                      dataKey="occupancy"
                      name="上座率"
                      stackId="s"
                      fill={OCCUPANCY_BAR_COLOR}
                      radius={[6, 6, 0, 0]}
                      activeBar={{ fill: '#1F4D3C' }}
                    />
                    <Bar
                      dataKey="tempAway"
                      name="临时离座"
                      stackId="s"
                      fill={TEMP_BAR_COLOR}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-800">
                    {rangeConfig.days > 1 ? `${rangeConfig.label}日均上座率趋势` : '今日逐时上座率'}
                  </h3>
                  <p className="mt-1 text-xs text-ink-500">高/低线表示当日峰值与谷值</p>
                </div>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  {rangeConfig.days > 1 ? (
                    <AreaChart data={dayAggregations}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={LINE_COLOR_7D} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={LINE_COLOR_7D} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 4" stroke="#DBE6DF" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={{ stroke: '#B7CDC0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                        width={42}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #DBE6DF',
                          fontSize: 12,
                          padding: '8px 12px',
                        }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="avgOccupancy"
                        name="平均"
                        stroke={LINE_COLOR_7D}
                        strokeWidth={2.5}
                        fill="url(#g1)"
                      />
                      <Area
                        type="monotone"
                        dataKey="peak"
                        name="峰值"
                        stroke={VIOLATION_BAR_COLOR}
                        strokeDasharray="4 4"
                        fill="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="low"
                        name="谷值"
                        stroke="#4CA771"
                        strokeDasharray="4 4"
                        fill="none"
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={LINE_COLOR_TODAY} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={LINE_COLOR_TODAY} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 4" stroke="#DBE6DF" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={{ stroke: '#B7CDC0' }}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#5C9178' }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                        width={42}
                      />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DBE6DF', fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="occupancy"
                        name="上座率"
                        stroke={LINE_COLOR_TODAY}
                        strokeWidth={2.5}
                        fill="url(#g2)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <LineChart className="text-ink-600" size={18} />
                <h3 className="font-display text-lg font-semibold text-ink-800">智能经营建议</h3>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => {
                  const Icon = s.icon as typeof Sparkles;
                  const toneCls: Record<string, string> = {
                    moss: 'border-moss-200 bg-moss-50/70',
                    amber: 'border-amber-200 bg-amber-50/70',
                    ink: 'border-ink-200 bg-ink-50/70',
                  };
                  const tagCls: Record<string, string> = {
                    moss: 'bg-moss-500 text-white',
                    amber: 'bg-amber-500 text-white',
                    ink: 'bg-ink-600 text-white',
                  };
                  return (
                    <div
                      key={i}
                      className={cn(
                        'animate-stagger-in rounded-xl border p-4 transition hover:card-shadow',
                        toneCls[s.tone],
                      )}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            tagCls[s.tone],
                          )}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink-800 leading-snug">
                            {s.title}
                          </div>
                          <div className="mt-1 text-xs text-ink-600 leading-relaxed">
                            {s.detail}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink-800">违规类型分布</h3>
                <Tag tone="clay">{violationTypeData.reduce((a, b) => a + b.value, 0)} 起</Tag>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={violationTypeData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={76}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {violationTypeData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #DBE6DF',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {violationTypeData.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-ink-600">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: e.color }}
                    />
                    {e.name} · {e.value}
                  </div>
                ))}
              </div>
            </div>

            <div className="card-shadow rounded-2xl border border-ink-100 bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-ink-800">清场历史</h3>
              </div>
              <div className="space-y-2">
                {clearances.length === 0 && (
                  <div className="py-6 text-center text-xs text-ink-500">暂无记录</div>
                )}
                {[...clearances]
                  .sort((a, b) => b.startedAt - a.startedAt)
                  .slice(0, 5)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <b className="text-ink-800">{c.date}</b>
                        <span className="text-ink-500">{c.operatorName}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-ink-600">
                        <span>检查 {Array.isArray(c.seatsChecked) ? c.seatsChecked.length : (c.seatsChecked as unknown as number)} 座</span>
                        <span>释放 {c.seatsReleased}</span>
                        <span className="text-amber-700">失物 {c.lostItemsFound}</span>
                        <span className="ml-auto text-ink-400">
                          {formatDateTime(c.startedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
