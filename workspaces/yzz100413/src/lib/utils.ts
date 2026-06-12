import type { OrderSession, BilliardTable, Package, Member, Settings } from '@/types';
import type { Checkout } from '@/types';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatMoney(n: number): string {
  return `¥${round2(n).toFixed(2)}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calcElapsedBillableSeconds(
  session: OrderSession,
  now: Date = new Date()
): number {
  const start = new Date(session.start_time).getTime();
  const elapsedMs = now.getTime() - start - session.total_paused_seconds * 1000;
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

export function calcTableFee(
  session: OrderSession,
  table: BilliardTable,
  settings: Settings,
  packages: Package[],
  members: Member[],
  now: Date = new Date()
): number {
  let elapsedSec = calcElapsedBillableSeconds(session, now);
  let elapsedMin = elapsedSec / 60;

  const { round_minutes, round_mode } = settings;
  if (round_mode === 'up') {
    elapsedMin = Math.ceil(elapsedMin / round_minutes) * round_minutes;
  } else {
    elapsedMin = Math.round(elapsedMin / round_minutes) * round_minutes;
  }
  elapsedMin = Math.max(0, elapsedMin);

  let fee = 0;

  if (session.customer_type === 'package' && session.package_id) {
    const pkg = packages.find(p => p.id === session.package_id);
    if (pkg) {
      if (elapsedMin <= pkg.duration_minutes) {
        fee = pkg.package_price;
      } else {
        const overMin = elapsedMin - pkg.duration_minutes;
        fee = pkg.package_price + (overMin / 60) * table.hourly_rate;
      }
    } else {
      fee = (elapsedMin / 60) * table.hourly_rate;
    }
  } else {
    fee = (elapsedMin / 60) * table.hourly_rate;
  }

  if (session.customer_type === 'member' && session.member_id) {
    const m = members.find(x => x.id === session.member_id);
    if (m) fee = fee * m.discount_rate;
  }

  return round2(fee);
}

export function calcProductTotal(items: { subtotal: number }[]): number {
  return round2(items.reduce((sum, it) => sum + it.subtotal, 0));
}

export function calcCheckoutTotals(
  tableFee: number,
  productTotal: number,
  discountRateOrAmount: { type: 'rate' | 'amount'; value: number }
) {
  const subtotal = round2(tableFee + productTotal);
  let discountAmount = 0;
  let appliedRate: number | null = null;

  if (discountRateOrAmount.type === 'rate') {
    const rate = Math.max(0, Math.min(1, discountRateOrAmount.value));
    appliedRate = rate;
    discountAmount = round2(subtotal * (1 - rate));
  } else {
    discountAmount = Math.max(0, Math.min(subtotal, discountRateOrAmount.value));
    appliedRate = subtotal > 0 ? round2(1 - discountAmount / subtotal) : 1;
  }

  const finalTotal = round2(subtotal - discountAmount);
  return { subtotal, discountAmount, discountRate: appliedRate, finalTotal };
}

export function calcChange(received: number, finalTotal: number): number {
  return round2(Math.max(0, received - finalTotal));
}

export function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function toCSVRow(arr: (string | number)[]): string {
  return arr.map(v => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }).join(',');
}

export function buildDailyReportCSV(
  checkouts: (Checkout & { table_no?: number; table_name?: string })[],
  revokedCount: number,
  revokedTotal: number
): string {
  const header = ['桌号', '桌名', '开台时间', '结账时间', '桌费', '饮料/小吃', '小计', '优惠金额', '应收', '实收', '找零', '收款方式'];
  const lines = [toCSVRow(header)];
  let sumTable = 0, sumProduct = 0, sumSub = 0, sumDisc = 0, sumFinal = 0, sumReceived = 0;
  checkouts.forEach(c => {
    sumTable += c.table_fee;
    sumProduct += c.product_total;
    sumSub += c.subtotal;
    sumDisc += c.discount_amount;
    sumFinal += c.final_total;
    sumReceived += c.received;
    lines.push(toCSVRow([
      c.table_no ?? '',
      c.table_name ?? '',
      c.checkout_time,
      c.checkout_time,
      c.table_fee.toFixed(2),
      c.product_total.toFixed(2),
      c.subtotal.toFixed(2),
      c.discount_amount.toFixed(2),
      c.final_total.toFixed(2),
      c.received.toFixed(2),
      c.change_amount.toFixed(2),
      c.payment_method,
    ]));
  });
  lines.push('');
  lines.push(toCSVRow(['合计', '', '', '', sumTable.toFixed(2), sumProduct.toFixed(2), sumSub.toFixed(2), sumDisc.toFixed(2), sumFinal.toFixed(2), sumReceived.toFixed(2), '', '']));
  lines.push(toCSVRow(['撤销单数', revokedCount, '撤销总额', revokedTotal.toFixed(2)]));
  return lines.join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
