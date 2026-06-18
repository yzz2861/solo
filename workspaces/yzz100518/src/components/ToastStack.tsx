import { useAppStore } from '@/stores/app';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON = {
  success: CheckCircle2,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
};

const COLORS = {
  success: 'border-moss-200 bg-moss-50 text-moss-600',
  info: 'border-ink-200 bg-white text-ink-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-600',
  error: 'border-clay-200 bg-clay-50 text-clay-500',
};

export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[320px] flex-col gap-3">
      {toasts.map((t) => {
        const Icon = ICON[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto animate-slide-in card-shadow relative flex items-start gap-3 rounded-xl border p-4 pr-10 transition-all',
              COLORS[t.type],
            )}
          >
            <Icon className="mt-0.5 shrink-0" size={20} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-tight">{t.title}</div>
              {t.message && <div className="mt-1 text-sm opacity-80">{t.message}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="absolute right-2 top-2 rounded-md p-1 opacity-50 transition hover:bg-black/5 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
