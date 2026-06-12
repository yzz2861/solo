import { Clock, Scissors, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { minutesUntilArrival, formatCountdown } from '@/utils/dateUtils';
import type { WeddingCarOrder } from '@/types';
import clsx from 'clsx';

interface PrepItemProps {
  order: WeddingCarOrder;
  idx: number;
  onAction: (id: string, next: 'in_progress' | 'delivered') => void;
}

const PrepItem = ({ order, idx, onAction }: PrepItemProps) => {
  const { flowers, florists } = useAppStore();
  const countdown = minutesUntilArrival(order.arrivalTime, order.date);
  const urgency = countdown >= 0 && countdown <= 30;
  const critical = countdown >= 0 && countdown <= 15;

  const flowerList = order.flowers
    .filter(of => {
      const f = flowers.find(x => x.id === of.flowerId);
      return f && (f.category === '主花' || f.category === '辅花');
    })
    .map(of => {
      const f = flowers.find(x => x.id === of.flowerId)!;
      return `${f.name}×${of.quantity}${f.unit}`;
    })
    .join(' ');

  const florist = florists.find(f => f.id === order.floristId);

  return (
    <div
      className={clsx(
        'relative pl-6 pb-4 animate-fade-in-up',
        `stagger-${(idx % 6) + 1}`
      )}
    >
      <div className="absolute left-2 top-2 bottom-0 w-px bg-gradient-to-b from-rose-200 via-gold-400/50 to-transparent" />
      <div className={clsx(
        'absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
        critical
          ? 'bg-danger-500 text-white border-danger-400 animate-pulse-warning'
          : urgency
          ? 'bg-amber-500 text-white border-amber-400'
          : order.status === 'delivered'
          ? 'bg-sage-500 text-white border-sage-400'
          : order.status === 'in_progress'
          ? 'bg-rose-300 text-white border-rose-200'
          : 'bg-white text-coffee-600 border-cream-200'
      )}>
        {order.status === 'delivered' ? '✓' : idx + 1}
      </div>

      <div className={clsx(
        'card p-3 transition-all',
        critical && order.status !== 'delivered' ? 'ring-2 ring-danger-500/30 shadow-hover' : ''
      )}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className={clsx('w-3.5 h-3.5 shrink-0', critical ? 'text-danger-500' : 'text-gold-500')} />
            <span className={clsx(
              'text-sm font-bold',
              critical ? 'text-danger-600' : 'text-coffee-700'
            )}>
              {order.arrivalTime}
            </span>
            {countdown >= 0 && order.status !== 'delivered' && (
              <span className={clsx(
                'text-[10px] px-1.5 py-0.5 rounded-md font-medium',
                critical ? 'bg-danger-500/10 text-danger-600 animate-blink' : 'bg-cream-200 text-coffee-500'
              )}>
                {formatCountdown(countdown)}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-coffee-700 tracking-wider font-serif shrink-0">
            {order.plateNumber}
          </span>
        </div>

        <div className="text-xs text-coffee-600 mb-1 truncate">
          {order.carModel} · {order.coupleName}
        </div>

        <div className="text-[11px] text-coffee-500 mb-2 line-clamp-2" title={flowerList}>
          🌸 {flowerList || '—'}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-cream-200/50">
          <div className="text-[11px] text-coffee-400 truncate">
            {florist ? `👤 ${florist.name}` : '⚠ 未分配'}
          </div>
          {order.status === 'pending' && (
            <button
              onClick={() => onAction(order.id, 'in_progress')}
              className="btn btn-primary !py-1 !px-2.5 !text-[11px]"
            >
              <Scissors className="w-3 h-3" />
              开始
            </button>
          )}
          {order.status === 'in_progress' && (
            <button
              onClick={() => onAction(order.id, 'delivered')}
              className="btn btn-success !py-1 !px-2.5 !text-[11px]"
            >
              <CheckCircle2 className="w-3 h-3" />
              完成
            </button>
          )}
          {order.status === 'delivered' && (
            <span className="text-[11px] text-sage-600 font-medium">已交车 ✓</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const FloristPrepList = () => {
  const { orders, selectedDate, updateOrderStatus, currentRole } = useAppStore();
  const todayOrders = orders.filter(o => o.date === selectedDate && o.status !== 'delivered');
  const doneOrders = orders.filter(o => o.date === selectedDate && o.status === 'delivered');
  const sorted = [...todayOrders].sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));

  const handleAction = (id: string, next: 'in_progress' | 'delivered') => {
    updateOrderStatus(id, next);
  };

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-cream-200 bg-gradient-to-r from-rose-100/60 to-cream-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-coffee-700 text-base">
              扎花师准备列表
            </h3>
            <p className="text-[11px] text-coffee-500 mt-0.5">按到店时间排序</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="tag tag-progress">制作中 {todayOrders.filter(o => o.status === 'in_progress').length}</span>
            <span className="tag tag-done">已完成 {doneOrders.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 pr-2 space-y-1">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-coffee-400 text-sm">
            <Scissors className="w-8 h-8 mx-auto mb-3 opacity-30" />
            今日已无待制作订单 🎉
          </div>
        ) : (
          sorted.map((o, i) => (
            <PrepItem key={o.id} order={o} idx={i} onAction={handleAction} />
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-cream-200 bg-cream-50/60 text-[11px] text-coffee-400">
        {currentRole === 'florist' ? '👋 扎花师视图模式' : '📋 点击「开始」快速切换状态'}
      </div>
    </div>
  );
};
