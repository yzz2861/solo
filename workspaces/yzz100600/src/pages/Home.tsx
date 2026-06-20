import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import AlertBanner from '@/components/AlertBanner';
import ParameterPanel from '@/components/ParameterPanel';
import ResultPanel from '@/components/ResultPanel';
import HistoryTimeline from '@/components/HistoryTimeline';
import RecordModal from '@/components/RecordModal';
import BubbleBackground from '@/components/BubbleBackground';
import { useWaterStore } from '@/store/useWaterStore';
import { calculateFillTime } from '@/utils/water-calc';

const Home = () => {
  const { params, loadAll } = useWaterStore();
  const [mounted, setMounted] = useState(false);
  const [dismissedMsgs, setDismissedMsgs] = useState<string[]>([]);

  useEffect(() => {
    loadAll();
    setMounted(true);
  }, [loadAll]);

  useEffect(() => {
    setDismissedMsgs([]);
  }, [JSON.stringify(params)]);

  const result = useMemo(() => calculateFillTime(params), [params]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative">
      <BubbleBackground />

      <div className="relative z-10">
        <Header />

        <AlertBanner
          warnings={result.warnings}
          dismissed={dismissedMsgs}
          onDismiss={(m) => setDismissedMsgs((prev) => [...prev, m])}
        />

        <main className="container py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ParameterPanel />
            </div>
            <div className="lg:col-span-3 space-y-6">
              <ResultPanel params={params} result={result} />
            </div>
          </div>

          <div className="mt-6">
            <HistoryTimeline />
          </div>
        </main>

        <footer className="container py-8 pb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-industrial-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span>本地数据安全存储 · localStorage · 无需联网</span>
            </div>
            <div>
              水塔补水耗时估算系统 · 物业工程部专用 · © {new Date().getFullYear()}
            </div>
          </div>
        </footer>
      </div>

      <RecordModal />
    </div>
  );
};

export default Home;
