import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListFilter,
  Search,
  Calendar,
  Users,
  Tag,
  Flame,
  RotateCcw,
  FilePlus,
  ListChecks,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { HazardCard } from '@/components/hazard/HazardCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { TEAMS, ALL_STATUSES, STATUS_LABELS } from '@/types';
import type { HazardStatus, Team, Hazard } from '@/types';

type StatusFilter = HazardStatus | 'ALL' | 'OVERDUE';

const STATUS_FILTERS: { key: StatusFilter; label: string; className: string }[] = [
  { key: 'ALL', label: '全部', className: 'bg-industrial-gray-100 text-industrial-gray-700 border-industrial-gray-300' },
  { key: 'PENDING_RECTIFICATION', label: STATUS_LABELS.PENDING_RECTIFICATION, className: 'bg-blue-50 text-pending-blue border-blue-200' },
  { key: 'PENDING_REVIEW', label: STATUS_LABELS.PENDING_REVIEW, className: 'bg-amber-50 text-warning-yellow border-amber-200' },
  { key: 'CLOSED', label: STATUS_LABELS.CLOSED, className: 'bg-green-50 text-success-green border-green-200' },
  { key: 'REJECTED', label: STATUS_LABELS.REJECTED, className: 'bg-red-50 text-danger-red border-red-200' },
  { key: 'OVERDUE', label: '逾期', className: 'bg-red-500 text-white border-red-500' },
];

