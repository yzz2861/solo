import type { CommitmentType, CommitmentStatus } from '../types';

export const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

export const getConfidenceColor = (confidence: number): string => {
  const level = getConfidenceLevel(confidence);
  const colors = {
    high: 'text-emerald-600',
    medium: 'text-amber-600',
    low: 'text-warning-500',
  };
  return colors[level];
};

export const getConfidenceBgColor = (confidence: number): string => {
  const level = getConfidenceLevel(confidence);
  const colors = {
    high: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-orange-100 text-orange-800',
  };
  return colors[level];
};

export const getStatusLabel = (status: CommitmentStatus): string => {
  const labels: Record<CommitmentStatus, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已驳回',
    needs_revision: '需修改',
  };
  return labels[status];
};

export const getTypeLabel = (type: CommitmentType): string => {
  const labels: Record<CommitmentType, string> = {
    price: '报价折扣',
    gift: '赠品',
    delivery: '交付时间',
    aftersales: '售后承诺',
    condition: '待确认条件',
  };
  return labels[type];
};

export const getTypeColor = (type: CommitmentType): string => {
  const colors: Record<CommitmentType, string> = {
    price: 'bg-blue-100 text-blue-800',
    gift: 'bg-purple-100 text-purple-800',
    delivery: 'bg-cyan-100 text-cyan-800',
    aftersales: 'bg-teal-100 text-teal-800',
    condition: 'bg-pink-100 text-pink-800',
  };
  return colors[type];
};

export const getTypeIcon = (type: CommitmentType): string => {
  const icons: Record<CommitmentType, string> = {
    price: '💰',
    gift: '🎁',
    delivery: '📅',
    aftersales: '🔧',
    condition: '❓',
  };
  return icons[type];
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = formatDateTime;

export const formatDateShort = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatCurrency = (amount: number): string => {
  if (!amount) return '';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const downloadFile = (content: string | Blob, filename: string, type?: string) => {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: type || 'application/octet-stream' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
