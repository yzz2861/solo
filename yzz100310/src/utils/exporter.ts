import type { ProcessedBorrowRecord } from '@/types';

export interface ReportConfig {
  startDate?: string;
  endDate?: string;
  includeReviewedOnly: boolean;
  includeFields: string[];
}

const DEFAULT_FIELDS = [
  'borrowId',
  'borrower',
  'borrowerId',
  'bookTitle',
  'borrowDate',
  'dueDate',
  'returnDate',
  'status',
  'overdueDays',
  'shouldFine',
  'waiverAmount',
  'finalWaiverAmount',
  'actualFine',
  'waiverConclusion',
  'reviewOpinion',
  'anomalies',
  'reviewDate',
];

const FIELD_LABELS: Record<string, string> = {
  borrowId: '借阅单号',
  borrower: '借阅人',
  borrowerId: '借阅人学号',
  bookTitle: '书名',
  borrowDate: '借出日期',
  dueDate: '应还日期',
  returnDate: '归还日期',
  status: '借阅状态',
  overdueDays: '逾期天数',
  shouldFine: '应缴罚金(元)',
  waiverAmount: '申请减免金额(元)',
  finalWaiverAmount: '最终减免金额(元)',
  actualFine: '实缴罚金(元)',
  waiverConclusion: '减免结论',
  reviewOpinion: '复核意见',
  anomalies: '异常标记',
  reviewDate: '复核日期',
};

const STATUS_LABELS: Record<string, string> = {
  borrowing: '在借',
  overdue: '已逾期',
  returned: '已归还',
  overdue_returned: '逾期已还',
};

const CONCLUSION_LABELS: Record<string, string> = {
  approved: '通过',
  rejected: '驳回',
  partial: '部分减免',
};

const ANOMALY_LABELS: Record<string, string> = {
  overdue_unreturned: '逾期未还',
  waiver_exceeded: '减免超限',
  applicant_mismatch: '申请人不一致',
  data_missing: '数据缺失',
};

export function getAvailableFields() {
  return DEFAULT_FIELDS.map((key) => ({ key, label: FIELD_LABELS[key] ?? key }));
}

function mapRow(record: ProcessedBorrowRecord, fields: string[]): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  fields.forEach((f) => {
    switch (f) {
      case 'borrowId':
        row[f] = record.borrow.borrowId;
        break;
      case 'borrower':
        row[f] = record.borrow.borrower;
        break;
      case 'borrowerId':
        row[f] = record.borrow.borrowerId;
        break;
      case 'bookTitle':
        row[f] = record.borrow.bookTitle;
        break;
      case 'borrowDate':
        row[f] = record.borrow.borrowDate;
        break;
      case 'dueDate':
        row[f] = record.borrow.dueDate;
        break;
      case 'returnDate':
        row[f] = record.returnRecord?.returnDate ?? '';
        break;
      case 'status':
        row[f] = STATUS_LABELS[record.status] ?? record.status;
        break;
      case 'overdueDays':
        row[f] = record.overdueDays;
        break;
      case 'shouldFine':
        row[f] = record.shouldFine;
        break;
      case 'waiverAmount':
        row[f] = record.waiver?.waiverAmount ?? 0;
        break;
      case 'finalWaiverAmount':
        row[f] = record.review.finalWaiverAmount;
        break;
      case 'actualFine':
        row[f] = record.actualFine;
        break;
      case 'waiverConclusion':
        row[f] = record.review.waiverConclusion
          ? CONCLUSION_LABELS[record.review.waiverConclusion] ?? ''
          : '';
        break;
      case 'reviewOpinion':
        row[f] = record.review.reviewOpinion ?? '';
        break;
      case 'anomalies':
        row[f] = (record.anomalies ?? []).map((a: any) => ANOMALY_LABELS[a] ?? a).join('、');
        break;
      case 'reviewDate':
        row[f] = record.review.reviewDate ?? '';
        break;
      default:
        row[f] = '';
    }
  });
  return row;
}

export function generateReportData(
  records: ProcessedBorrowRecord[],
  config: ReportConfig,
): Record<string, string | number>[] {
  const fields = config.includeFields.length > 0 ? config.includeFields : DEFAULT_FIELDS;

  let filtered = records;
  if (config.includeReviewedOnly) {
    filtered = filtered.filter((r) => r.review.status === 'reviewed');
  }
  if (config.startDate) {
    const start = new Date(config.startDate);
    filtered = filtered.filter((r) => {
      const d = r.review.reviewDate ? new Date(r.review.reviewDate) : null;
      return d ? d >= start : false;
    });
  }
  if (config.endDate) {
    const end = new Date(config.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((r) => {
      const d = r.review.reviewDate ? new Date(r.review.reviewDate) : null;
      return d ? d <= end : true;
    });
  }

  return filtered.map((r) => mapRow(r, fields));
}

export function exportToCSV(data: Record<string, string | number>[], filename: string): void {
  if (data.length === 0) {
    alert('暂无数据可导出');
    return;
  }
  const headers = Object.keys(data[0]);
  const escape = (v: string | number): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const headerLine = headers.map((h) => escape(FIELD_LABELS[h] ?? h)).join(',');
  const bodyLines = data.map((row) => headers.map((h) => escape(row[h])).join(','));
  const csv = '\ufeff' + [headerLine, ...bodyLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
