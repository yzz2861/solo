import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import CommitmentCard from '../components/CommitmentCard';
import { getCommitments, exportCommitments, getOpportunities } from '../api';
import type { Commitment, Opportunity } from '../types';
import { downloadFile, getTypeLabel } from '../utils';

export default function CommitmentsList() {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cRes, oRes] = await Promise.all([
        getCommitments(),
        getOpportunities(),
      ]);
      setCommitments(cRes.data);
      setOpportunities(oRes.data);
    } catch (error) {
      console.error('Failed to load commitments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const res = await exportCommitments({
        format,
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        opportunity_id: opportunityFilter === 'all' ? undefined : Number(opportunityFilter),
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      downloadFile(blob, `承诺清单.${format}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    }
  };

  const filtered = commitments.filter((c) => {
    if (search && !c.content.includes(search) && !c.original_sentence.includes(search) && !c.sender.includes(search)) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (opportunityFilter !== 'all' && c.opportunity_id !== Number(opportunityFilter)) return false;
    if (confidenceFilter === 'high' && c.confidence < 0.8) return false;
    if (confidenceFilter === 'medium' && (c.confidence < 0.5 || c.confidence >= 0.8)) return false;
    if (confidenceFilter === 'low' && c.confidence >= 0.5) return false;
    return true;
  });

  const types = ['price', 'gift', 'delivery', 'aftersales', 'condition'];
  const statuses = ['pending', 'approved', 'rejected', 'needs_revision'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="承诺列表"
        description="查看和管理所有提取的承诺"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn-primary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              导出 CSV
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索承诺内容、原句、发送人..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}
          >
            <FunnelIcon className="w-4 h-4" />
            筛选
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 animate-fade-in">
            <div>
              <label className="label">承诺类型</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input">
                <option value="all">全部类型</option>
                {types.map((t) => (
                  <option key={t} value={t}>{getTypeLabel(t as any)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">审批状态</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
                <option value="all">全部状态</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === 'pending' ? '待审批' : s === 'approved' ? '已批准' : s === 'rejected' ? '已驳回' : '需修改'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">置信度</label>
              <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)} className="input">
                <option value="all">全部</option>
                <option value="high">高置信度 (≥80%)</option>
                <option value="medium">中置信度 (50%-80%)</option>
                <option value="low">低置信度 (&lt;50%)</option>
              </select>
            </div>
            <div>
              <label className="label">销售机会</label>
              <select value={opportunityFilter} onChange={(e) => setOpportunityFilter(e.target.value)} className="input">
                <option value="all">全部机会</option>
                {opportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>{opp.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
        <span>共 {filtered.length} 条承诺</span>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((c, idx) => (
            <Link key={c.id} to={`/commitments/${c.id}`} className="block">
              <CommitmentCard commitment={c} animationDelay={idx * 30} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-slate-400">暂无匹配的承诺记录</p>
          <Link to="/import" className="text-primary-600 hover:underline mt-2 inline-block">
            导入聊天记录
          </Link>
        </div>
      )}
    </div>
  );
}
