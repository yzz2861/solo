import type { Order, WashStep } from '../../../shared/types';
import { WASH_STEP_LABELS } from '../../../shared/types';
import { Clock, User, Car } from 'lucide-react';
import clsx from 'clsx';

interface OrderCardProps {
  order: Order;
  selected: boolean;
  onClick: () => void;
}

const stepColors: Record<WashStep, string> = {
  queued: 'bg-slate-100 text-slate-600 border-slate-200',
  rinsing: 'bg-blue-50 text-blue-700 border-blue-200',
  soaping: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  scrubbing: 'bg-purple-50 text-purple-700 border-purple-200',
  washing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  drying: 'bg-amber-50 text-amber-700 border-amber-200',
  addon: 'bg-orange-50 text-orange-700 border-orange-200',
  done: 'bg-green-50 text-green-700 border-green-200',
};

const statusBadge: Record<string, string> = {
  queued: 'bg-slate-500',
  washing: 'bg-blue-500',
  done: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export function OrderCard({ order, selected, onClick }: OrderCardProps) {
  const unpaidCount = order.addons.filter((a) => !a.paid).length;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
        selected
          ? 'border-brand bg-brand-50 shadow-card-hover -translate-y-0.5'
          : 'border-transparent bg-white shadow-card hover:shadow-card-hover hover:border-slate-200',
        order.status === 'cancelled' && 'opacity-50 line-through'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand text-white font-bold text-sm">
            #{order.queueNumber}
          </span>
          <div>
            <div className="font-bold text-slate-900 text-lg">{order.plateNumber}</div>
            {order.memberName && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                {order.memberName}
              </div>
            )}
          </div>
        </div>
        <span
          className={clsx(
            'w-2.5 h-2.5 rounded-full',
            statusBadge[order.status],
            order.status === 'washing' && 'animate-pulse-soft'
          )}
        />
      </div>

      {order.packageName && (
        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <Car className="w-3 h-3" />
          {order.packageName}
          {order.payType === 'member' && ` · 扣${order.packageDeducted}次`}
          {order.payType === 'cash' && order.cashAmount && ` · ¥${order.cashAmount}`}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border',
            stepColors[order.currentStep]
          )}
        >
          {WASH_STEP_LABELS[order.currentStep]}
        </span>
        <div className="flex items-center gap-2">
          {unpaidCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
              {unpaidCount}项未付
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(order.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      {order.workerName && (
        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          洗车工: <span className="text-slate-700 font-medium">{order.workerName}</span>
        </div>
      )}
    </div>
  );
}
