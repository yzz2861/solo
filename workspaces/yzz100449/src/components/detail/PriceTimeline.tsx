import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  UserCircle2,
  FileText,
  BadgeDollarSign,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { RecycleOrder } from '../../types';
import PriceTag from '../common/PriceTag';

interface Props {
  order: RecycleOrder;
}

export default function PriceTimeline({ order }: Props) {
  const priceHistory = [...order.priceHistory].sort((a, b) => b.timestamp - a.timestamp);
  const firstPrice = order.initialPrice;
  const lastPrice = order.finalPrice ?? order.initialPrice;
  const totalChange = lastPrice - firstPrice;
  const changeCount = priceHistory.length;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft">
            <BadgeDollarSign size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">价格变动时间线</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              共 <span className="font-bold text-brand-700">{changeCount}</span> 次调价记录
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500 mb-1">累计变动</div>
          {totalChange !== 0 ? (
            <div className="flex items-center gap-1 justify-end">
              {totalChange > 0 ? (
                <TrendingUp size={16} className="text-emerald-600" />
              ) : (
                <TrendingDown size={16} className="text-danger-600" />
              )}
              <span
                className={`font-mono font-bold tabular-nums ${
                  totalChange > 0 ? 'text-emerald-600' : 'text-danger-600'
                }`}
              >
                {totalChange > 0 ? '+' : ''}
                {totalChange.toLocaleString('zh-CN')}
              </span>
            </div>
          ) : (
            <span className="font-mono font-bold text-slate-400 tabular-nums">¥0</span>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-200 via-brand-100 to-slate-200 rounded-full" />

        <div className="space-y-0">
          <div className="relative flex gap-4 pb-5">
            <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 z-10 shadow-soft">
              <FileText size={16} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">初始估价</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock size={11} />
                  {dayjs(order.createdAt).format('MM-DD HH:mm')}
                </span>
              </div>
              <div className="mt-1.5">
                <PriceTag value={firstPrice} size="lg" />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <UserCircle2 size={12} />
                {order.createdBy}
                <span className="chip bg-slate-100 text-slate-600 text-[10px] py-0.5 ml-1">
                  {order.createdByRole === 'manager' ? '店长' : '员工'}
                </span>
              </div>
            </div>
          </div>

          {priceHistory.map((change, idx) => {
            const diff = change.newPrice - change.oldPrice;
            const isUp = diff > 0;
            const isLast = idx === priceHistory.length - 1;
            return (
              <div key={change.id} className={`relative flex gap-4 ${isLast ? 'pb-0' : 'pb-5'}`}>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-soft ${
                    isUp
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                      : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                  }`}
                >
                  {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      第 {idx + 1} 次调价
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock size={11} />
                      {dayjs(change.timestamp).format('MM-DD HH:mm')}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <PriceTag value={change.oldPrice} size="sm" tone="default" />
                    <ArrowRight
                      size={16}
                      className={isUp ? 'text-emerald-500' : 'text-rose-500'}
                    />
                    <PriceTag
                      value={change.newPrice}
                      size="sm"
                      tone={isUp ? 'up' : 'down'}
                    />
                    <span
                      className={`chip font-mono font-bold text-[11px] tabular-nums ${
                        isUp
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {diff.toLocaleString('zh-CN')}
                    </span>
                  </div>

                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 text-xs text-slate-600 flex items-start gap-2">
                    <FileText size={13} className="text-brand-600 mt-0.5 shrink-0" />
                    <span className="flex-1">{change.reason}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <UserCircle2 size={12} />
                    {change.operator}
                    <span
                      className={`chip text-[10px] py-0.5 ml-1 ${
                        change.operatorRole === 'manager'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {change.operatorRole === 'manager' ? '店长' : '员工'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {changeCount > 0 && (
            <div className="relative flex gap-4 pt-5 border-t-2 border-dashed border-slate-200 mt-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shrink-0 z-10 shadow-soft">
                <BadgeDollarSign size={16} />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">最终成交价</span>
                </div>
                <div className="mt-1.5">
                  <PriceTag
                    value={lastPrice}
                    size="lg"
                    tone={
                      totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'default'
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {changeCount === 0 && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 text-center">
          <BadgeDollarSign size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">暂无调价记录</p>
          <p className="text-[11px] text-slate-400 mt-0.5">该订单价格未发生变动</p>
        </div>
      )}
    </div>
  );
}
