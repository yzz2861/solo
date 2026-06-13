import dayjs from 'dayjs';

export function formatDateTime(ts) {
  return dayjs(ts).format('YYYY-MM-DD HH:mm');
}

export function formatDate(ts) {
  return dayjs(ts).format('YYYY-MM-DD');
}

export function formatMoney(val) {
  return `¥${Number(val || 0).toFixed(2)}`;
}

export function exportCSV(filename, headers, rows) {
  const BOM = '\uFEFF';
  const headerLine = headers.join(',');
  const dataLines = rows.map(r =>
    headers.map((_, i) => {
      const cell = String(r[i] ?? '');
      return cell.includes(',') || cell.includes('"') || cell.includes('\n')
        ? `"${cell.replace(/"/g, '""')}"`
        : cell;
    }).join(',')
  );
  const csv = BOM + headerLine + '\n' + dataLines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const MATERIAL_TYPES = [
  { value: 'paint', label: '颜料' },
  { value: 'canvas', label: '画布' },
  { value: 'brush', label: '画笔' },
  { value: 'other', label: '其他' },
];

export const MATERIAL_UNITS = [
  { value: 'tube', label: '管' },
  { value: 'piece', label: '张' },
  { value: '支', label: '支' },
  { value: 'bottle', label: '瓶' },
  { value: 'set', label: '套' },
  { value: 'box', label: '盒' },
];

export const PAINT_COLORS = [
  '白色', '钛白', '锌白', '煤黑', '象牙黑',
  '大红', '朱红', '深红', '玫瑰红', '土红',
  '柠檬黄', '中黄', '土黄', '橙黄',
  '湖蓝', '群青', '钴蓝', '普蓝',
  '草绿', '中绿', '翠绿', '橄榄绿', '粉绿',
  '紫罗兰', '青莲',
  '赭石', '熟褐', '生褐',
  '灰色', '浅灰', '深灰',
];

export function resolveColorAlias(input, aliases) {
  if (!input) return input;
  const match = aliases.find(a => a.alias === input.trim());
  return match ? match.canonicalColor : input.trim();
}
