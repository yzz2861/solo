export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function generateOrderNo(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const seq = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `TF-${dateStr}-${seq}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    pending: '待确认',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] ?? status;
}

export function lossTypeLabel(type: string): string {
  const map: Record<string, string> = {
    unknown: '待确认',
    lost: '丢失',
    normal_trial: '正常试用',
  };
  return map[type] ?? type;
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    '样品': '样品',
    '赠品': '赠品',
    '试用装': '试用装',
    '正品': '正品',
  };
  return map[category] ?? category;
}
