import {
  X,
  AlertCircle,
  AlertTriangle,
  Car,
  Flower2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { alertTypeLabel, alertTypeColor } from '@/utils/validators';
import clsx from 'clsx';

const iconMap: Record<string, typeof AlertCircle> = {
  low_stock: Flower2,
  time_conflict: Calendar,
  driver_early: Car,
  plate_duplicate: AlertTriangle,
};

export const AlertCenter = () => {
  const { alertCenterOpen, setAlertCenterOpen, alerts, resolveAlert, orders, updateOrder } = useAppStore();
  const unresolved = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved);

  const handleJump = (orderId?: string) => {
    if (!orderId) return;
    const card = document.querySelector<HTMLElement>(`[data-order-id="${orderId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-4', 'ring-rose-300');
      setTimeout(() => card.classList.remove('ring-4', 'ring-rose-300'), 2500);
    }
  };

  return (
    <>
      {/* 遮罩 */}
      {alertCenterOpen && (
        <div
          className="fixed inset-0 z-40 bg-coffee-700/20 backdrop-blur-sm no-print"
          onClick={() => setAlertCenterOpen(false)}
        />
      )}
      {/* 抽屉 */}
      <div
        className={clsx(
          'fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white shadow-2xl no-print transition-transform duration-300 flex flex-col',
          alertCenterOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-gradient-to-r from-danger-500/5 via-amber-500/5 to-rose-200/30">
          <div>
            <h3 className="font-serif font-semibold text-coffee-700 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              预警中心
            </h3>
            <p className="text-[11px] text-coffee-500 mt-0.5">
              {unresolved.length} 个待处理 · {resolved.length} 个已处理
            </p>
          </div>
          <button
            onClick={() => setAlertCenterOpen(false)}
            className="btn btn-ghost !p-2 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
          {/* 未处理 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-danger-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-danger-500 animate-pulse-warning" />
                待处理 ({unresolved.length})
              </h4>
            </div>
            {unresolved.length === 0 ? (
              <div className="text-center py-10 text-coffee-400 text-sm">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-sage-500/70" />
                暂无预警，一切正常 ✨
              </div>
            ) : (
              <div className="space-y-2.5">
                {unresolved.map(a => {
                  const Icon = iconMap[a.type] || AlertCircle;
                  return (
                    <div
                      key={a.id}
                      className="group p-3.5 rounded-2xl border bg-white transition-all animate-fade-in-up hover:shadow-card"
                      onClick={() => handleJump(a.orderId)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          a.type === 'driver_early' || a.type === 'plate_duplicate'
                            ? 'bg-danger-500/15 text-danger-500'
                            : 'bg-amber-500/15 text-amber-600'
                        )}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={clsx('tag', alertTypeColor[a.type])}>
                              {alertTypeLabel[a.type]}
                            </span>
                            {a.orderId && (
                              <span className="text-[10px] text-coffee-400 cursor-pointer hover:text-rose-500">
                                点击定位 →
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-coffee-700 leading-relaxed">{a.message}</div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); resolveAlert(a.id); }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 btn btn-success !py-1 !px-2 !text-[10px] transition-opacity"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          处理
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 已处理 */}
          {resolved.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-coffee-500 flex items-center gap-1.5 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-coffee-300" />
                已处理 ({resolved.length})
              </h4>
              <div className="space-y-2 opacity-70">
                {resolved.slice(0, 20).map(a => {
                  const Icon = iconMap[a.type] || AlertCircle;
                  return (
                    <div key={a.id} className="p-3 rounded-xl bg-cream-50 flex items-start gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-coffee-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-coffee-500 flex-1">
                        <span className="tag tag-done !py-0 mr-1.5">{alertTypeLabel[a.type]}</span>
                        {a.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
