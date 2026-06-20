import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/PageHeader';
import CommitmentCard from '../components/CommitmentCard';
import {
  getCommitments,
  bulkApproveCommitments,
  approveCommitment,
  rejectCommitment,
  needsRevision,
  exportCommitments,
} from '../api';
import type { Commitment } from '../types';
import { downloadFile } from '../utils';

export default function Approvals() {
  const [pendingCommitments, setPendingCommitments] = useState<Commitment[]>([]);
  const [allCommitments, setAllCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getCommitments();
      setAllCommitments(res.data);
      setPendingCommitments(res.data.filter((c) => c.status === 'pending'));
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentList = activeTab === 'pending' ? pendingCommitments : allCommitments;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingCommitments.map((c) => c.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: number, isSelected: boolean) => {
    const newSelected = new Set(selected);
    if (isSelected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelected(newSelected);
    setSelectAll(newSelected.size === pendingCommitments.length);
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      await bulkApproveCommitments({
        ids: Array.from(selected),
        action: 'approve',
      });
      await loadData();
      setSelected(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Bulk approve failed:', error);
      alert('批量操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await approveCommitment(id);
      await loadData();
    } catch (error) {
      console.error('Approve failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(true);
    try {
      await rejectCommitment(id);
      await loadData();
    } catch (error) {
      console.error('Reject failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNeedsRevision = async (id: number) => {
    setActionLoading(true);
    try {
      await needsRevision(id);
      await loadData();
    } catch (error) {
      console.error('Needs revision failed:', error);
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportCommitments({ format: 'csv', status: 'pending' });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'text/csv' });
      downloadFile(blob, '待审批承诺.csv');
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败');
    }
  };

  const stats = {
    pending: pendingCommitments.length,
    total: allCommitments.length,
    approved: allCommitments.filter((c) => c.status === 'approved').length,
    rejected: allCommitments.filter((c) => c.status === 'rejected').length,
  };

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
        title="审批工作台"
        description="审核销售提取的承诺内容，确保准确性"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-600 font-medium">待审批</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <p className="text-sm text-emerald-600 font-medium">已批准</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.approved}</p>
        </div>
        <div className="card p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600 font-medium">已驳回</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.rejected}</p>
        </div>
        <div className="card p-4 bg-slate-50 border-slate-200">
          <p className="text-sm text-slate-600 font-medium">总计</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{stats.total}</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'pending' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              待审批 ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all' ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部 ({stats.total})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" />
              导出待审批
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'pending' && pendingCommitments.length > 0 && (
        <div className="card p-4 mb-4 flex items-center justify-between bg-primary-50 border-primary-200">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-primary-700">
              已选择 {selected.size} / {pendingCommitments.length} 条
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={selected.size === 0 || actionLoading}
              className="btn-ghost-emerald flex items-center gap-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              批量批准
            </button>
          </div>
        </div>
      )}

      {currentList.length > 0 ? (
        <div className="space-y-3">
          {currentList.map((c, idx) => (
            <CommitmentCard
              key={c.id}
              commitment={c}
              showActions={c.status === 'pending'}
              onApprove={handleApprove}
              onReject={handleReject}
              onRevise={handleNeedsRevision}
              onSelect={activeTab === 'pending' ? handleSelect : undefined}
              selected={selected.has(c.id)}
              animationDelay={idx * 30}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-400 mb-4" />
          <p className="text-lg font-medium text-slate-700">
            {activeTab === 'pending' ? '太棒了！没有待审批的承诺' : '暂无承诺记录'}
          </p>
          <p className="text-slate-500 mt-1">
            {activeTab === 'pending' ? '所有承诺都已处理完毕' : '导入聊天记录后将显示在这里'}
          </p>
        </div>
      )}
    </div>
  );
}
