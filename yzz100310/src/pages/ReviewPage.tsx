import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '@/components/Layout';
import { useLibraryStore } from '@/store/useLibraryStore';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge, AnomalyList, ConclusionBadge } from '@/components/StatusBadge';
import type { ProcessedBorrowRecord, WaiverConclusion } from '@/types';
import { ClipboardCheck, AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react';

export default function ReviewPage() {
  const { processed, updateReview } = useLibraryStore();
  const navigate = useNavigate();
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [showOnlyAnomaly, setShowOnlyAnomaly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConclusion, setBulkConclusion] = useState<WaiverConclusion>('approved');
  const [bulkOpinion, setBulkOpinion] = useState('批量复核通过');
  const [bulkReviewer, setBulkReviewer] = useState('');

  const list = useMemo(() => {
    return processed.filter((p) => {
      if (showOnlyPending && p.review.status !== 'pending') return false;
      if (showOnlyAnomaly && p.anomalies.length === 0) return false;
      return true;
    });
  }, [processed, showOnlyPending, showOnlyAnomaly]);

  const pendingCount = processed.filter((p) => p.review.status === 'pending').length;
  const anomalyCount = processed.filter((p) => p.anomalies.length > 0 && p.review.status === 'pending').length;

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === list.length) setSelected(new Set());
    else setSelected(new Set(list.map((p) => p.borrow.borrowId)));
  }

  function handleBulk() {
    if (selected.size === 0) {
      alert('请先选择要批量复核的记录');
      return;
    }
    if (!bulkReviewer.trim()) {
      alert('请填写复核人姓名');
      return;
    }
    for (const id of selected) {
      const rec = processed.find((p) => p.borrow.borrowId === id);
      const waiverAmount =
        bulkConclusion === 'approved'
          ? rec?.waiver?.waiverAmount ?? rec?.shouldFine ?? 0
          : bulkConclusion === 'rejected'
            ? 0
            : (rec?.shouldFine ?? 0) / 2;
      updateReview(id, {
        reviewer: bulkReviewer,
        reviewOpinion: bulkOpinion,
        waiverConclusion: bulkConclusion,
        finalWaiverAmount: Number(waiverAmount.toFixed(2)),
      });
    }
    setSelected(new Set());
    alert(`已批量复核 ${selected.size} 条记录`);
  }

  const columns: Column<ProcessedBorrowRecord>[] = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={list.length > 0 && selected.size === list.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 cursor-pointer"
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          checked={selected.has(r.borrow.borrowId)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(r.borrow.borrowId);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 cursor-pointer"
        />
      ),
      width: '44px',
    },
    {
      key: 'borrowId',
      title: '借阅单号',
      sortable: true,
      sortValue: (r) => r.borrow.borrowId,
      render: (r) => <span className="font-mono text-xs">{r.borrow.borrowId}</span>,
    },
    {
      key: 'borrower',
      title: '借阅人 / 书名',
      sortable: true,
      sortValue: (r) => r.borrow.borrower,
      render: (r) => (
        <div>
          <div className="text-sm font-medium">{r.borrow.borrower || '—'}</div>
          <div className="text-xs text-primary/50 truncate max-w-[200px]">{r.borrow.bookTitle}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: '借阅状态',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'fine',
      title: '应缴 / 申请减免',
      render: (r) => (
        <div className="text-xs">
          <div>应缴: ¥{r.shouldFine.toFixed(2)}</div>
          <div className="text-amber-600">
            申请: ¥{r.waiver?.waiverAmount.toFixed(2) ?? '0.00'}
          </div>
        </div>
      ),
    },
    {
      key: 'anomalies',
      title: '异常',
      render: (r) => <AnomalyList anomalies={r.anomalies} />,
    },
    {
      key: 'review',
      title: '复核结论',
      render: (r) => <ConclusionBadge conclusion={r.review.waiverConclusion} />,
    },
    {
      key: 'action',
      title: '',
      render: () => (
        <div className="flex justify-end">
          <ChevronRight className="w-4 h-4 text-primary/30" />
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <PageHeader
        title="复核工作台"
        subtitle={`待复核 ${pendingCount} 条，其中异常待处理 ${anomalyCount} 条`}
      />

      <div className="card mb-4">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
                className="w-4 h-4"
              />
              仅显示待复核
            </label>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAnomaly}
                onChange={(e) => setShowOnlyAnomaly(e.target.checked)}
                className="w-4 h-4"
              />
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              仅显示异常
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-sm text-primary/60">已选 {selected.size} 条</span>
              <input
                className="input !w-32 !py-1.5 text-xs"
                placeholder="复核人姓名"
                value={bulkReviewer}
                onChange={(e) => setBulkReviewer(e.target.value)}
              />
              <select
                className="input !w-auto !py-1.5 text-xs"
                value={bulkConclusion ?? ''}
                onChange={(e) => setBulkConclusion((e.target.value || null) as WaiverConclusion)}
              >
                <option value="approved">通过</option>
                <option value="partial">部分减免</option>
                <option value="rejected">驳回</option>
              </select>
              <input
                className="input !w-48 !py-1.5 text-xs"
                placeholder="批量复核意见"
                value={bulkOpinion}
                onChange={(e) => setBulkOpinion(e.target.value)}
              />
              <button className="btn btn-accent btn-sm" onClick={handleBulk}>
                <CheckCircle className="w-3.5 h-3.5" />
                批量复核
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={list}
        rowKey={(r) => r.borrow.borrowId}
        onRowClick={(r) => navigate(`/records/${r.borrow.borrowId}`)}
        rowClassName={(r) =>
          r.anomalies.length > 0
            ? 'border-l-4 border-l-red-400'
            : r.review.status === 'pending'
              ? 'border-l-4 border-l-amber-300'
              : ''
        }
        emptyText="没有待复核的记录"
      />
    </Layout>
  );
}
