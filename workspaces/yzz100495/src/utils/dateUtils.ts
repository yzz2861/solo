import { format, parse, addMinutes, differenceInMinutes, startOfDay, endOfDay, eachMinuteOfInterval } from 'date-fns';

export { addMinutes };
import { zhCN } from 'date-fns/locale';
import type { AppConfig } from '@/types';

export const formatDate = (date: Date | string, fmt: string = 'yyyy-MM-dd'): string => {
  const d = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
  return format(d, fmt, { locale: zhCN });
};

export const formatDateTime = (date: Date | string, fmt: string = 'yyyy-MM-dd HH:mm'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, fmt, { locale: zhCN });
};

export const formatTime = (date: Date | string, fmt: string = 'HH:mm'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, fmt, { locale: zhCN });
};

export const formatDateDisplay = (date: Date | string): string => {
  const d = typeof date === 'string' ? parse(date, 'yyyy-MM-dd', new Date()) : date;
  return format(d, 'M月d日 EEEE', { locale: zhCN });
};

export const parseDate = (dateStr: string): Date => {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
};

export const parseTime = (timeStr: string): Date => {
  return parse(timeStr, 'HH:mm', new Date());
};

export const getTimeSlot = (
  pickupTime: string,
  duration: number = 30
): string => {
  const time = parseTime(pickupTime);
  const minutes = time.getHours() * 60 + time.getMinutes();
  const slotStart = Math.floor(minutes / duration) * duration;
  const slotEnd = slotStart + duration;
  
  const formatSlot = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  return `${formatSlot(slotStart)}-${formatSlot(slotEnd)}`;
};

export const getTimeSlots = (config: AppConfig): string[] => {
  const start = parseTime(config.pickupStartTime);
  const end = parseTime(config.pickupEndTime);
  
  const slots: string[] = [];
  let current = startOfDay(new Date());
  current = addMinutes(current, start.getHours() * 60 + start.getMinutes());
  
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  
  while (current.getHours() * 60 + current.getMinutes() < endMinutes) {
    const next = addMinutes(current, config.timeSlotDuration);
    slots.push(`${formatTime(current)}-${formatTime(next)}`);
    current = next;
  }
  
  return slots;
};

export const isPeakHour = (timeSlot: string, peakHours: string[]): boolean => {
  return peakHours.some(peak => {
    const [peakStart, peakEnd] = peak.split('-');
    const [slotStart] = timeSlot.split('-');
    
    const peakStartMin = parseTime(peakStart).getHours() * 60 + parseTime(peakStart).getMinutes();
    const peakEndMin = parseTime(peakEnd).getHours() * 60 + parseTime(peakEnd).getMinutes();
    const slotStartMin = parseTime(slotStart).getHours() * 60 + parseTime(slotStart).getMinutes();
    
    return slotStartMin >= peakStartMin && slotStartMin < peakEndMin;
  });
};

export const calculateBakingTime = (
  pickupDateTime: Date,
  prepTime: number,
  bakingDuration: number = 20
): { start: Date; end: Date } => {
  const prepEnd = addMinutes(pickupDateTime, -prepTime);
  const bakingStart = addMinutes(prepEnd, -bakingDuration);
  return { start: bakingStart, end: prepEnd };
};

export const getDaysInMonth = (date: Date): Date[] => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days: Date[] = [];
  
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(addMinutes(firstDay, -i * 24 * 60));
  }
  
  for (let d = new Date(firstDay); d <= lastDay; d = addMinutes(d, 24 * 60)) {
    days.push(new Date(d));
  }
  
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(addMinutes(lastDay, i * 24 * 60));
  }
  
  return days;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};
