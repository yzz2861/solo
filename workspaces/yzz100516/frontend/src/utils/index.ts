import { SampleStatus, SamplePurpose, ApprovalStatus } from '../types';

export const statusMap: Record<SampleStatus, { label: string; color: string }> = {
  [SampleStatus.PENDING_APPROVAL]: { label: '待审批', color: 'orange' },
  [SampleStatus.APPROVED]: { label: '已审批', color: 'blue' },
  [SampleStatus.OUT]: { label: '已出区', color: 'purple' },
  [SampleStatus.RETURNED]: { label: '已归还', color: 'green' },
  [SampleStatus.DESTROYED]: { label: '已销毁', color: 'default' },
  [SampleStatus.OVERDUE]: { label: '已超期', color: 'red' },
};

export const purposeMap: Record<SamplePurpose, string> = {
  [SamplePurpose.RND]: '研发',
  [SamplePurpose.CUSTOMER]: '客户展示',
  [SamplePurpose.EXHIBITION]: '展览',
  [SamplePurpose.TESTING]: '测试',
  [SamplePurpose.OTHER]: '其他',
};

export const approvalStatusMap: Record<ApprovalStatus, { label: string; color: string }> = {
  [ApprovalStatus.PENDING]: { label: '待审批', color: 'orange' },
  [ApprovalStatus.APPROVED]: { label: '已通过', color: 'green' },
  [ApprovalStatus.REJECTED]: { label: '已拒绝', color: 'red' },
};

export const purposeOptions = Object.entries(purposeMap).map(([value, label]) => ({
  value,
  label,
}));

export const statusOptions = Object.entries(statusMap).map(([value, { label }]) => ({
  value,
  label,
}));

export function formatDate(date?: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
