import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  Flame,
  RotateCcw,
  FilePlus,
  ListChecks,
  BarChart3,
  Users,
  CalendarClock,
  MapPin,
  Wrench,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { HazardCard } from '@/components/hazard/HazardCard';
import { formatDateTime, formatRelative } from '@/utils/dateUtils';
import { ROLE_LABELS, TEAMS, STATUS_LABELS } from '@/types';
import type { Hazard, HazardStatus } from '@/types';

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  onClick?: () => void;
  hint?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  bg,
  onClick,
  hint,
}) => (
  <div
    onClick={onClick}
    className={`industrial-card p-4 ${
      onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
    } relative overflow-hidden`}
  >
    <div className={`absolute top-0 left-0 right-0 h-1 ${bg}`} />
    <div className="flex items-start justify-between mb-3">
      <div
        className={`w-10 h-10 rounded-[4px] ${bg} ${color} flex items-center justify-center`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className={`text-3xl font-black tabular-nums ${color} leading-none`}>
        {value}
      </div>
    </div>
    <div className="text-sm font-semibold text-industrial-gray-800">{label}</div>
    {hint && (
      <div className="text-[11px] text-industrial-gray-500 mt-1">{hint}</div>
    )}
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const hazards = useAppStore((s) => s.hazards);
  const currentRole = useAppStore((s) => s.currentRole);

  const counts = React.useMemo(() => {
    const c: Record<HazardStatus, number> = {
      PENDING_RECTIFICATION: 0,
      PENDING_REVIEW: 0,
      CLOSED: 0,
      REJECTED: 0,
    };
    let overdue = 0;
    hazards.forEach((h) => {
      c[h.status]++;
      if (h.isOverdue && h.status !== 'CLOSED') overdue++;
    });
    return { ...c, total: hazards.length, overdue };
  }, [hazards]);

  const overdueList = React.useMemo(
    () =>
      hazards
        .filter((h) => h.isOverdue && h.status !== 'CLOSED')
        .sort((a, b) => a.deadline.localeCompare(b.deadline)),
    [hazards]
  );

  const teamStats = React.useMemo(() => {
    return TEAMS.map((t) => {
      const list = hazards.filter((h) => h.team === t);
      const closed = list.filter((h) => h.status === 'CLOSED').length;
      const rejected = list.reduce((s, h) => s + h.rejectCount, 0);
      return {
        team: t,
        total: list.length,
        closed,
        rejected,
        rate: list.length ? Math.round((closed / list.length) * 100) : 0,
      };
    });
  }, [hazards]);

  const recentActivity = React.useMemo(() => {
    type Activity = {
      hazard: Hazard;
      type: 'REGISTER' | 'RECTIFY' | 'REVIEW_PASS' | 'REVIEW_REJECT';
      time: string;
      by: any;
    };
    const events: Activity[] = [];
    hazards.forEach((h) => {
      events.push({
        hazard: h,
        type: 'REGISTER',
        time: h.createdAt,
        by: h.createdBy,
      });
      h.rectifications.forEach((r) => {
        events.push({
          hazard: h,
          type: 'RECTIFY',
          time: r.submittedAt,
          by: r.submittedBy,
        });
      });
      h.reviews.forEach((r) => {
        events.push({
          hazard: h,
          type: r.passed ? 'REVIEW_PASS' : 'REVIEW_REJECT',
          time: r.reviewedAt,
          by: r.reviewedBy,
        });
      });
    });
    return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
  }, [hazards]);

  const teamBarData = teamStats.map((t) => ({
    name: t.team,
    隐患总数: t.total,
    已关闭: t.closed,
    打回次数: t.rejected,
  }));

  const teamColors = ['#F43F5E', '#0EA5E9', '#8B5CF6', '#10B981'];

  const activityIcon = {
    REGISTER: { icon: FilePlus, color: 'text-pending-blue', bg: 'bg-blue-50' },
    RECTIFY: { icon: Wrench, color: 'text-warning-yellow', bg: 'bg-amber-50' },
    REVIEW_PASS: { icon: ShieldCheck, color: 'text-success-green', bg: 'bg-green-50' },
    REVIEW_REJECT: { icon: RotateCcw, color: 'text-danger-red', bg: 'bg-red-50' },
  } as const;

  const activityLabel = {
    REGISTER: '登记隐患',
    RECTIFY: '提交整改',
    REVIEW_PASS: '复查通过',
    REVIEW_REJECT: '复查打回',
  } as const;

  return (
    <div className="page-container grid-bg">
      {overdueList.length > 0 && (
        <div
          className="mb-6 rounded-md shadow-industrial border border-danger-red/40
            bg-gradient-to-r from-danger-red via-red-600 to-danger-red text-white
            overflow-hidden animate-pulse-slow"
        >
          <div className="p-5 danger-pattern">
            <div className="flex items-start gap-4 flex-wrap">
              <div
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center
                  border-2 border-white/40 flex-shrink-0"
              >
                <Flame size={26} strokeWidth={2.6} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-black">⚠️ 紧急：{overdueList.length} 项隐患已逾期！</h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/25 text-xs font-bold">
                    立即处理
                  </span>
                </div>
                <p className="text-white/85 text-sm mb-3">
                  以下隐患已超过整改期限，请督促相关班组立即完成整改并提交复查。
                </p>
                <div className="flex flex-wrap gap-2">
                  {overdueList.slice(0, 4).map((h) => {
                    const rel = formatRelative(h.deadline);
                    return (
                      <button
                        key={h.id}
                        onClick={() => navigate(`/hazards/${h.id}`)}
                        className="flex items-center gap-2 px-3 py-2 rounded-[4px]
                          bg-white/15 hover:bg-white/25 border border-white/30
                          text-sm font-medium transition-colors backdrop-blur-sm"
                      >
                        <MapPin size={14} />
                        <span className="truncate max-w-[160px]">{h.location}</span>
                        <span className="text-[11px] bg-white/25 px-1.5 py-0.5 rounded">
                          {rel.text}
                        </span>
                      </button>
                    );
                  })}
                  {overdueList.length > 4 && (
                    <button
                      onClick={() => navigate('/hazards')}
                      className="px-3 py-2 rounded-[4px] bg-white/15 hover:bg-white/25
                        border border-white/30 text-sm font-medium"
                    >
                      查看全部 {overdueList.length} 项 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="隐患总数"
          value={counts.total}
          icon={FileText}
          color="text-steel-blue"
          bg="bg-steel-blue/10"
          hint="系统累计登记"
          onClick={() => navigate('/hazards')}
        />
        <StatCard
          label="待整改"
          value={counts.PENDING_RECTIFICATION + counts.REJECTED}
          icon={Clock}
          color="text-pending-blue"
          bg="bg-blue-50"
          hint="含已打回重改"
          onClick={() => {
            useAppStore.getState().setFilters({ status: 'PENDING_RECTIFICATION' });
            navigate('/hazards');
          }}
        />
        <StatCard
          label="待复查"
          value={counts.PENDING_REVIEW}
          icon={ListChecks}
          color="text-warning-yellow"
          bg="bg-amber-50"
          hint="已整改等待验收"
          onClick={() => {
            useAppStore.getState().setFilters({ status: 'PENDING_REVIEW' });
            navigate('/hazards');
          }}
        />
        <StatCard
          label="已关闭"
          value={counts.CLOSED}
          icon={ShieldCheck}
          color="text-success-green"
          bg="bg-green-50"
          hint={
            counts.total
              ? `闭环率 ${Math.round((counts.CLOSED / counts.total) * 100)}%`
              : '闭环率 —'
          }
          onClick={() => {
            useAppStore.getState().setFilters({ status: 'CLOSED' });
            navigate('/hazards');
          }}
        />
        <StatCard
          label="逾期"
          value={counts.overdue}
          icon={Flame}
          color="text-danger-red"
          bg="bg-red-50"
          hint="红色预警状态"
          onClick={() => {
            useAppStore.getState().setFilters({ onlyOverdue: true });
            navigate('/hazards');
          }}
        />
        <StatCard
          label="累计打回"
          value={hazards.reduce((s, h) => s + h.rejectCount, 0)}
          icon={RotateCcw}
          color="text-warning-yellow"
          bg="bg-orange-50"
          hint="不合格需重新整改"
          onClick={() => {
            useAppStore.getState().setFilters({ status: 'REJECTED' });
            navigate('/hazards');
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="industrial-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <BarChart3 size={20} className="text-steel-blue" />
              各班组隐患统计对比
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-steel-blue" />
                总数
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-success-green" />
                已关闭
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-danger-red" />
                打回次数
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamBarData} barGap={4}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#475569', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 4,
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="隐患总数" radius={[4, 4, 0, 0]}>
                  {teamBarData.map((_, i) => (
                    <Cell key={`b1-${i}`} fill={teamColors[i]} fillOpacity={0.25} />
                  ))}
                </Bar>
                <Bar dataKey="已关闭" radius={[4, 4, 0, 0]}>
                  {teamBarData.map((_, i) => (
                    <Cell key={`b2-${i}`} fill="#16A34A" />
                  ))}
                </Bar>
                <Bar dataKey="打回次数" radius={[4, 4, 0, 0]}>
                  {teamBarData.map((_, i) => (
                    <Cell key={`b3-${i}`} fill="#DC2626" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {teamStats.map((t, i) => (
              <div
                key={t.team}
                className="p-3 rounded-[4px] border bg-industrial-gray-50 border-industrial-gray-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <TeamBadge team={t.team} size="sm" />
                  <span
                    className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded"
                    style={{
                      color: teamColors[i],
                      background: teamColors[i] + '18',
                    }}
                  >
                    {t.rate}%
                  </span>
                </div>
                <div className="h-1.5 bg-industrial-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${t.rate}%`,
                      background: teamColors[i],
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-industrial-gray-500">
                  <div>
                    <div className="font-bold text-industrial-gray-700">{t.total}</div>
                    总数
                  </div>
                  <div>
                    <div className="font-bold text-success-green">{t.closed}</div>
                    闭环
                  </div>
                  <div>
                    <div className="font-bold text-danger-red">{t.rejected}</div>
                    打回
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="industrial-card p-5">
          <h3 className="section-title mb-4">
            <CalendarClock size={20} className="text-safety-orange" />
            最新动态时间线
          </h3>
          <div className="space-y-0 max-h-[480px] overflow-auto scrollbar-thin pr-1">
            {recentActivity.map((a, idx) => {
              const cfg = activityIcon[a.type];
              const Icon = cfg.icon;
              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/hazards/${a.hazard.id}`)}
                  className="flex gap-3 py-3 border-b border-dashed border-industrial-gray-100 last:border-0 cursor-pointer group hover:bg-industrial-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full ${cfg.bg} ${cfg.color}
                        flex items-center justify-center border-2 border-white shadow-sm`}
                    >
                      <Icon size={14} strokeWidth={2.4} />
                    </div>
                    {idx !== recentActivity.length - 1 && (
                      <div className="absolute left-1/2 top-8 w-px h-full bg-industrial-gray-200 -translate-x-1/2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-bold ${cfg.color}`}>
                        {activityLabel[a.type]}
                      </span>
                      <span className="text-[11px] text-industrial-gray-400">·</span>
                      <span className="text-[11px] text-industrial-gray-500">
                        {ROLE_LABELS[a.by as keyof typeof ROLE_LABELS]}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-industrial-gray-800 truncate group-hover:text-steel-blue">
                      {a.hazard.location} · {a.hazard.boxNumber}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={a.hazard.status} size="sm" />
                      </div>
                      <span className="text-[11px] text-industrial-gray-400 tabular-nums">
                        {formatDateTime(a.time)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="industrial-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <AlertTriangle size={20} className="text-danger-red" />
              待处理隐患（优先级排序）
            </h3>
            <button
              onClick={() => navigate('/hazards')}
              className="btn-ghost text-xs"
            >
              查看全部 →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hazards
              .filter((h) => h.status !== 'CLOSED')
              .sort((a, b) => {
                if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
                if (a.rejectCount !== b.rejectCount) return b.rejectCount - a.rejectCount;
                return a.deadline.localeCompare(b.deadline);
              })
              .slice(0, 4)
              .map((h) => (
                <HazardCard key={h.id} hazard={h} />
              ))}
            {hazards.filter((h) => h.status !== 'CLOSED').length === 0 && (
              <div className="col-span-2 p-10 text-center text-industrial-gray-500">
                <ShieldCheck size={48} className="mx-auto mb-2 text-success-green/60" />
                <p className="font-medium">太棒了！暂无待处理隐患 🎉</p>
              </div>
            )}
          </div>
        </div>

        <div className="industrial-card p-5">
          <h3 className="section-title mb-4">
            <Users size={20} className="text-steel-blue" />
            角色快捷入口
            <span className="text-xs font-normal text-industrial-gray-500 ml-2">
              当前：{ROLE_LABELS[currentRole]}
            </span>
          </h3>
          <div className="space-y-3">
            {[
              {
                to: '/register',
                label: '登记新隐患',
                icon: FilePlus,
                color: 'from-safety-orange to-orange-600',
                show: currentRole === 'SAFETY_OFFICER',
                desc: '填写配电箱位置、隐患描述、期限等',
              },
              {
                to: '/hazards',
                label: '我的任务列表',
                icon: ListChecks,
                color: 'from-pending-blue to-blue-700',
                show: true,
                desc: '筛选查看所有待处理/已完成项目',
              },
              {
                to: '/statistics',
                label: '统计与导出',
                icon: BarChart3,
                color: 'from-success-green to-emerald-700',
                show:
                  currentRole === 'PROJECT_MANAGER' ||
                  currentRole === 'SAFETY_INSPECTOR',
                desc: '数据看板 + CSV整改单导出',
              },
              {
                to: '/meeting',
                label: '安监例会筛查',
                icon: Users,
                color: 'from-warning-yellow to-amber-700',
                show:
                  currentRole === 'SAFETY_INSPECTOR' ||
                  currentRole === 'PROJECT_MANAGER',
                desc: '按班组筛出反复打回的历史问题',
              },
            ]
              .filter((x) => x.show)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className="w-full flex items-center gap-3 p-4 rounded-[4px]
                      border border-industrial-gray-200 bg-white text-left
                      hover:shadow-industrial-hover hover:-translate-y-0.5
                      transition-all group"
                  >
                    <div
                      className={`w-11 h-11 rounded-[4px] bg-gradient-to-br ${item.color}
                        text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                    >
                      <Icon size={22} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-industrial-gray-900 group-hover:text-steel-blue">
                        {item.label}
                      </div>
                      <div className="text-xs text-industrial-gray-500 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                    <div className="text-industrial-gray-300 group-hover:text-steel-blue transition-colors">
                      →
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="mt-6 pt-4 border-t border-dashed border-industrial-gray-200">
            <div className="text-xs text-industrial-gray-500 mb-2">各状态图例</div>
            <div className="grid grid-cols-2 gap-2">
              {(['PENDING_RECTIFICATION', 'PENDING_REVIEW', 'CLOSED', 'REJECTED'] as HazardStatus[]).map(
                (s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded
                      bg-industrial-gray-50 text-xs"
                  >
                    <span className="text-industrial-gray-600">
                      {STATUS_LABELS[s]}
                    </span>
                    <span className="font-bold tabular-nums">{counts[s]}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
