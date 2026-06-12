import { useEffect, useState } from 'react';
import { useBilliardStore } from '@/store';
import { calcElapsedBillableSeconds } from '@/lib/utils';

export function useNowTick(intervalMs = 1000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useSessionSeconds(sessionId: string | undefined): number {
  const now = useNowTick(1000);
  const session = useBilliardStore(s => s.sessions.find(x => x.id === sessionId));
  if (!session) return 0;
  return calcElapsedBillableSeconds(session, now);
}

export function useAutoPersist() {
  const saveToIDB = useBilliardStore(s => s.saveToIDB);
  useEffect(() => {
    const id = setInterval(() => {
      saveToIDB().catch(() => void 0);
    }, 30_000);
    return () => clearInterval(id);
  }, [saveToIDB]);
  useEffect(() => {
    const onBeforeUnload = () => { saveToIDB().catch(() => void 0); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveToIDB]);
}