export const HazardList: React.FC = () => {
  const navigate = useNavigate();
  const hazards = useAppStore((s) => s.hazards);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const currentRole = useAppStore((s) => s.currentRole);

  const [status, setStatus] = React.useState<StatusFilter>(
    (filters.status as StatusFilter) || (filters.onlyOverdue ? 'OVERDUE' : 'ALL')
  );
  const [team, setTeam] = React.useState<Team | 'ALL'>(filters.team || 'ALL');
  const [keyword, setKeyword] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState(filters.dateFrom || '');
  const [dateTo, setDateTo] = React.useState(filters.dateTo || '');

  React.useEffect(() => {
    setFilters({
      status: status === 'OVERDUE' ? undefined : (status as HazardStatus | 'ALL'),
      team: team as Team | 'ALL',
      onlyOverdue: status === 'OVERDUE',
      dateFrom,
      dateTo,
    });
  }, [status, team, dateFrom, dateTo, setFilters]);

  const filtered: Hazard[] = React.useMemo(() => {
    return hazards.filter((h) => {
      if (status === 'OVERDUE') {
        if (!h.isOverdue || h.status === 'CLOSED') return false;
      } else if (status !== 'ALL') {
        if (h.status !== status) return false;
      }
      if (team !== 'ALL' && h.team !== team) return false;
      if (dateFrom && h.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && h.createdAt.slice(0, 10) > dateTo) return false;
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase();
        const hay = [h.boxNumber, h.location, h.description].join(' ').toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.rejectCount !== b.rejectCount) return b.rejectCount - a.rejectCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [hazards, status, team, keyword, dateFrom, dateTo]);

  const resetFilters = () => {
    setStatus('ALL');
    setTeam('ALL');
    setKeyword('');
    setDateFrom('');
    setDateTo('');
  };

  const countsByStatus = React.useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: hazards.length,
      PENDING_RECTIFICATION: 0,
      PENDING_REVIEW: 0,
      CLOSED: 0,
      REJECTED: 0,
      OVERDUE: 0,
    };
    hazards.forEach((h) => {
      c[h.status]++;
      if (h.isOverdue && h.status !== 'CLOSED') c.OVERDUE++;
    });
    c.PENDING_RECTIFICATION! += c.REJECTED!;
    return c;
  }, [hazards]);

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-black text-industrial-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[4px] bg-steel-blue/15 text-steel-blue flex items-center justify-center">
              <ListChecks size={22} strokeWidth={2.4} />
            </span>
            隐患台账
            <span className="text-base font-normal text-industrial-gray-500 ml-1">
              · 共 <b className="tabular-nums text-steel-blue">{filtered.length}</b> 条
            </span>
          </h2>
          <p className="text-sm text-industrial-gray-500 mt-1">
            多条件筛选、搜索、定位指定隐患记录
          </p>
        </div>
        {currentRole === 'SAFETY_OFFICER' && (
          <button className="btn-primary" onClick={() => navigate('/register')}>
            <FilePlus size={16} />
            登记新隐患
          </button>
        )}
      </div>

      <div className="industrial-card p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <ListFilter size={17} className="text-industrial-gray-500" />
          <h3 className="text-sm font-bold text-industrial-gray-800">筛选条件</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            const count = countsByStatus[f.key] ?? 0;
            return (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                  text-xs font-medium transition-all ${
                    active
                      ? `${f.className} shadow-sm ring-2 ring-offset-1 ring-steel-blue/20`
                      : 'bg-white text-industrial-gray-500 border-industrial-gray-200 hover:border-industrial-gray-400 hover:text-industrial-gray-700'
                  }`}
              >
                {f.key === 'OVERDUE' && <Flame size={12} />}
                {f.label}
                <span
                  className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] tabular-nums flex items-center justify-center
                    ${active ? (f.key === 'OVERDUE' ? 'bg-white/30' : 'bg-white/80') : 'bg-industrial-gray-100'}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索编号/位置/描述关键词..."
              className="input-base pl-9"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-industrial-gray-100 text-industrial-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-gray-400 pointer-events-none" />
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value as Team | 'ALL')}
                className="input-base pl-9 appearance-none pr-8"
              >
                <option value="ALL">全部班组</option>
                {TEAMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-industrial-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-base pl-9"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <span className="text-industrial-gray-400 flex-shrink-0">至</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-base flex-1"
            />
          </div>
        </div>

        {(team !== 'ALL' || keyword || dateFrom || dateTo || status !== 'ALL') && (
          <div className="mt-4 pt-4 border-t border-dashed border-industrial-gray-200 flex flex-wrap items-center gap-2">
            <span className="text-xs text-industrial-gray-500 mr-1">已选：</span>
            {status !== 'ALL' && (
              <span className="chip bg-blue-50 text-pending-blue border-blue-200">
                <Tag size={11} />
                {STATUS_FILTERS.find((s) => s.key === status)?.label}
                <button onClick={() => setStatus('ALL')} className="ml-1 opacity-60 hover:opacity-100">
                  <X size={10} />
                </button>
              </span>
            )}
            {team !== 'ALL' && (
              <span className="chip">
                <TeamBadge team={team as Team} size="sm" />
                <button onClick={() => setTeam('ALL')} className="ml-1 text-industrial-gray-400 hover:text-danger-red">
                  <X size={10} />
                </button>
              </span>
            )}
            {keyword && (
              <span className="chip bg-industrial-gray-50 text-industrial-gray-600 border-industrial-gray-200">
                「{keyword}」
                <button onClick={() => setKeyword('')} className="ml-1 opacity-60 hover:opacity-100">
                  <X size={10} />
                </button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="chip bg-industrial-gray-50 text-industrial-gray-600 border-industrial-gray-200">
                <Calendar size={11} />
                {dateFrom || '...'} ~ {dateTo || '...'}
              </span>
            )}
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-industrial-gray-500 hover:text-danger-red inline-flex items-center gap-1"
            >
              <RotateCcw size={11} />
              清空筛选
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="industrial-card p-16 text-center">
          <Search size={52} className="mx-auto mb-4 text-industrial-gray-300" />
          <h3 className="text-lg font-bold text-industrial-gray-600 mb-2">
            没有匹配的记录
          </h3>
          <p className="text-sm text-industrial-gray-400 mb-6">
            尝试调整筛选条件或清空搜索关键词
          </p>
          <button onClick={resetFilters} className="btn-outline">
            <RotateCcw size={14} />
            重置筛选
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((h) => (
            <HazardCard key={h.id} hazard={h} />
          ))}
        </div>
      )}
    </div>
  );
};
