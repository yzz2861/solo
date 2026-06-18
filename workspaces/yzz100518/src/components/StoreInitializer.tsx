import { useEffect } from 'react';
import { useAppStore } from '@/stores/app';

export function StoreInitializer() {
  const init = useAppStore((s) => s.init);
  const processTick = useAppStore((s) => s.processTick);
  const recordSnapshot = useAppStore((s) => s.recordSnapshot);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const interval = setInterval(() => {
      processTick(Date.now());
    }, 1000 * 15);
    return () => clearInterval(interval);
  }, [processTick]);

  useEffect(() => {
    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    const t1 = setTimeout(() => {
      recordSnapshot();
      const t2 = setInterval(recordSnapshot, 60 * 60 * 1000);
      return () => clearInterval(t2);
    }, msUntilNextHour);
    return () => clearTimeout(t1);
  }, [recordSnapshot]);

  return null;
}
