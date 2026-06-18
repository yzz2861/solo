export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatMoney(n: number | string | null | undefined): string {
  const num = Number(n) || 0;
  return `¥${num.toFixed(2)}`;
}

export function getToday(): string {
  return formatDate(new Date());
}

export function isOverdue(expectedReturn: string): boolean {
  if (!expectedReturn) return false;
  return new Date(expectedReturn) < new Date();
}
