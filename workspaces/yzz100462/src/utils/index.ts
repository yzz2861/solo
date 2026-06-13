export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDates(base: string): string[] {
  const d = new Date(base + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(monday);
    t.setDate(t.getDate() + i);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekNames[d.getDay()]}`;
}

export function weekdayShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = toMinutes(aStart);
  const ae = toMinutes(aEnd);
  const bs = toMinutes(bStart);
  const be = toMinutes(bEnd);
  return as < be && bs < ae;
}

export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openPrintWindow(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 24px; color: #111; }
h1 { font-size: 22px; margin: 0 0 16px; }
h2 { font-size: 16px; margin: 20px 0 10px; color: #0A2540; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;}
table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px;}
th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
th { background: #eef7ff; color: #0A2540; font-weight: 600; }
.meta { color: #6b7280; font-size: 13px; margin-bottom: 16px;}
</style>
</head>
<body>
${bodyHtml}
<script>window.onload = function() { window.print(); }</script>
</body></html>`);
  w.document.close();
}
