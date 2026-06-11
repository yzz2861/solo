import dayjs from 'dayjs';
import type { BookingStatus, AlertType } from '@shared/types';

export const STATUS_COLORS: Record<BookingStatus, string> = {
  confirmed: 'bg-military-700 border-military-600',
  pending_deposit: 'bg-gold-700 border-gold-600',
  cancelled: 'bg-ink-600 border-ink-500',
  completed: 'bg-ink-700 border-ink-600',
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: '已确认',
  pending_deposit: '待付定金',
  cancelled: '已取消',
  completed: '已完成',
};

export const ALERT_COLORS: Record<AlertType, string> = {
  image_invalid: 'bg-vermilion-700/20 border-vermilion-600 text-vermilion-400',
  time_conflict: 'bg-vermilion-700/20 border-vermilion-600 text-vermilion-400',
  deposit_pending: 'bg-gold-700/20 border-gold-600 text-gold-400',
  sensitive_area: 'bg-gold-700/20 border-gold-600 text-gold-400',
  revision_high: 'bg-ink-600/50 border-ink-500 text-ivory-300',
  allergy_warning: 'bg-vermilion-700/20 border-vermilion-600 text-vermilion-400',
};

export const ALERT_LABELS: Record<AlertType, string> = {
  image_invalid: '图片失效',
  time_conflict: '时段冲突',
  deposit_pending: '待付定金',
  sensitive_area: '敏感部位',
  revision_high: '多次改稿',
  allergy_warning: '过敏提醒',
};

export const ALERT_ICONS: Record<AlertType, string> = {
  image_invalid: 'ImageOff',
  time_conflict: 'ClockAlert',
  deposit_pending: 'Wallet',
  sensitive_area: 'Eye',
  revision_high: 'Edit3',
  allergy_warning: 'AlertTriangle',
};

export function formatDateTime(date: string | Date, format = 'YYYY-MM-DD HH:mm'): string {
  return dayjs(date).format(format);
}

export function formatDate(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function formatTime(date: string | Date): string {
  return dayjs(date).format('HH:mm');
}

export function getWeekDates(baseDate?: string | Date): Date[] {
  const base = baseDate ? dayjs(baseDate) : dayjs();
  const startOfWeek = base.startOf('week');
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(startOfWeek.add(i, 'day').toDate());
  }
  return dates;
}

export function getTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

export function getDurationMinutes(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'minute');
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function getStatusBadgeClass(status: BookingStatus): string {
  const base = 'px-2 py-1 text-xs font-medium rounded border';
  const color = STATUS_COLORS[status];
  return `${base} ${color}`;
}

export function getAlertBadgeClass(type: AlertType): string {
  const base = 'px-2 py-1 text-xs font-medium rounded border';
  const color = ALERT_COLORS[type];
  return `${base} ${color}`;
}

export async function imageToBase64(filePath: string): Promise<string | null> {
  try {
    const exists = await window.electronAPI.fs.fileExists(filePath);
    if (!exists) return null;
    const base64 = await window.electronAPI.fs.readFile(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}
