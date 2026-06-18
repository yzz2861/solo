import { format, parseISO, addDays, subDays, differenceInDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatDate = (date: string | Date, pattern: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, pattern, { locale: zhCN });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
};

export const formatMealType = (type: string): string => {
  const labels: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    supper: '夜宵'
  };
  return labels[type] || type;
};

export const getDateRange = (days: number): { start: string; end: string } => {
  const end = new Date('2026-06-18');
  const start = subDays(end, days - 1);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  };
};

export const getTomorrow = (): string => {
  return format(addDays(new Date('2026-06-18'), 1), 'yyyy-MM-dd');
};

export const getDateArray = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const days = differenceInDays(end, start) + 1;
  
  for (let i = 0; i < days; i++) {
    dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
  }
  
  return dates;
};

export const isWeekend = (date: string): boolean => {
  const d = parseISO(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

export const getDayOfWeek = (date: string): number => {
  return parseISO(date).getDay();
};

export const getWeekDayFactor = (dayOfWeek: number): number => {
  const factors: Record<number, number> = {
    0: 1.15,
    1: 1.0,
    2: 1.0,
    3: 1.0,
    4: 1.0,
    5: 1.05,
    6: 1.15
  };
  return factors[dayOfWeek] || 1.0;
};

export const formatRelativeTime = (dateStr: string): string => {
  const date = parseISO(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(dateStr);
};
