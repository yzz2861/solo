import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export { dayjs };

export function formatMinutes(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分钟`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDateTime(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DD HH:mm');
}

export function formatTime(ts: number): string {
  return dayjs(ts).format('HH:mm');
}

export function formatDate(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DD');
}

export function todayStr(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function deriveStudentId(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return `stu_anon_${Date.now().toString(36)}`;
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  return `stu_${trimmed.toLowerCase().replace(/\s+/g, '_')}_${Math.abs(hash).toString(36)}`;
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headerLine = headers.join(',');
  const bodyLines = rows.map((r) => headers.map((h) => escape(r[h])).join(','));
  const csv = '\uFEFF' + [headerLine, ...bodyLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
