import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { AlertLevel } from '../../types';

const levelConfig: Record<AlertLevel, { bg: string; border: string; text: string; iconBg: string; icon: string }> = {
  error: {
    bg: 'bg-red-500/12',
    border: 'border-red-500/40',
    text: 'text-red-300',
    iconBg: 'bg-red-500/25',
    icon: '❌',
  },
  warning: {
    bg: 'bg-amber-500/12',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/25',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-sky-500/12',
    border: 'border-sky-500/40',
    text: 'text-sky-300',
    iconBg: 'bg-sky-500/25',
    icon: '💡',
  },
};

export const AlertBanner: React.FC = () => {
  const alerts = useAppStore((s) => s.alerts);
  const dismissAlert = useAppStore((s) => s.dismissAlert);

  const handleAnchorClick = (anchor: string) => {
    const el = document.querySelector(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-accent-primary/50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-accent-primary/50'), 1800);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <AnimatePresence initial={false}>
        {alerts.map((alert, idx) => {
          const cfg = levelConfig[alert.level];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -12, x: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                x: [0, -3, 3, -2, 2, 0],
                transition: {
                  opacity: { duration: 0.3, delay: idx * 0.05 },
                  y: { duration: 0.35, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] },
                  x: alert.level === 'error' ? { duration: 0.4, delay: idx * 0.05 + 0.2 } : { duration: 0 },
                },
              }}
              exit={{ opacity: 0, x: 20, height: 0, marginTop: 0, marginBottom: 0 }}
              transition={{ duration: 0.28, ease: [0.55, 0, 1, 0.45] }}
              className={`relative flex items-start gap-3 px-4 py-3 rounded-lg backdrop-blur-sm border ${cfg.bg} ${cfg.border}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-md ${cfg.iconBg} flex items-center justify-center text-sm shadow-inner`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-[13px] leading-relaxed ${cfg.text}`}>
                  {alert.message}
                </p>
                {alert.anchor && (
                  <button
                    onClick={() => handleAnchorClick(alert.anchor)}
                    className="mt-1 text-[11px] font-medium text-accent-primary hover:text-accent-primary/80 underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    跳转定位 →
                  </button>
                )}
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${cfg.text} hover:bg-white/8 transition-colors text-xs`}
                title="关闭"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: alert.level === 'error' ? 'var(--danger)' : alert.level === 'warning' ? 'var(--warning)' : 'var(--info)' }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
