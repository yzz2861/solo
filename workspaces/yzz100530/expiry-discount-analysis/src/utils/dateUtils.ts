export function parseExpiryDate(dateStr: string): Date | null {
  const formats = [
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
    { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
    { regex: /^(\d{2})-(\d{2})-(\d{4})$/, parse: (m: RegExpMatchArray) => new Date(+m[3], +m[1] - 1, +m[2]) },
    { regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, parse: (m: RegExpMatchArray) => new Date(+m[1], +m[2] - 1, +m[3]) },
    { regex: /^(\w{3})\s+(\d{1,2}),\s*(\d{4})$/, parse: (m: RegExpMatchArray) => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month = months.indexOf(m[1]);
        return month >= 0 ? new Date(+m[3], month, +m[2]) : null;
      }
    },
  ];

  for (const fmt of formats) {
    const match = dateStr.trim().match(fmt.regex);
    if (match) {
      const date = fmt.parse(match);
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / oneDay);
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`;
}

export function detectDateFormat(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'ISO格式 (YYYY-MM-DD)';
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) return '斜杠格式 (YYYY/MM/DD)';
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return '美式格式 (MM-DD-YYYY)';
  if (/^\d{4}年\d{1,2}月\d{1,2}日$/.test(dateStr)) return '中文格式 (年月日)';
  if (/^\d{8}$/.test(dateStr)) return '纯数字 (YYYYMMDD)';
  if (/^[A-Za-z]{3}\s+\d{1,2},\s*\d{4}$/.test(dateStr)) return '英文格式 (Mon DD, YYYY)';
  return '未知格式';
}
