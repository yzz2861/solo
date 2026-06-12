import type { EquipmentCategory, EquipmentStatus, ReturnCondition, CleaningStatus, ClaimStatus } from '../../../shared/types.js';

export const categoryLabel: Record<EquipmentCategory, string> = {
  tent: '帐篷',
  stove: '炉具',
  sleeping_bag: '睡袋',
  mat: '防潮垫',
  backpack: '背包',
  other: '其他',
};

export const categoryEmoji: Record<EquipmentCategory, string> = {
  tent: '⛺',
  stove: '🔥',
  sleeping_bag: '🛌',
  mat: '🧘',
  backpack: '🎒',
  other: '🧰',
};

export const statusLabel: Record<EquipmentStatus, string> = {
  available: '可租',
  rented: '已租出',
  cleaning: '待清洁',
  repairing: '维修中',
  retired: '已退役',
};

export const statusColor: Record<EquipmentStatus, string> = {
  available: 'bg-forest-100 text-forest-700 border-forest-200',
  rented: 'bg-ember-100 text-ember-700 border-ember-200',
  cleaning: 'bg-amber-100 text-amber-700 border-amber-200',
  repairing: 'bg-rose-100 text-rose-700 border-rose-200',
  retired: 'bg-bark-100 text-bark-500 border-bark-200',
};

export const conditionLabel: Record<ReturnCondition, string> = {
  clean: '干净无需清洁',
  needs_cleaning: '需清洁',
  damaged: '有损坏',
};

export const cleaningLabel: Record<CleaningStatus, string> = {
  pending: '待清洁',
  in_progress: '清洁中',
  done: '已清洁',
};

export const cleaningColor: Record<CleaningStatus, string> = {
  pending: 'bg-ember-50 text-ember-600 border-ember-200',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-200',
  done: 'bg-forest-50 text-forest-700 border-forest-200',
};

export const claimLabel: Record<ClaimStatus, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

export const claimColor: Record<ClaimStatus, string> = {
  pending: 'bg-ember-100 text-ember-700 border-ember-200',
  approved: 'bg-forest-100 text-forest-700 border-forest-200',
  rejected: 'bg-bark-100 text-bark-500 border-bark-200',
};

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

export function downloadCsv(
  rows: Array<Record<string, string | number>>,
  filename: string
): void {
  if (!rows.length) {
    alert('暂无数据可导出');
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function currency(n: number): string {
  return '¥' + n.toFixed(0);
}
