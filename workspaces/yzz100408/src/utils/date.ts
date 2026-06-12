import { format, parseISO, differenceInMinutes, startOfDay, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (date: Date | string, pattern: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
};

export const formatTime = (date: Date | string, pattern: string = 'HH:mm'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN });
};

export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
};

export const ensureDate = (date: Date | string): Date => {
  if (date instanceof Date) return date;
  return parseISO(date);
};

export const getHourOfDay = (date: Date | string): number => ensureDate(date).getHours();

export const isCrossDay = (start: Date | string, end: Date | string): boolean => {
  return !isSameDay(ensureDate(start), ensureDate(end));
};

export const diffMinutes = (start: Date | string, end: Date | string): number => {
  return Math.max(0, differenceInMinutes(ensureDate(end), ensureDate(start)));
};

export const getDateMinutes = (date: Date | string): number => ensureDate(date).getMinutes();

export const getDateTimestamp = (date: Date | string): number => ensureDate(date).getTime();

export const getTodayString = (): string => format(new Date(), 'yyyy-MM-dd');

export const createDateFromParts = (dateStr: string, hour: number, minute: number = 0): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
};

export const getHoursArray = (): number[] => Array.from({ length: 24 }, (_, i) => i);

export const formatHourLabel = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

export { startOfDay, addDays, isSameDay };

const DATE_FIELDS_ORDER = ['queueStartTime', 'chargeStartTime', 'chargeEndTime'];
const DATE_FIELDS_QUEUE = ['timestamp'];
const DATE_FIELDS_FAULT = ['faultStartTime', 'faultEndTime'];

export const restoreDatesInOrders = (orders: any[]) => {
  return orders.map(o => {
    const result = { ...o };
    for (const f of DATE_FIELDS_ORDER) {
      if (result[f] && typeof result[f] === 'string') {
        result[f] = ensureDate(result[f]);
      }
    }
    return result;
  });
};

export const restoreDatesInQueue = (records: any[]) => {
  return records.map(r => {
    const result = { ...r };
    for (const f of DATE_FIELDS_QUEUE) {
      if (result[f] && typeof result[f] === 'string') {
        result[f] = ensureDate(result[f]);
      }
    }
    return result;
  });
};

export const restoreDatesInFaults = (faults: any[]) => {
  return faults.map(f => {
    const result = { ...f };
    for (const fld of DATE_FIELDS_FAULT) {
      if (result[fld] && typeof result[fld] === 'string') {
        result[fld] = ensureDate(result[fld]);
      }
    }
    return result;
  });
};
