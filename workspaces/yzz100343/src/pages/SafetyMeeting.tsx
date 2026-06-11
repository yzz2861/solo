import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ChevronDown,
  SlidersHorizontal,
  AlertTriangle,
  Shield,
  ShieldCheck,
  RotateCcw,
  MapPin,
  Calendar,
  ChevronUp,
  Eye,
  Wrench,
  ClipboardList,
  FileSpreadsheet,
  List,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { exportHazardsToCsv } from '@/utils/csvExport';
import { useToast } from '@/components/ui/ToastProvider';
import { TEAMS, ROLE_LABELS, STATUS_LABELS } from '@/types';
import type { Hazard, Team, HazardStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

const thresholds = [0, 1, 2, 3, 5];

export const SafetyMeeting: React.FC = () => {
  const navigate = useNavigate();
  const hazards = useAppStore((s) => s.hazards);
  const currentRole = useAppStore((s) => s.currentRole);
  const { showToast } = useToast();

  const [team, setTeam] = React.useState<Team | 'ALL'>('ALL');
  const [threshold, setThreshold] = React.useState<number>(1);
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | HazardStatus>('ALL');
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [openFilter, setOpenFilter] = React.useState(false);

  if (currentRole !== 'SAFETY_INSPECTOR' && currentRole !== 'PROJECT_MANAGER') {
    return (
      <div className="page-container">
        <div className="industrial-card p-12 text-center">
          <AlertTriangle size={56} className="mx-auto mb-4 text-warning-yellow" />
          <h2 className="text-xl font-bold mb-2">权限不足</h2>
          <p className="text-industrial-gray-500 mb-6">
            只有【安监人员 / 项目经理】角色可使用本功能。
          </p>
          <button className="btn-outline" onClick={() => navigate('/')}>
            ← 返回首页
          </button>
        </div>
      </div>
    );
  }

  const withRejects = React.useMemo(
    () =>
      hazards
        .filter((h) => h.rejectCount >= threshold)
        .filter((h) => (team === 'ALL' ? true : h.team === team))
        .filter((h) => (statusFilter === 'ALL' ? true : h.status === statusFilter))
        .sort((a, b) => {
          if (b.rejectCount !== a.rejectCount) return b.rejectCount - a.rejectCount;
          if (b.isOverdue !== a.isOverdue) return b.isOverdue ? 1 : -1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [hazards, threshold, team, statusFilter]
  );

  const totalRejectCount = withRejects.reduce((s, h) => s + h.rejectCount, 0);
  const teamsInvolved = new Set(withRejects.map((h) => h.team)).size;

  const exportList = () => {
    exportHazardsToCsv({
      hazards: withRejects,
      fileName: `安监例会筛查_${formatDate(new Date().toISOString(), 'yyyyMMdd')}.csv`,
    });
    showToast('success', `已导出 ${withRejects.length} 条问题记录`);
  };

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-black text-industrial-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[4px] bg-danger-red/15 text-danger-red flex items-center justify-center">
              <Shield size={22} strokeWidth={2.4} />
            </span>
            安监例会问题筛查
          </h2>
          <p className="text-sm text-industrial-gray-500 mt-1">
            按班组筛选反复被打回的问题 · 支持点名和详情查看
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportList} className="btn-steel text-xs">
            <FileSpreadsheet size={14} />
            导出本次筛查
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <MetricCard
          label="筛查问题数"
          value={withRejects.length}
          icon={<ClipboardList size={20} />}
          color="text-steel-blue"
          bg="bg-steel-blue/10"
        />
        <MetricCard
          label="累计打回次数"
          value={totalRejectCount}
          icon={<RotateCcw size={20} />}
          color="text-danger-red"
          bg="bg-red-50"
          highlight
        />
        <MetricCard
          label="涉及班组"
          value={teamsInvolved}
          icon={<Users size={20} />}
          color="text-warning-yellow"
          bg="bg-amber-50"
        />
        <MetricCard
          label="逾期问题"
          value={withRejects.filter((h) => h.isOverdue && h.status !== 'CLOSED').length}
          icon={<AlertTriangle size={20} />}
          color="text-danger-red"
          bg="bg-red-50"
          pulse={withRejects.some((h) => h.isOverdue && h.status !== 'CLOSED')}
        />
      </div>

      <div className="industrial-card p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setOpenFilter(!openFilter)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[4px] border border-industrial-gray-300 bg-white text-sm font-medium text-industrial-gray-700 hover:bg-industrial-gray-50 transition-colors"
              >
                <SlidersHorizontal size={15} />
                筛选条件
                <ChevronDown size={14} className={`transition-transform ${openFilter ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-industrial-gray-500 flex items-center gap-1">
                <Users size={14} />
                班组
              </span>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={team === 'ALL'}
                  onClick={() => setTeam('ALL')}
                >
                  全部
                </FilterChip>
                {TEAMS.map((t) => (
                  <FilterChip
                    key={t}
                    active={team === t}
                    onClick={() => setTeam(t)}
                  >
                    {t}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-industrial-gray-500 flex items-center gap-1 whitespace-nowrap">
              <RotateCcw size={14} />
              打回 ≥
            </span>
            <div className="flex items-center gap-1">
              {thresholds.map((n) => (
                <button
                  key={n}
                  onClick={() => setThreshold(n)}
                  className={`px-2.5 py-1 rounded-[4px] border text-xs font-bold tabular-nums transition-all ${
                    threshold === n
                      ? 'bg-danger-red text-white border-danger-red shadow-sm'
                      : 'bg-white text-industrial-gray-600 border-industrial-gray-200 hover:border-industrial-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {openFilter && (
          <div className="mt-4 pt-4 border-t border-dashed border-industrial-gray-200 flex flex-wrap items-center gap-3 animate-slide-in">
            <div className="text-xs font-semibold text-industrial-gray-500 uppercase tracking-wider">
              状态筛选
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
                全部状态
              </FilterChip>
              {(Object.keys(STATUS_LABELS) as HazardStatus[]).map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(s)}
                >
                  {STATUS_LABELS[s]}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="industrial-card overflow-hidden">
        <div className="px-5 py-3 border-b border-industrial-gray-200 bg-industrial-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-industrial-gray-800 flex items-center gap-2">
            <List size={16} className="text-danger-red" />
            问题清单
            <span className="text-xs font-normal text-industrial-gray-500">
              · 按打回次数倒序排列，可点击展开历史
            </span>
          </h3>
          <div className="flex items-center gap-3">
            {withRejects.length > 0 && (
              <button
                onClick={() =>
                  setExpanded(expanded === '__all' ? null : '__all')
                }
                className="text-xs text-industrial-gray-500 hover:text-steel-blue inline-flex items-center gap-1"
              >
                {expanded === '__all' ? (
                  <>
                    <ChevronUp size={13} />
                    全部收起
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} />
                    全部展开
                  </>
                )}
              </button>
            )}
            <span className="text-xs font-bold text-industrial-gray-600 tabular-nums">
              {withRejects.length} 条
            </span>
          </div>
        </div>

        {withRejects.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldCheck size={56} className="mx-auto mb-4 text-success-green/60" />
            <h3 className="text-lg font-bold text-industrial-gray-600 mb-2">
              太棒了！没有匹配的问题 🎉
            </h3>
            <p className="text-sm text-industrial-gray-500">
              尝试降低打回次数阈值或切换班组筛选
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-industrial-gray-100">
            {withRejects.map((h, idx) => (
              <MeetingRow
                key={h.id}
                idx={idx + 1}
                hazard={h}
                expanded={expanded === '__all' ? true : expanded === h.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === h.id ? null : h.id))
                }
                onView={(id) => navigate(`/hazards/${id}`)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  highlight?: boolean;
  pulse?: boolean;
}> = ({ label, value, icon, color, bg, highlight, pulse }) => (
  <div
    className={`industrial-card p-4 relative overflow-hidden ${
      pulse ? 'animate-pulse-slow ring-2 ring-danger-red/20' : ''
    }`}
  >
    <div className="flex items-start justify-between mb-2">
      <div
        className={`w-9 h-9 rounded-[4px] ${bg} ${color} flex items-center justify-center`}
      >
        {icon}
      </div>
      {highlight && value > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-danger-red/10 text-danger-red text-[10px] font-bold">
          重点关注
        </span>
      )}
    </div>
    <div
      className={`text-3xl font-black tabular-nums mb-1 ${
        highlight ? 'text-danger-red' : 'text-industrial-gray-900'
      }`}
    >
      {value}
    </div>
    <div className="text-xs font-medium text-industrial-gray-500">{label}</div>
  </div>
);

const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
      active
        ? 'bg-steel-blue text-white border-steel-blue shadow-sm'
        : 'bg-white text-industrial-gray-600 border-industrial-gray-200 hover:border-steel-blue/50 hover:text-steel-blue'
    }`}
  >
    {children}
  </button>
);

const MeetingRow: React.FC<{
  idx: number;
  hazard: Hazard;
  expanded: boolean;
  onToggle: () => void;
  onView: (id: string) => void;
}> = ({ idx, hazard, expanded, onToggle, onView }) => {
  const lastReview = hazard.reviews.filter((r) => !r.passed).slice(-1)[0];
  return (
    <li className="relative">
      <div
        className={`flex items-start gap-3 p-4 cursor-pointer transition-all ${
          expanded ? 'bg-steel-blue/[0.02]' : 'hover:bg-industrial-gray-50'
        }`}
        onClick={onToggle}
      >
        <div className="flex-shrink-0 w-14 flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
              hazard.rejectCount >= 3
                ? 'bg-danger-red text-white border-danger-red'
                : hazard.rejectCount >= 2
                ? 'bg-warning-yellow text-white border-warning-yellow'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            } ${hazard.isOverdue ? 'animate-pulse-slow shadow-danger-glow' : ''}`}
          >
            ×{hazard.rejectCount}
          </div>
          <span className="mt-1 text-[10px] text-industrial-gray-400 tabular-nums">
            #{String(idx).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-xs font-bold text-steel-blue bg-steel-blue/10 px-2 py-0.5 rounded">
              {hazard.boxNumber}
            </span>
            <TeamBadge team={hazard.team} size="sm" />
            <StatusBadge status={hazard.status} isOverdue={hazard.isOverdue} size="sm" />
            {hazard.isOverdue && (
              <span className="px-2 py-0.5 rounded-full bg-danger-red text-white text-[10px] font-bold animate-pulse-slow">
                ⚠️ 逾期
              </span>
            )}
          </div>

          <div className="flex items-start gap-1.5 mb-1 text-sm">
            <MapPin size={14} className="mt-0.5 text-industrial-gray-400 flex-shrink-0" />
            <span className="font-semibold text-industrial-gray-900">{hazard.location}</span>
          </div>

          <p className="text-xs text-industrial-gray-600 line-clamp-2 leading-relaxed mb-2">
            {hazard.description}
          </p>

          {lastReview && (
            <div className="p-2 rounded-[4px] bg-red-50 border border-red-200 text-xs text-danger-red leading-relaxed">
              <span className="font-bold mr-1 flex items-center gap-1 inline-block mb-0.5">
                <RotateCcw size={11} />
                最近打回
              </span>
              <span className="text-industrial-gray-400 mx-1">·</span>
              <span className="text-industrial-gray-500">
                {ROLE_LABELS[lastReview.reviewedBy]}
              </span>
              <div className="opacity-90">「{lastReview.comment}」</div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-industrial-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                登记 {formatDateTime(hazard.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Wrench size={11} />
                整改 {hazard.rectifications.length} 次
              </span>
              <span className="flex items-center gap-1">
                <Search size={11} />
                复查 {hazard.reviews.length} 次
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(hazard.id);
                }}
                className="btn-ghost text-[11px] px-2 py-1 hover:text-steel-blue"
              >
                <Eye size={12} />
                打开详情
              </button>
              <span
                className={`w-5 h-5 rounded-full bg-industrial-gray-100 flex items-center justify-center transition-transform ${
                  expanded ? 'rotate-180 bg-steel-blue/10 text-steel-blue' : 'text-industrial-gray-400'
                }`}
              >
                <ChevronDown size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pl-24">
          <div
            className="p-4 rounded-[4px] bg-industrial-gray-50 border border-industrial-gray-200
              animate-slide-in"
          >
            <div className="text-xs font-bold text-industrial-gray-600 uppercase tracking-wider mb-3">
              📋 复查打回历史（共 {hazard.reviews.filter((r) => !r.passed).length} 次）
            </div>
            <div className="space-y-2.5">
              {hazard.reviews
                .filter((r) => !r.passed)
                .map((r, i) => (
                  <div
                    key={r.id}
                    className="flex gap-3 p-3 rounded bg-white border border-danger-red/20"
                  >
                    <div className="w-7 h-7 rounded-full bg-danger-red/10 text-danger-red flex items-center justify-center flex-shrink-0 font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="text-xs font-semibold">
                          {ROLE_LABELS[r.reviewedBy]} 打回
                        </div>
                        <span className="text-[11px] text-industrial-gray-400 tabular-nums whitespace-nowrap">
                          {formatDateTime(r.reviewedAt)}
                        </span>
                      </div>
                      <div className="text-sm text-danger-red whitespace-pre-wrap leading-relaxed">
                        {r.comment}
                      </div>
                      {hazard.rectifications[i] && (
                        <div className="mt-2 pt-2 border-t border-dashed border-industrial-gray-200">
                          <div className="text-[11px] text-industrial-gray-400 mb-1">
                            对应整改说明：
                          </div>
                          <div className="text-xs text-industrial-gray-600 whitespace-pre-wrap leading-relaxed">
                            {hazard.rectifications[i].description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {hazard.reviews.filter((r) => !r.passed).length === 0 && (
                <div className="text-sm text-industrial-gray-400 text-center py-2">
                  暂无打回记录
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
};
