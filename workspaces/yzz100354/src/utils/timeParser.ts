export function parseFlexibleDateTime(dateStr: string, baseDate?: Date): Date {
  const trimmed = dateStr.trim();
  const base = baseDate || new Date();

  const fullDateTimeMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (fullDateTimeMatch) {
    const [, year, month, day, hour, minute, second] = fullDateTimeMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second || '0')
    );
  }

  const monthDayMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (monthDayMatch) {
    const [, month, day, hour, minute] = monthDayMatch;
    return new Date(
      base.getFullYear(),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  }

  const overnightMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*[-~至]\s*次日\s*(\d{1,2}):(\d{2})$/);
  if (overnightMatch) {
    const [, startHour, startMin, endHour, endMin] = overnightMatch;
    return new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      parseInt(startHour),
      parseInt(startMin)
    );
  }

  const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnlyMatch) {
    const [, hour, minute] = timeOnlyMatch;
    const h = parseInt(hour);
    const m = parseInt(minute);
    
    let result = new Date(base);
    result.setHours(h, m, 0, 0);
    
    if (result > base && base.getHours() > 12 && h < 6) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (isoMatch) {
    return new Date(trimmed);
  }

  const timestampMatch = trimmed.match(/^\d{10,13}$/);
  if (timestampMatch) {
    const ts = parseInt(trimmed);
    return new Date(ts.toString().length === 10 ? ts * 1000 : ts);
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`无法解析时间格式: ${dateStr}`);
}

export function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getDuration(start: Date, end: Date): { hours: number; minutes: number } {
  const diff = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diff / 60000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function formatDuration(start: Date, end: Date): string {
  const { hours, minutes } = getDuration(start, end);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  return parts.join('') || '0分钟';
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate();
}

export function getTimeRange(start: Date, end: Date, stepMinutes: number = 60): Date[] {
  const result: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    result.push(new Date(current));
    current = addMinutes(current, stepMinutes);
  }
  return result;
}
