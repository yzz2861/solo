import {
  format,
  differenceInCalendarDays,
  isBefore,
  startOfDay,
  isToday,
  parseISO,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (dateStr: string, pattern: string = 'yyyy-MM-dd'): string => {
  try {
    return format(parseISO(dateStr), pattern, { locale: zhCN });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
};

export const getDaysRemaining = (deadline: string): number => {
  return differenceInCalendarDays(parseISO(deadline), new Date());
};

export const isOverdueDeadline = (deadline: string): boolean => {
  return isBefore(parseISO(deadline), startOfDay(new Date()));
};

export const isCreatedToday = (createdAt: string): boolean => {
  try {
    return isToday(parseISO(createdAt));
  } catch {
    return false;
  }
};

export const todayISO = (): string => new Date().toISOString();

export const formatRelative = (deadline: string): { text: string; isOverdue: boolean } => {
  const days = getDaysRemaining(deadline);
  if (days < 0) {
    return { text: `逾期 ${Math.abs(days)} 天`, isOverdue: true };
  }
  if (days === 0) {
    return { text: '今天截止', isOverdue: false };
  }
  if (days === 1) {
    return { text: '明天截止', isOverdue: false };
  }
  return { text: `剩余 ${days} 天`, isOverdue: false };
};
