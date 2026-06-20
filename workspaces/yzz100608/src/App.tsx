import React from 'react';
import { motion } from 'framer-motion';
import { AlertBanner } from './components/alerts/AlertBanner';
import { BatteryForm } from './components/battery/BatteryForm';
import { PhaseList } from './components/phases/PhaseList';
import { CorrectionPanel } from './components/corrections/CorrectionPanel';
import { ResultCard } from './components/result/ResultCard';
import { MeasurementPanel } from './components/measurement/MeasurementPanel';
import { useAppStore } from './store/useAppStore';

function App() {
  const recompute = useAppStore((s) => s.recompute);
  const resetToDefaults = useAppStore((s) => s.resetToDefaults);

  React.useEffect(() => {
    const t = setTimeout(() => recompute(), 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full">
      <HeaderBar onReset={resetToDefaults} />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <AlertBanner />
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="space-y-5 xl:col-span-1">
            <BatteryForm />
            <CorrectionPanel />
          </div>

          <div className="space-y-5 xl:col-span-1">
            <PhaseList />
          </div>

          <div className="space-y-5 xl:col-span-1">
            <ResultCard />
            <MeasurementPanel />
          </div>
        </div>

        <FooterBar />
      </main>
    </div>
  );
}

const HeaderBar: React.FC<{ onReset: () => void }> = ({ onReset }) => (
  <motion.header
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    className="sticky top-0 z-40 backdrop-blur-xl bg-bg-primary/70 border-b border-custom/80"
  >
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.55, delay: 0.1, type: 'spring', stiffness: 220, damping: 16 }}
        className="relative flex-shrink-0"
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-accent opacity-25 blur-lg" />
        <div className="relative w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-glow border border-accent-primary/40">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="16" height="10" rx="2" />
            <line x1="22" y1="11" x2="22" y2="13" />
            <line x1="6" y1="11" x2="6" y2="13" />
            <line x1="10" y1="11" x2="10" y2="13" />
            <line x1="14" y1="11" x2="14" y2="13" />
          </svg>
        </div>
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-mono font-bold text-base sm:text-lg tracking-tight text-gradient-accent leading-tight">
            电池组续航估算器
          </h1>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-primary/15 text-accent-primary border border-accent-primary/30 tracking-wide">
            BEE · v1.0
          </span>
        </div>
        <p className="text-[11px] text-text-muted hidden sm:block leading-tight mt-0.5">
          便携式检测仪多阶段负载续航建模 · 温度/效率修正 · 典型与最差场景对比 · 实测回填校准
        </p>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex w-9 h-9 rounded-lg border border-custom bg-black/25 hover:border-accent-primary/40 hover:bg-accent-primary/10 items-center justify-center text-text-muted hover:text-accent-primary transition-colors"
          title="查看源码"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
        <button
          onClick={() => {
            if (confirm('确认恢复默认参数？所有配置和测试记录将被清空。')) onReset();
          }}
          className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
          title="恢复默认"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span className="hidden sm:inline">重置</span>
        </button>
      </div>
    </div>
  </motion.header>
);

const FooterBar: React.FC = () => (
  <footer className="mt-12 pt-6 border-t border-custom/60 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)]" />
        <span>实时计算 · 无服务器依赖</span>
      </span>
      <span className="hidden sm:inline w-px h-3 bg-text-muted/30" />
      <span>数据存储于浏览器 LocalStorage</span>
    </div>
    <div className="text-[11px] text-text-muted flex items-center gap-2 font-mono">
      <span>⚡ 硬件团队工具</span>
      <span className="w-px h-3 bg-text-muted/30" />
      <span>© 2026 BEE</span>
    </div>
  </footer>
);

export default App;
