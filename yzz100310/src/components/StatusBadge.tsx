import type { BorrowStatus, AnomalyType, WaiverConclusion, ReviewStatus } from '@/types';

const STATUS_CONFIG: Record<BorrowStatus, { label: string; className: string }> = {
  borrowing: { label: '在借', className: 'bg-blue-100 text-blue-700' },
  overdue: { label: '已逾期', className: 'bg-red-100 text-red-700 animate-pulse-slow' },
  returned: { label: '已归还', className: 'bg-green-100 text-green-700' },
  overdue_returned: { label: '逾期已还', className: 'bg-amber-100 text-amber-700' },
};

const ANOMALY_CONFIG: Record<Exclude<AnomalyType, null>, { label: string; className: string }> = {
  overdue_unreturned: { label: '逾期未还', className: 'bg-red-100 text-red-700' },
  waiver_exceeded: { label: '减免超限', className: 'bg-orange-100 text-orange-700' },
  applicant_mismatch: { label: '申请人不一致', className: 'bg-purple-100 text-purple-700' },
  data_missing: { label: '数据缺失', className: 'bg-gray-100 text-gray-700' },
};

const CONCLUSION_CONFIG: Record<Exclude<WaiverConclusion, null>, { label: string; className: string }> = {
  approved: { label: '通过', className: 'bg-green-100 text-green-700' },
  rejected: { label: '驳回', className: 'bg-red-100 text-red-700' },
  partial: { label: '部分减免', className: 'bg-amber-100 text-amber-700' },
};

const REVIEW_CONFIG: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: '待复核', className: 'bg-gray-100 text-gray-600' },
  reviewed: { label: '已复核', className: 'bg-primary/10 text-primary' },
};

export function StatusBadge({ status }: { status: BorrowStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <span className={`chip ${cfg.className}`}>{cfg.label}</span>;
}

export function AnomalyBadge({ type }: { type: Exclude<AnomalyType, null> }) {
  const cfg = ANOMALY_CONFIG[type];
  return <span className={`chip ${cfg.className}`}>⚠ {cfg.label}</span>;
}

export function AnomalyList({ anomalies }: { anomalies: AnomalyType[] }) {
  if (!anomalies || anomalies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {anomalies.map((a, i) =>
        a ? <AnomalyBadge key={i} type={a} /> : null,
      )}
    </div>
  );
}

export function ConclusionBadge({ conclusion }: { conclusion: WaiverConclusion }) {
  if (!conclusion) return <span className="chip bg-gray-100 text-gray-500">未裁定</span>;
  const cfg = CONCLUSION_CONFIG[conclusion];
  return <span className={`chip ${cfg.className}`}>{cfg.label}</span>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const cfg = REVIEW_CONFIG[status];
  return <span className={`chip ${cfg.className}`}>{cfg.label}</span>;
}
