import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let listeners: ((t: ToastItem) => void)[] = [];

export function showToast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: `${Date.now()}-${Math.random()}`, type, message };
  listeners.forEach(l => l(item));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const fn = (t: ToastItem) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3200);
    };
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  }, []);

  const colorMap = {
    success: 'bg-felt-500 border-felt-600 text-white',
    error:   'bg-danger-500 border-danger-600 text-white',
    info:    'bg-white border-felt-200 text-felt-700',
    warning: 'bg-warn-500 border-warn-600 text-white',
  };
  const iconMap = {
    success: <CheckCircle2 size={18} />,
    error:   <AlertCircle size={18} />,
    info:    <Info size={18} />,
    warning: <AlertCircle size={18} />,
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto toast-enter min-w-[260px] max-w-md rounded-lg border shadow-lg px-4 py-3 flex items-start gap-3 ${colorMap[t.type]}`}
        >
          <div className="mt-0.5">{iconMap[t.type]}</div>
          <div className="flex-1 text-sm leading-relaxed">{t.message}</div>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="opacity-60 hover:opacity-100"
          ><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}
