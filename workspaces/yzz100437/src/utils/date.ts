export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
};

export const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export const getWeekEnd = (date: Date = new Date()): Date => {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
};

export const getWeekDates = (date: Date = new Date()): string[] => {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
};

export const isToday = (dateStr: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

export const isThisWeek = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();
  return date >= weekStart && date <= weekEnd;
};

export const isWithinDays = (dateStr: string, days: number): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.abs(diff) <= days * 24 * 60 * 60 * 1000;
};

export const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getDefaultNextRehearsalDate = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  let daysToAdd = 0;
  
  if (dayOfWeek <= 3) {
    daysToAdd = 3 - dayOfWeek;
  } else if (dayOfWeek === 4) {
    daysToAdd = 0;
  } else {
    daysToAdd = 7 - dayOfWeek + 3;
  }
  
  if (daysToAdd === 0 && today.getHours() >= 20) {
    daysToAdd = 7;
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);
  return nextDate.toISOString().split('T')[0];
};

export const getNextPerformanceDate = (): Date => {
  const today = new Date();
  const performanceDate = new Date(today);
  performanceDate.setDate(today.getDate() + 14);
  return performanceDate;
};
