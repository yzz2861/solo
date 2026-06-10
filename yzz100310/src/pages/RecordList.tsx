import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '@/components/Layout';
import { useLibraryStore } from '@/store/useLibraryStore';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge, AnomalyList, ReviewStatusBadge } from '@/components/StatusBadge';
import type { ProcessedBorrowRecord, BorrowStatus } from '@/types';
import { Search, Filter, X, ChevronRight } from 'lucide-react';

type AnomalyFilterValue = 'all' | 'has' | 'overdue_unreturned' | 'waiver_exceeded' | 'applicant_mismatch' | 'data_missing';

const STATUS_OPTIONS: { value: BorrowStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'borrowing', label: '在借' },
  { value: 'overdue', label: '已逾期' },
  { value: 'returned', label: '已归还' },
  { value: 'overdue_returned', label: '逾期已还' },
];

const ANOMALY_OPTIONS: { value: AnomalyFilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'has', label: '有异常' },
  { value: 'overdue_unreturned', label: '逾期未还' },
  { value: 'waiver_exceeded', label: '减免超限' },
  { value: 'applicant_mismatch', label: '申请人不一致' },
  { value: 'data_missing', label: '数据缺失' },
];

const REVIEW_OPTIONS: { value: 'all' | 'pending' | 'reviewed'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待复核' },
  { value: 'reviewed', label: '已复核' },
];

export default function RecordList() {
  const { processed } = useLibraryStore();
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | 'all'>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyFilterValue>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'reviewed'>('all');

  const filtered = useMemo(() => {
    return processed.filter((p) => {
      if (keyword) {
        const k = keyword.trim().toLowerCase();
        if (
          !p.borrow.borrowId.toLowerCase().includes(k) &&
          !p.borrow.borrower.toLowerCase().includes(k) &&
          !p.borrow.bookTitle.toLowerCase().includes(k) &&
          !p.borrow.borrowerId.toLowerCase().includes(k)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (reviewFilter !== 'all' && p.review.status !== reviewFilter) return false;
      if (anomalyFilter !== 'all') {
        if (anomalyFilter === 'has') {
          if (p.anomalies.length === 0) return false;
        } else {
          if (!p.anomalies.includes(anomalyFilter as any)) return false;
        }
      }
      return true;
    });
  }, [processed, keyword, statusFilter, anomalyFilter, reviewFilter]);

  const hasFilters = keyword || statusFilter !== 'all' || anomalyFilter !== 'all' || reviewFilter !== 'all';

  const columns: Column<ProcessedBorrowRecord>[] = [
    {
      key: 'borrowId',
      title: '借阅单号',
      sortable: true,
      sortValue: (r) => r.borrow.borrowId,
      render: (r) => <span className="font-mono text-xs text-primary">{r.borrow.borrowId}</span>,
    },
    {
      key: 'borrower',
      title: '借阅人',
      sortable: true,
      sortValue: (r) => r.borrow.borrower,
      render: (r) => (
        <div>
          <div className="text-sm text-primary font-medium">{r.borrow.borrower || '—'}</div>
          <div className="text-xs text-primary/50">{r.borrow.borrowerId}</div>
        </div>
      ),
    },
    {
      key: 'bookTitle',
      title: '书名',
      sortable: true,
      sortValue: (r) => r.borrow.bookTitle,
      render: (r) => (r.borrow.bookTitle ? <span className="text-primary/90">{r.borrow.bookTitle}</span> : '—'),
    },
    {
      key: 'dates',
      title: '借出 / 应还',
      render: (r) => (
        <div className="text-xs">
          <div className="text-primary/70">借: {r.borrow.borrowDate || '—'}</div>
          <div className="text-primary/70">应还: {r.borrow.dueDate || '—'}</div>
          {r.returnRecord && <div className="text-green-700">归还: {r.returnRecord.returnDate}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      title: '借阅状态',
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'fine',
      title: '应缴 / 实缴',
      sortable: true,
      sortValue: (r) => r.shouldFine,
      render: (r) => (
        <div className="text-xs">
          <div className="text-primary/80">应缴: ¥{r.shouldFine.toFixed(2)}</div>
          {r.review.status === 'reviewed' ? (
            <div className="text-accent-dark font-semibold">实缴: ¥{r.actualFine.toFixed(2)}</div>
          ) : (
            <div className="text-primary/40">待复核</div>
          )}
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
      title: '复核状态',
      sortable: true,
      sortValue: (r) => r.review.status,
      render: (r) => <ReviewStatusBadge status={r.review.status} />,
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
        title="借阅单列表"
        subtitle={`共 ${processed.length} 条记录，当前筛选 ${filtered.length} 条`}
      />

      <div className="card mb-4">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
              <input
                className="input pl-9"
                placeholder="搜索借阅单号、借阅人、学号、书名…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <FilterLabel icon={<Filter className="w-3.5 h-3.5" />} />
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={STATUS_OPTIONS}
            />
            <Select
              value={anomalyFilter}
              onChange={(v) => setAnomalyFilter(v as any)}
              options={ANOMALY_OPTIONS}
            />
            <Select value={reviewFilter} onChange={(v) => setReviewFilter(v as any)} options={REVIEW_OPTIONS} />

            {hasFilters && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setKeyword('');
                  setStatusFilter('all');
                  setAnomalyFilter('all');
                  setReviewFilter('all');
                }}
              >
                <X className="w-3.5 h-3.5" />
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.borrow.borrowId}
        onRowClick={(r) => navigate(`/records/${r.borrow.borrowId}`)}
        rowClassName={(r) => (r.anomalies.length > 0 ? 'border-l-4 border-l-red-400' : '')}
        emptyText={processed.length === 0 ? '暂无数据，请先在「数据导入」页上传文件' : '没有符合筛选条件的记录'}
      />
    </Layout>
  );
}

function FilterLabel({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-primary/50 font-medium">{icon} 筛选</span>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="input !w-auto !py-1.5 !pr-8 text-xs"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
