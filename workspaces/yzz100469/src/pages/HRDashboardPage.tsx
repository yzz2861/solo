import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
  Mail,
  Search,
  Filter,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Eye,
  Check,
  Clock,
} from 'lucide-react';
import { useInterviewStore } from '@/store';
import { getRiskLevel, getRiskColor, getRiskLabel } from '@/utils/analysis';
import type { RiskLevel } from '@/types';

export default function HRDashboardPage() {
  const navigate = useNavigate();
  const records = useInterviewStore(s => s.records);
  const setCurrentRecord = useInterviewStore(s => s.setCurrentRecord);

  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'risk' | 'date'>('risk');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const total = records.length;
    const high = records.filter(r => getRiskLevel(r.riskScore) === 'high').length;
    const medium = records.filter(r => getRiskLevel(r.riskScore) === 'medium').length;
    const low = records.filter(r => getRiskLevel(r.riskScore) === 'low').length;

    const evidenceCount = records.reduce((sum, r) => sum + r.annotations.filter(a => a.type === 'evidence').length, 0);
    const noEvidenceCount = records.reduce((sum, r) => sum + r.annotations.filter(a => a.type === 'no_evidence').length, 0);
    const biasCount = records.reduce((sum, r) => sum + r.annotations.filter(a => a.type === 'bias').length, 0);
    const avgRisk = total > 0 ? Math.round(records.reduce((sum, r) => sum + r.riskScore, 0) / total) : 0;

    const interviewers = new Set(records.map(r => r.interviewerAlias).filter(Boolean));
    const biasByInterviewer: Record<string, number> = {};
    records.forEach(r => {
      if (r.interviewerAlias) {
        biasByInterviewer[r.interviewerAlias] = (biasByInterviewer[r.interviewerAlias] || 0) +
          r.annotations.filter(a => a.type === 'bias').length;
      }
    });

    const evidenceRate = evidenceCount + noEvidenceCount > 0
      ? Math.round((evidenceCount / (evidenceCount + noEvidenceCount)) * 100)
      : 0;

    return { total, high, medium, low, evidenceCount, noEvidenceCount, biasCount, avgRisk, interviewers: interviewers.size, biasByInterviewer, evidenceRate };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (riskFilter !== 'all') {
      list = list.filter(r => getRiskLevel(r.riskScore) === riskFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q) ||
        r.interviewerAlias.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'risk') {
      list.sort((a, b) => b.riskScore - a.riskScore);
    } else {
      list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return list;
  }, [records, riskFilter, searchQuery, sortBy]);

  const handleViewRecord = (id: string) => {
    setCurrentRecord(id);
    navigate(`/analyze/${id}`);
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleSendReminder = () => {
    if (selectedIds.size === 0) {
      alert('请先选择需要提醒的纪要');
      return;
    }
    alert(`已向 ${selectedIds.size} 位面试官发送规范提醒：下次面试请多写行为证据，少写主观感受词，避免偏见性表述。`);
    setSelectedIds(new Set());
  };

  const riskDistribution = [
    { label: '高风险', value: stats.high, color: 'bg-bias', pct: stats.total > 0 ? (stats.high / stats.total) * 100 : 0 },
    { label: '中风险', value: stats.medium, color: 'bg-noevidence', pct: stats.total > 0 ? (stats.medium / stats.total) * 100 : 0 },
    { label: '低风险', value: stats.low, color: 'bg-evidence', pct: stats.total > 0 ? (stats.low / stats.total) * 100 : 0 },
  ];

  const topBiasInterviewers = Object.entries(stats.biasByInterviewer)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 opacity-0 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 text-white flex items-center justify-center shadow-soft">
              <BarChart3 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-brand-950 leading-tight">
                HR 风险抽查看板
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                监控纪要质量，识别高风险记录，及时发送规范提醒
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: '纪要总数',
              value: stats.total,
              icon: ShieldCheck,
              color: 'brand-700',
              trend: null,
              sub: `${stats.interviewers} 位面试官`,
            },
            {
              label: '平均风险',
              value: `${stats.avgRisk}`,
              icon: Sparkles,
              color: stats.avgRisk > 50 ? 'bias' : stats.avgRisk > 25 ? 'noevidence' : 'evidence',
              trend: null,
              sub: getRiskLabel(getRiskLevel(stats.avgRisk)),
            },
            {
              label: '证据覆盖率',
              value: `${stats.evidenceRate}%`,
              icon: CheckCircle2,
              color: stats.evidenceRate > 60 ? 'evidence' : 'noevidence',
              trend: stats.evidenceRate > 50 ? 'up' : 'down',
              sub: `有证据 ${stats.evidenceCount} / 无证据 ${stats.noEvidenceCount}`,
            },
            {
              label: '偏见表述',
              value: stats.biasCount,
              icon: AlertTriangle,
              color: stats.biasCount > 5 ? 'bias' : 'noevidence',
              trend: stats.biasCount > 0 ? 'down' : null,
              sub: '需重点关注',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            const colorMap: Record<string, string> = {
              'brand-700': 'bg-brand-100 text-brand-700',
              evidence: 'bg-evidence-light text-evidence-dark',
              noevidence: 'bg-noevidence-light text-noevidence-dark',
              bias: 'bg-bias-light text-bias',
            };
            return (
              <div
                key={idx}
                className={`glass-card p-5 opacity-0 animate-slide-up stagger-${idx + 1}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${colorMap[item.color]} flex items-center justify-center`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  {item.trend && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${
                      item.trend === 'up' ? 'text-evidence-dark' : 'text-bias'
                    }`}>
                      {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      正常
                    </span>
                  )}
                </div>
                <div className="font-display text-3xl font-bold text-neutral-800 mb-0.5">{item.value}</div>
                <div className="text-sm font-medium text-neutral-600 mb-1">{item.label}</div>
                <div className="text-xs text-neutral-400">{item.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="glass-card p-6 opacity-0 animate-slide-up stagger-5">
            <h3 className="font-display text-lg font-semibold text-brand-900 mb-4">风险分布</h3>
            <div className="flex items-center gap-6 mb-5">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    const radius = 15.915;
                    return riskDistribution.map((seg, idx) => {
                      const pct = seg.pct;
                      const dash = `${pct} ${100 - pct}`;
                      const el = (
                        <circle
                          key={idx}
                          cx="18"
                          cy="18"
                          r={radius - idx * 2.5}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={dash}
                          strokeDashoffset={-offset}
                          className={seg.color.replace('bg-', 'text-')}
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-neutral-800">{stats.total}</span>
                  <span className="text-xs text-neutral-500">总纪要</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {riskDistribution.map(seg => (
                  <div key={seg.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5 text-neutral-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${seg.color}`} />
                        {seg.label}
                      </span>
                      <span className="font-semibold text-neutral-800">{seg.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div className={`h-full ${seg.color} rounded-full transition-all duration-700`} style={{ width: `${seg.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6 opacity-0 animate-slide-up stagger-6">
            <h3 className="font-display text-lg font-semibold text-brand-900 mb-4">偏见表述 Top 面试官</h3>
            {topBiasInterviewers.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无偏见表述记录</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topBiasInterviewers.map(([name, count], idx) => {
                  const max = Math.max(...topBiasInterviewers.map(([, c]) => c));
                  const pct = (count / max) * 100;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                            idx === 0 ? 'bg-bias text-white' : idx === 1 ? 'bg-noevidence text-white' : idx === 2 ? 'bg-brand-100 text-brand-700' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-neutral-700 font-medium">{name}</span>
                        </span>
                        <span className="font-semibold text-bias">{count} 条</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-bias to-noevidence rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6 opacity-0 animate-slide-up stagger-7">
            <h3 className="font-display text-lg font-semibold text-brand-900 mb-4">证据缺失趋势</h3>
            <div className="flex items-end gap-1.5 h-32 mb-3">
              {[40, 55, 48, 62, 58, 70, 65, 72, 68, 75, 80, stats.evidenceRate].map((v, i, arr) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      v >= 70 ? 'bg-evidence' : v >= 50 ? 'bg-noevidence' : 'bg-bias'
                    } ${i === arr.length - 1 ? 'opacity-100' : 'opacity-60'}`}
                    style={{ height: `${v}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>12周前</span>
              <span className="font-medium text-neutral-600">
                当前 {stats.evidenceRate}% {stats.evidenceRate >= 60 ? '✓ 达标' : '⚠ 待提升'}
              </span>
              <span>本周</span>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200/60">
              <p className="text-xs text-neutral-500 leading-relaxed">
                💡 证据覆盖率 = 有证据判断 / (有证据判断 + 缺证据结论)，建议 ≥ 60%
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 opacity-0 animate-slide-up stagger-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-8 h-8 rounded-lg bg-bias-light flex items-center justify-center">
                <AlertTriangle size={16} className="text-bias" />
              </div>
              <h2 className="font-display text-xl font-semibold text-brand-900">高风险纪要列表</h2>
              <span className="chip bg-bias-light text-bias">
                {filteredRecords.length} 条
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  className="input-base !pl-9 !py-2 !text-sm w-48"
                  placeholder="搜索候选人/面试官"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="btn-secondary !px-3 !py-2 gap-1.5"
                >
                  <Filter size={14} />
                  {riskFilter === 'all' ? '全部风险' : getRiskLabel(riskFilter)}
                  <ChevronDown size={14} />
                </button>
                {showFilter && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl bg-white border border-neutral-200 shadow-elevated py-1 animate-fade-in">
                    {(['all', 'high', 'medium', 'low'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => { setRiskFilter(v); setShowFilter(false); }}
                        className={`w-full px-3.5 py-2 text-left text-sm transition-colors ${
                          riskFilter === v ? 'bg-brand-50 text-brand-800 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {v === 'all' ? '全部风险' : getRiskLabel(v)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select
                className="input-base !py-2 !text-sm w-auto"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="risk">按风险排序</option>
                <option value="date">按时间排序</option>
              </select>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between animate-fade-in">
              <span className="text-sm text-brand-800">
                已选择 <span className="font-semibold">{selectedIds.size}</span> 条纪要
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="btn-ghost !py-1.5 text-sm">
                  取消选择
                </button>
                <button onClick={handleSendReminder} className="btn-primary !py-1.5 !px-4 text-sm gap-1.5">
                  <Mail size={14} />
                  发送规范提醒
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="w-10 py-3">
                    <button
                      onClick={handleSelectAll}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        selectedIds.size === filteredRecords.length && filteredRecords.length > 0
                          ? 'bg-brand-700 border-brand-700 text-white'
                          : 'border-neutral-300 hover:border-brand-500'
                      }`}
                    >
                      {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 && <Check size={10} />}
                    </button>
                  </th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">候选人</th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">岗位</th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">面试官</th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">风险评分</th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">标注概览</th>
                  <th className="py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">更新时间</th>
                  <th className="py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      <Search size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">暂无符合条件的纪要</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const riskLevel = getRiskLevel(rec.riskScore);
                    const isSelected = selectedIds.has(rec.id);
                    const evCount = rec.annotations.filter(a => a.type === 'evidence').length;
                    const neCount = rec.annotations.filter(a => a.type === 'no_evidence').length;
                    const bCount = rec.annotations.filter(a => a.type === 'bias').length;

                    return (
                      <tr
                        key={rec.id}
                        className={`border-b border-neutral-100 hover:bg-neutral-50/60 transition-colors opacity-0 animate-slide-up ${
                          isSelected ? 'bg-brand-50/50' : ''
                        }`}
                        style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
                      >
                        <td className="py-4">
                          <button
                            onClick={() => handleToggleSelect(rec.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-brand-700 border-brand-700 text-white'
                                : 'border-neutral-300 hover:border-brand-500'
                            }`}
                          >
                            {isSelected && <Check size={10} />}
                          </button>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center text-xs font-semibold shadow-soft">
                              {rec.candidateName ? rec.candidateName.charAt(0) : '?'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-800">{rec.candidateName || '-'}</p>
                              <p className="text-xs text-neutral-400">第{rec.round}轮</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-sm text-neutral-700 truncate max-w-[160px]">{rec.position || '-'}</p>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700">
                            <Users size={12} className="text-neutral-400" />
                            {rec.interviewerAlias || '-'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-neutral-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  riskLevel === 'high' ? 'bg-bias' : riskLevel === 'medium' ? 'bg-noevidence' : 'bg-evidence'
                                }`}
                                style={{ width: `${rec.riskScore}%` }}
                              />
                            </div>
                            <span className={`chip ${getRiskColor(riskLevel)}`}>
                              {rec.riskScore}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="chip bg-evidence-light text-evidence-dark !py-0.5">{evCount}</span>
                            <span className="chip bg-noevidence-light text-noevidence-dark !py-0.5">{neCount}</span>
                            {bCount > 0 && <span className="chip bg-bias-light text-bias !py-0.5">{bCount}</span>}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                            <Clock size={12} />
                            {new Date(rec.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleViewRecord(rec.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-xs font-medium hover:bg-brand-100 transition-colors"
                          >
                            <Eye size={12} />
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
