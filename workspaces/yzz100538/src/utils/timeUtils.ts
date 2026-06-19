import { format, addMinutes, differenceInMinutes, isSameDay, startOfDay, endOfDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatTime = (dateStr: string): string => {
  return format(parseISO(dateStr), 'HH:mm', { locale: zhCN });
};

export const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), 'yyyy年MM月dd日', { locale: zhCN });
};

export const formatDateShort = (date: Date): string => {
  return format(date, 'MM月dd日', { locale: zhCN });
};

export const formatDateTime = (dateStr: string): string => {
  return format(parseISO(dateStr), 'MM月dd日 HH:mm', { locale: zhCN });
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分钟`;
  if (mins === 0) return `${hours}小时`;
  return `${hours}小时${mins}分钟`;
};

export const calcDurationMinutes = (start: string, end: string): number => {
  return differenceInMinutes(parseISO(end), parseISO(start));
};

export const addMinutesToTime = (timeStr: string, minutes: number): string => {
  return addMinutes(parseISO(timeStr), minutes).toISOString();
};

export const isToday = (dateStr: string): boolean => {
  return isSameDay(parseISO(dateStr), new Date());
};

export const getTodayStart = (): Date => startOfDay(new Date());
export const getTodayEnd = (): Date => endOfDay(new Date());

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const isBeforeNow = (dateStr: string): boolean => {
  return parseISO(dateStr).getTime() < Date.now();
};

export const isAfterNow = (dateStr: string): boolean => {
  return parseISO(dateStr).getTime() > Date.now();
};

export const getMinutesUntil = (dateStr: string): number => {
  return differenceInMinutes(parseISO(dateStr), new Date());
};

export const getMinutesFromNow = (dateStr: string): number => {
  return differenceInMinutes(new Date(), parseISO(dateStr));
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(0)}`;
};
