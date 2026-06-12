import { useState } from 'react';
import type { RecycleOrder } from '../../types';
import { QUICK_REASONS } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useRecycleStore } from '../../store/useRecycleStore';
import { TrendingDown, TrendingUp, Minus, CircleDollarSign, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';

interface Props {
  order: RecycleOrder;
  onPatch: (p: Partial<RecycleOrder>) => void;
}

export default function PriceBargain({ order, onPatch }: Props) {
  const user = useAuthStore((s) => s.currentUser)!;
  const addPriceChange = useRecycleStore((s) => s.addPriceChange);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [reason, setReason] = useState('');

  const history = [
    {
      id: 'initial', type: 'init',
      oldPrice: 0, newPrice: order.initialPrice, reason: '系统初估价',
      operator: order.createdBy, timestamp: order.createdAt,
    },
    ...order.priceHistory.map((p) => ({ ...p, type: 'bargain' as const })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const currentPrice = order.finalPrice ?? order.initialPrice;

  const addBargain = () => {
    if (!newPrice || newPrice <= 0) return alert('请输入有效价格');
    if (!reason.trim()) return alert('请填写议价原因');
    addPriceChange(order.id, {
      oldPrice: currentPrice,
      newPrice,
      reason: reason.trim(),
      operator: user.name,
      operatorRole: user.role,
    });
    setNewPrice(0);
    setReason('');
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-black">4</span>
          初估价 & 议价记录
        </h3>
        <div className="chip bg-warn-50 text-warn-600">
          <CircleDollarSign size={12} /> 共议价 {order.priceHistory.length} 次
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
          <label className="text-xs font-medium text-slate-500">初估价（可改）</label>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl text-slate-400 font-mono font-bold">¥</span>
            <input type="number" value={order.initialPrice}
              onChange={(e) => {
                const v = Number(e.target.value);
                onPatch({ initialPrice: v });
                if (!order.finalPrice && order.priceHistory.length === 0) onPatch({ finalPrice: v });
              }}
              className="w-full bg-transparent outline-none text-3xl font-mono font-black text-slate-800 tabular-nums" />
          </div>
        </div>
        <div className={`p-4 rounded-2xl border-2 ${
          currentPrice < order.initialPrice
            ? 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200'
            : currentPrice > order.initialPrice
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">当前成交价</label>
            {currentPrice !== order.initialPrice && (
              <span className={`chip ${
                currentPrice < order.initialPrice ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {currentPrice < order.initialPrice ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                {Math.abs(currentPrice - order.initialPrice) > 0 ? '¥' + Math.abs(currentPrice - order.initialPrice) : '—'}
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className={`text-3xl font-mono font-black tabular-nums ${
              currentPrice < order.initialPrice ? 'text-danger-600' :
              currentPrice > order.initialPrice ? 'text-emerald-600' : 'text-slate-800'
            }`}>¥{currentPrice.toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 新增议价 */}
      <div className="p-4 rounded-2xl bg-warn-50/40 border-2 border-dashed border-warn-300 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-warn-700">
          <Sparkles size={16} /> 新增一次议价记录
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-600 font-medium mb-1 block">新报价（元）</label>
            <input type="number" value={newPrice || ''} placeholder="输入顾客接受的新价"
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="input font-mono text-lg" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600 font-medium mb-1 block">议价原因</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="例：屏幕划痕明显，顾客坚持报价" className="input" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1"><Minus size={12}/> 快捷原因：</span>
          {QUICK_REASONS.map((q) => (
            <button key={q} type="button" onClick={() => setReason(q)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                reason === q
                  ? 'bg-warn-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-warn-400 hover:text-warn-600'
              }`}>
              {q}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={addBargain} className="btn-warn">
            <TrendingDown size={16} /> 记录本次议价
          </button>
        </div>
      </div>

      {/* 时间线 */}
      <div>
        <div className="text-xs font-bold text-slate-500 mb-3">价格变动时间线</div>
        <div className="relative pl-6 space-y-4">
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-brand-400 via-warn-400 to-slate-200" />
          {history.map((h, idx) => {
            const last = idx === history.length - 1;
            const Icon = h.type === 'init' ? CircleDollarSign : (h.newPrice > h.oldPrice ? TrendingUp : TrendingDown);
            const tone = h.type === 'init' ? 'bg-brand-500 ring-brand-100'
              : (h.newPrice > h.oldPrice ? 'bg-emerald-500 ring-emerald-100' : 'bg-warn-500 ring-warn-100');
            return (
              <div key={h.id + idx} className={`relative ${last ? 'animate-pulse-slow' : ''}`}>
                <div className={`absolute -left-[22px] top-1 w-5 h-5 rounded-full ${tone} ring-4 text-white flex items-center justify-center`}>
                  <Icon size={10} />
                </div>
                <div className={`p-3 rounded-xl border ${last ? 'bg-white shadow-soft border-brand-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg tabular-nums">¥{h.newPrice.toLocaleString('zh-CN')}</span>
                      {h.oldPrice > 0 && (
                        <span className="text-xs font-mono text-slate-400 line-through">¥{h.oldPrice.toLocaleString()}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {dayjs(h.timestamp).format('HH:mm')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                    <span className="chip bg-white text-slate-600 border border-slate-200">{h.operator}</span>
                    <span className="italic">{h.reason}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
