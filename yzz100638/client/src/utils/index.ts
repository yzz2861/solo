import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getConfidenceColor(score: number): string {
  if (score >= 0.7) return 'text-success-600';
  if (score >= 0.5) return 'text-warning-600';
  return 'text-danger-600';
}

export function getConfidenceBgColor(score: number): string {
  if (score >= 0.7) return 'bg-success-50 border-success-200';
  if (score >= 0.5) return 'bg-warning-50 border-warning-200';
  return 'bg-danger-50 border-danger-200';
}

export function getConfidenceLabel(score: number): string {
  if (score >= 0.7) return '高置信';
  if (score >= 0.5) return '中置信';
  return '低置信';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '草稿',
    confirmed: '已确认',
    'reshoot-pending': '待补拍',
    'reshoot-completed': '补拍完成',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-success-100 text-success-700',
    'reshoot-pending': 'bg-warning-100 text-warning-700',
    'reshoot-completed': 'bg-primary-100 text-primary-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
