export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const todayStr = (): string => formatDate(new Date());

export const parseTime = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const diffMinutes = (a: string, b: string): number => parseTime(a) - parseTime(b);

export const nowHM = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const minutesUntilArrival = (arrivalHM: string, dateStr?: string): number => {
  const today = dateStr || todayStr();
  const [h, m] = arrivalHM.split(':').map(Number);
  const target = new Date(`${today}T${arrivalHM}:00`);
  const now = new Date();
  if (today !== todayStr()) {
    return -1;
  }
  return Math.round((target.getTime() - now.getTime()) / 60000);
};

export const formatCountdown = (minutes: number): string => {
  if (minutes <= -1) return '非今日';
  if (minutes <= 0) return '已到店';
  if (minutes < 60) return `${minutes}分钟后`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}时${m > 0 ? m + '分' : ''}后`;
};

export const uid = (): string => {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
};

export const combineDateTime = (dateStr: string, timeHM: string): Date => {
  return new Date(`${dateStr}T${timeHM}:00`);
};
