export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  return s1 < e2 && s2 < e1;
}

export function getTimeSlotLabel(slot: 'morning' | 'afternoon'): string {
  return slot === 'morning' ? '上午' : '下午';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待到场',
    arrived: '已到场',
    checked_out: '已离场',
    overdue: '超时',
  };
  return labels[status] || status;
}

export function getCurrentTimeSlot(): 'morning' | 'afternoon' {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : 'afternoon';
}

export function calculateOverdueMinutes(endTime: string, checkOutTime?: string): number {
  if (checkOutTime) return 0;
  
  const now = new Date();
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const endDateTime = new Date();
  endDateTime.setHours(endHours, endMinutes, 0, 0);
  
  if (now <= endDateTime) return 0;
  
  return Math.floor((now.getTime() - endDateTime.getTime()) / (1000 * 60));
}

export function getTodayDateString(): string {
  return formatDate(new Date());
}
