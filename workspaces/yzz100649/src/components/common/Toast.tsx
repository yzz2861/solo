import { clsx } from 'clsx';
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'info' | 'warn' | 'error';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}
interface Ctx {
  push: (type: ToastType, message: string) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  info: <Info className="w-4 h-4 text-sky-500" />,
  warn: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  error: <XCircle className="w-4 h-4 text-rose-500" />,
};

const RING: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-40px)] pointer-events-none">
        {items.map((it) => (
          <div
            key={it.id}
            className={clsx(
              'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md backdrop-blur-sm animate-[slideIn_.25s_ease]',
              RING[it.type]
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[it.type]}</span>
            <p className="text-sm leading-5">{it.message}</p>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


