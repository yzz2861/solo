import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';

export default function Toast() {
  const { toast, clearToast } = useRentalStore();
  if (!toast) return null;

  const colorMap = {
    success: 'bg-forest-700 text-white border-forest-600',
    error: 'bg-rose-700 text-white border-rose-600',
    info: 'bg-bark-700 text-white border-bark-600',
  } as const;

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-card border ${colorMap[toast.type]}`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <div className="text-sm font-medium whitespace-pre-wrap">{toast.message}</div>
        <button
          onClick={clearToast}
          className="ml-2 p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
