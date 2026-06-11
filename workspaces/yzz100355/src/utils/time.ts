export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} ${formatTime(d)}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  }
  return `${secs}秒`;
};

export const formatDurationShort = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getTimeDifference = (start: string | Date, end: string | Date): number => {
  const s = typeof start === 'string' ? new Date(start).getTime() : start.getTime();
  const e = typeof end === 'string' ? new Date(end).getTime() : end.getTime();
  return (e - s) / 1000;
};

export const addSeconds = (date: string | Date, seconds: number): Date => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setSeconds(d.getSeconds() + seconds);
  return d;
};

export const getShiftTimeRange = (shiftName: string): { start: string; end: string } => {
  const shifts: { [key: string]: { start: string; end: string } } = {
    '夜班A': { start: '20:00:00', end: '00:00:00' },
    '夜班B': { start: '00:00:00', end: '04:00:00' },
    '夜班C': { start: '04:00:00', end: '08:00:00' },
  };
  return shifts[shiftName] || { start: '20:00:00', end: '08:00:00' };
};

export const generateTimeTicks = (startTime: string, endTime: string, count: number): Date[] => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const interval = (end - start) / (count - 1);
  
  return Array.from({ length: count }, (_, i) => new Date(start + interval * i));
};
