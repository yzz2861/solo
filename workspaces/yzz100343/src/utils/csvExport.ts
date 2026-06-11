import type { Hazard } from '@/types';
import {
  STATUS_LABELS,
  ROLE_LABELS,
} from '@/types';
import { formatDateTime, formatDate } from './dateUtils';

interface ExportOptions {
  hazards: Hazard[];
  fileName?: string;
}

const HEADERS = [
  '编号',
  '配电箱编号',
  '位置',
  '隐患描述',
  '责任班组',
  '登记人',
  '登记时间',
  '整改期限',
  '当前状态',
  '打回次数',
  '是否逾期',
  '整改说明',
  '整改时间',
  '复查意见',
  '复查结果',
  '复查时间',
];

const escapeCsv = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const hazardToRow = (h: Hazard): string[] => {
  const lastRect = h.rectifications[h.rectifications.length - 1];
  const lastReview = h.reviews[h.reviews.length - 1];

  return [
    h.id.slice(0, 8).toUpperCase(),
    h.boxNumber,
    h.location,
    h.description,
    h.team,
    ROLE_LABELS[h.createdBy] ?? h.createdBy,
    formatDateTime(h.createdAt),
    formatDate(h.deadline),
    STATUS_LABELS[h.status] ?? h.status,
    String(h.rejectCount),
    h.isOverdue ? '是' : '否',
    lastRect?.description ?? '',
    lastRect ? formatDateTime(lastRect.submittedAt) : '',
    lastReview?.comment ?? '',
    lastReview ? (lastReview.passed ? '通过' : '打回') : '',
    lastReview ? formatDateTime(lastReview.reviewedAt) : '',
  ];
};

export const exportHazardsToCsv = ({
  hazards,
  fileName,
}: ExportOptions): void => {
  const timestamp = formatDate(new Date().toISOString(), 'yyyyMMdd_HHmmss');
  const finalFileName = fileName ?? `临电整改单_${timestamp}.csv`;

  const rows = [HEADERS, ...hazards.map(hazardToRow)];
  const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', finalFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
