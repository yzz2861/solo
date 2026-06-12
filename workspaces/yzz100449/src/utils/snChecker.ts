import type { RecycleOrder } from '../types';
import { useRecycleStore } from '../store/useRecycleStore';

export function checkDuplicateSN(serialNumber: string, excludeId?: string): RecycleOrder | null {
  if (!serialNumber || serialNumber.length < 4) return null;
  const orders = useRecycleStore.getState().orders;
  return (
    orders.find((o) => o.serialNumber.toLowerCase() === serialNumber.toLowerCase() && o.id !== excludeId) ?? null
  );
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 500) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
