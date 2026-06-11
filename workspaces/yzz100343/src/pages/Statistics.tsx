import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Download,
  ShieldCheck,
  Flame,
  RotateCcw,
  AlertTriangle,
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  FileSpreadsheet,
  CalendarDays,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie as RePie,
  Legend,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/ToastProvider';
import { exportHazardsToCsv } from '@/utils/csvExport';
import { formatDate } from '@/utils/dateUtils';
import { TEAMS, STATUS_LABELS, ROLE_LABELS } from '@/types';
import type { Hazard, HazardStatus, Team } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';

const teamColors = ['#F43F5E', '#0EA5E9', '#8B5CF6', '#10B981'];

interface TeamStat {
  team: Team;
  total: number;
  closed: number;
  rectifying: number;
  pendingReview: number;
  rejected: number;
  overdue: number;
  rejectCount: number;
  closeRate: number;
  openRate: number;
}

export const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const hazards = useAppStore((s) => s.hazards);
  const currentRole = useAppStore((s) => s.currentRole);
  const { showToast } = useToast();

  if (currentRole !== 'PROJECT_MANAGER' && currentRole !== 'SAFETY_INSPECTOR') {
    return (
      <div className="page-container">
        <div className="industrial-card p-12 text-center">
          <AlertTriangle size={56} className="mx-auto mb-4 text-warning-yellow" />
          <h2 className="text-xl font-bold mb-2">权限不足</h2>
          <p className="text-industrial-gray-500 mb-6">
            只有【项目经理 / 安监人员】角色可以查看统计分析。
          </p>
          <button
            className="btn-outline"
            onClick={() => navigate('/')}
          >
            ← 返回首页
          </button>
        </div>
      </div>
    );
  }

  const teamStats: TeamStat[] = React.useMemo(() => {
    return TEAMS.map((t) => {
      const list = hazards.filter((h) => h.team === t);
      const closed = list.filter((h) => h.status === 'CLOSED').length;
      const pending = list.filter(
        (h) => h.status === 'PENDING_RECTIFICATION' || h.status === 'REJECTED'
      ).length;
      const pendingReview = list.filter((h) => h.status === 'PENDING_REVIEW').length;
      const overdue = list.filter((h) => h.isOverdue && h.status !== 'CLOSED').length;
      const rejectCount = list.reduce((s, h) => s + h.rejectCount, 0);
      const openRate = list.length ? Math.round(((list.length - closed) / list.length) * 100) : 0;
      return {
        team: t,
        total: list.length,
        closed,
        rectifying: pending,
        pendingReview,
        rejected: list.filter((h) => h.status === 'REJECTED').length,
        overdue,
        rejectCount,
        closeRate: list.length ? Math.round((closed / list.length) * 100) : 0,
        openRate,
      };
    });
  }, [hazards]);

  const overview = React.useMemo(() => {
    const total = hazards.length;
    const notClosed = hazards.filter((h) => h.status !== 'CLOSED').length;
    const overdue = hazards.filter((h) => h.isOverdue && h.status !== 'CLOSED').length;
    const rejected = hazards.reduce((s, h) => s + h.rejectCount, 0);
    const closed = hazards.filter((h) => h.status === 'CLOSED').length;
    return {
      total,
      notClosed,
      overdue,
      rejected,
      closed,
      rate: total ? Math.round((closed / total) * 100) : 0,
    };
  }, [hazards]);

  const statusPie = React.useMemo(() => {
    const map: Record<HazardStatus, number> = {
      PENDING_RECTIFICATION: 0,
      PENDING_REVIEW: 0,
      CLOSED: 0,
      REJECTED: 0,
    };
    hazards.forEach((h) => (map[h.status]++));
    return [
      { name: STATUS_LABELS.PENDING_RECTIFICATION, value: map.PENDING_RECTIFICATION, color: '#2563EB' },
      { name: STATUS_LABELS.PENDING_REVIEW, value: map.PENDING_REVIEW, color: '#CA8A04' },
      { name: STATUS_LABELS.CLOSED, value: map.CLOSED, color: '#16A34A' },
      { name: STATUS_LABELS.REJECTED, value: map.REJECTED, color: '#DC2626' },
    ];
  }, [hazards]);

  const exportAll = () => {
    exportHazardsToCsv({ hazards });
    showToast('success', `已导出 ${hazards.length} 条整改单`);
  };

  const exportNotClosed = () => {
    const list = hazards.filter((h) => h.status !== 'CLOSED');
    exportHazardsToCsv({ hazards: list, fileName: `未闭环整改单_${formatDate(new Date().toISOString(), 'yyyyMMdd')}.csv` });
    showToast('success', `已导出 ${list.length} 条未闭环整改单`);
  };

  const exportOverdue = () => {
    const list = hazards.filter((h) => h.isOverdue && h.status !== 'CLOSED');
    exportHazardsToCsv({ hazards: list, fileName: `逾期整改单_${formatDate(new Date().toISOString(), 'yyyyMMdd')}.csv` });
    showToast('success', `已导出 ${list.length} 条逾期整改单`);
  };

  const exportRejected = () => {
    const list = hazards.filter((h) => h.rejectCount > 0);
    exportHazardsToCsv({ hazards: list, fileName: `复查打回记录_${formatDate(new Date().toISOString(), 'yyyyMMdd')}.csv` });
    showToast('success', `已导出 ${list.length} 条打回整改单`);
  };

  const sortedByTotal = [...teamStats].sort((a, b) => b.total - a.total);
  const sortedByRejected = [...teamStats].sort((a, b) => b.rejectCount - a.rejectCount);

  const medalIcon = (idx: number) => {
    if (idx === 0) return <Trophy size={18} className="text-yellow-500" />;
    if (idx === 1) return <Medal size={18} className="text-industrial-gray-400" />;
    if (idx === 2) return <Award size={18} className="text-orange-600" />;
    return <span className="text-sm font-bold text-industrial-gray-400 w-[18px] text-center">#{idx + 1}</span>;
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-black text-industrial-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[4px] bg-success-green/15 text-success-green flex items-center justify-center">
              <BarChart3 size={22} strokeWidth={2.4} />
            </span>
            统计分析与整改单导出
          </h2>
          <p className="text-sm text-industrial-gray-500 mt-1">
            项目经理视图：未闭环、逾期、打回、各班组数量一览
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportAll} className="btn-steel text-xs">
            <FileSpreadsheet size={14} />
            导出全部CSV
          </button>
          <button onClick={exportNotClosed} className="btn-outline text-xs">
            <ShieldCheck size={14} />
            未闭环
          </button>
          <button onClick={exportOverdue} className="btn-outline text-xs text-danger-red border-danger-red/40 hover:bg-red-50">
            <Flame size={14} />
            逾期
          </button>
          <button onClick={exportRejected} className="btn-outline text-xs text-warning-yellow border-warning-yellow/40 hover:bg-amber-50">
            <RotateCcw size={14} />
            打回
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <OverviewCard
          label="未闭环隐患"
          value={overview.notClosed}
          hint={`占总数 ${overview.total ? Math.round((overview.notClosed / overview.total) * 100) : 0}%`}
          icon={<AlertTriangle size={22} />}
          gradient="from-pending-blue to-blue-700"
        />
        <OverviewCard
          label="已逾期"
          value={overview.overdue}
          hint={overview.overdue ? `红色预警，需立即处理` : `暂无逾期，表现良好 ✅`}
          icon={<Flame size={22} />}
          gradient="from-danger-red to-red-800"
          pulse={overview.overdue > 0}
        />
        <OverviewCard
          label="复查被打回"
          value={overview.rejected}
          hint={`累计打回次数统计`}
          icon={<RotateCcw size={22} />}
          gradient="from-warning-yellow to-amber-700"
        />
        <OverviewCard
          label="整体闭环率"
          value={`${overview.rate}%`}
          hint={`已关闭 ${overview.closed} / 总数 ${overview.total}`}
          icon={<TrendingUp size={22} />}
          gradient="from-success-green to-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="industrial-card p-5 lg:col-span-2">
          <h3 className="section-title mb-4">
            <Users size={18} className="text-steel-blue" />
            各班组隐患数量对比
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teamStats.map((t, i) => ({
                  name: t.team,
                  总数: t.total,
                  已关闭: t.closed,
                  未闭环: t.total - t.closed,
                  逾期: t.overdue,
                  _color: teamColors[i],
                }))}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(30,58,95,0.04)' }}
                  contentStyle={{ borderRadius: 4, border: '1px solid #E2E8F0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
                <Bar dataKey="总数" radius={[4, 4, 0, 0]} fillOpacity={0.25}>
                  {teamStats.map((_, i) => (
                    <Cell key={i} fill={teamColors[i]} />
                  ))}
                </Bar>
                <Bar dataKey="已关闭" radius={[4, 4, 0, 0]} fill="#16A34A" />
                <Bar dataKey="未闭环" radius={[4, 4, 0, 0]} fill="#2563EB" />
                <Bar dataKey="逾期" radius={[4, 4, 0, 0]} fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="industrial-card p-5">
          <h3 className="section-title mb-4">
            <PieChartIcon size={18} className="text-safety-orange" />
            全局状态分布
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RePie
                  data={statusPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="#fff"
                  strokeWidth={2}
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${Math.round(percent * 100)}%`
                  }
                  labelLine={false}
                >
                  {statusPie.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </RePie>
                <Tooltip contentStyle={{ borderRadius: 4, border: '1px solid #E2E8F0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="industrial-card p-5">
          <h3 className="section-title mb-4">
            <Trophy size={18} className="text-warning-yellow" />
            隐患总数排行
            <span className="text-xs font-normal text-industrial-gray-500 ml-2">
              由高到低
            </span>
          </h3>
          <div className="space-y-3">
            {sortedByTotal.map((t, i) => (
              <RankRow
                key={t.team}
                rank={i}
                medal={medalIcon(i)}
                team={<TeamBadge team={t.team} />}
                mainLabel="总数"
                mainValue={t.total}
                mainColor={teamColors[i]}
                sub={[
                  { label: '闭环', value: t.closed, color: 'text-success-green' },
                  { label: '进行中', value: t.rectifying, color: 'text-pending-blue' },
                  { label: '逾期', value: t.overdue, color: 'text-danger-red' },
                ]}
                progress={t.openRate}
                progressColor={teamColors[i]}
                progressLabel={`未闭环 ${t.openRate}%`}
              />
            ))}
          </div>
        </div>

        <div className="industrial-card p-5">
          <h3 className="section-title mb-4">
            <RotateCcw size={18} className="text-danger-red" />
            打回次数排行
            <span className="text-xs font-normal text-industrial-gray-500 ml-2">
              安监例会重点关注
            </span>
          </h3>
          <div className="space-y-3">
            {sortedByRejected.map((t, i) => (
              <RankRow
                key={t.team}
                rank={i}
                medal={medalIcon(i)}
                team={<TeamBadge team={t.team} />}
                mainLabel="累计打回"
                mainValue={t.rejectCount}
                mainColor="#DC2626"
                sub={[
                  { label: '当前被打回', value: t.rejected, color: 'text-danger-red' },
                  { label: '闭环率', value: `${t.closeRate}%`, color: 'text-success-green' },
                ]}
                progress={t.rejectCount * 10}
                progressColor="#DC2626"
                progressLabel={`隐患总数 ${t.total}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 industrial-card p-5">
        <h3 className="section-title mb-4">
          <CalendarDays size={18} className="text-steel-blue" />
          各班组明细数据
        </h3>
        <div className="overflow-x-auto scrollbar-thin -mx-2 px-2">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-industrial-gray-500 border-b border-industrial-gray-200">
                <th className="py-3 px-3 font-semibold">班组</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">总数</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">已关闭</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">待整改</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">待复查</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">被打回</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">逾期</th>
                <th className="py-3 px-3 font-semibold text-right tabular-nums">打回次数</th>
                <th className="py-3 px-3 font-semibold">闭环率</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((t, i) => (
                <tr
                  key={t.team}
                  className="border-b border-industrial-gray-100 last:border-0 hover:bg-industrial-gray-50/70 transition-colors"
                >
                  <td className="py-3 px-3">
                    <TeamBadge team={t.team} />
                  </td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums" style={{ color: teamColors[i] }}>
                    {t.total}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-success-green font-medium">
                    {t.closed}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-pending-blue">
                    {t.rectifying}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-warning-yellow font-medium">
                    {t.pendingReview}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-danger-red">
                    {t.rejected}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {t.overdue > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-danger-red/10 text-danger-red text-xs font-bold">
                        {t.overdue}
                      </span>
                    ) : (
                      <span className="text-industrial-gray-300">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    <span className={`font-bold ${t.rejectCount > 2 ? 'text-danger-red' : t.rejectCount > 0 ? 'text-warning-yellow' : 'text-industrial-gray-400'}`}>
                      {t.rejectCount}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-[100px] h-1.5 bg-industrial-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${t.closeRate}%`,
                            background: t.closeRate >= 80
                              ? '#16A34A'
                              : t.closeRate >= 50
                              ? teamColors[i]
                              : '#DC2626',
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold tabular-nums min-w-[36px] text-right"
                        style={{
                          color: t.closeRate >= 80 ? '#16A34A' : t.closeRate >= 50 ? teamColors[i] : '#DC2626',
                        }}
                      >
                        {t.closeRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-steel-blue/5 border-t-2 border-steel-blue/20 font-bold">
                <td className="py-3 px-3">合计</td>
                <td className="py-3 px-3 text-right tabular-nums text-steel-blue">
                  {teamStats.reduce((s, t) => s + t.total, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-success-green">
                  {teamStats.reduce((s, t) => s + t.closed, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-pending-blue">
                  {teamStats.reduce((s, t) => s + t.rectifying, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-warning-yellow">
                  {teamStats.reduce((s, t) => s + t.pendingReview, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-danger-red">
                  {teamStats.reduce((s, t) => s + t.rejected, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-danger-red">
                  {teamStats.reduce((s, t) => s + t.overdue, 0)}
                </td>
                <td className="py-3 px-3 text-right tabular-nums text-warning-yellow">
                  {teamStats.reduce((s, t) => s + t.rejectCount, 0)}
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs text-industrial-gray-500">
                    整体 {overview.rate}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const OverviewCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  gradient: string;
  pulse?: boolean;
}> = ({ label, value, hint, icon, gradient, pulse }) => (
  <div
    className={`relative industrial-card p-5 overflow-hidden ${
      pulse ? 'animate-pulse-slow ring-2 ring-danger-red/20' : ''
    }`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-11 h-11 rounded-[4px] bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tabular-nums text-industrial-gray-900 mb-1">
        {value}
      </div>
      <div className="text-sm font-semibold text-industrial-gray-800">{label}</div>
      <div className="text-xs text-industrial-gray-500 mt-1">{hint}</div>
    </div>
  </div>
);

const RankRow: React.FC<{
  rank: number;
  medal: React.ReactNode;
  team: React.ReactNode;
  mainLabel: string;
  mainValue: number;
  mainColor: string;
  sub: { label: string; value: number | string; color: string }[];
  progress: number;
  progressColor: string;
  progressLabel: string;
}> = ({ rank, medal, team, mainLabel, mainValue, mainColor, sub, progress, progressColor, progressLabel }) => (
  <div
    className={`p-4 rounded-[4px] border transition-all ${
      rank === 0
        ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200'
        : 'bg-industrial-gray-50/50 border-industrial-gray-200 hover:border-steel-blue/30'
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className="w-7 flex justify-center">{medal}</div>
      <div className="flex-1">{team}</div>
      <div className="text-right">
        <div className="text-[11px] text-industrial-gray-400">{mainLabel}</div>
        <div
          className="text-2xl font-black tabular-nums leading-tight"
          style={{ color: mainColor }}
        >
          {mainValue}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3 ml-10 mb-2 flex-wrap">
      {sub.map((s, i) => (
        <div key={i} className="text-xs flex items-center gap-1">
          <span className="text-industrial-gray-500">{s.label}:</span>
          <span className={`font-bold tabular-nums ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
    <div className="flex items-center gap-2 ml-10">
      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden border border-industrial-gray-200">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, Math.max(4, progress))}%`,
            background: progressColor,
            opacity: 0.75,
          }}
        />
      </div>
      <span className="text-[11px] text-industrial-gray-500 whitespace-nowrap tabular-nums">
        {progressLabel}
      </span>
    </div>
  </div>
);

const Pie = BarChart3;
