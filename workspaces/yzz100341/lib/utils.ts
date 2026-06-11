import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(s: string): string {
  return s;
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
  CANCELLED: '已撤回',
  MERGED: '已合并',
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-status-pending/15 text-status-pending border-status-pending/30',
  CONFIRMED: 'bg-status-confirmed/15 text-status-confirmed border-status-confirmed/30',
  REJECTED: 'bg-status-rejected/15 text-status-rejected border-status-rejected/30',
  CANCELLED: 'bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30',
  MERGED: 'bg-status-merged/15 text-status-merged border-status-merged/30',
};

export const ROLE_LABEL: Record<string, string> = {
  PARENT: '家长',
  TEACHER: '班主任',
  DRIVER: '司机',
  CONDUCTOR: '跟车老师',
  ADMIN: '校务处',
};
