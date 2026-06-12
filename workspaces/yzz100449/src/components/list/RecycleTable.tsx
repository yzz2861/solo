import { useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Edit3, Package, ArrowUpRight, AlertTriangle,
  ChevronLeft, ChevronRight, Copy, Check
} from 'lucide-react';
import type { RecycleOrder } from '/Users/bill/Documents/solo/workspaces/yzz100449/src/types';
import StatusBadge from '/Users/bill/Documents/solo/workspaces/yzz100449/src/components/common/StatusBadge';
import PriceTag from '/Users/bill/Documents/solo/workspaces/yzz100449/src/components/common/PriceTag';

interface Props {
  orders: RecycleOrder[];
  onViewDetail: (order: RecycleOrder) => void;
}

const PAGE_SIZE = 8;

export default function RecycleTable({ orders, onViewDetail }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageOrders = orders.slice(startIdx, startIdx + PAGE_SIZE);

  const copySN = (sn: string, id: string) => {
    navigator.clipboard?.writeText(sn);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getRatingCls = (rating: string) => {
    const map: Record<string, string> = {
      'A+': 'bg-emerald-500 text-white',
      'A': 'bg-emerald-400 text-white',
      'B': 'bg-sky-400 text-white',
      'C': 'bg-amber-400 text-white',
      'D': 'bg-rose-400 text-white',
    };
    return map[rating] ?? 'bg-slate-400 text-white';
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[90px]">
                缩略图
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                机型信息
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                序列号 / IMEI
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[130px]">
                初始价 / 成交价
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[110px]">
                状态
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[100px]">
                创建时间
              </th>
              <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[180px]">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {pageOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Package size={28} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">暂无回收记录</p>
                      <p className="text-xs text-slate-400 mt-1">调整筛选条件或前往登记台创建新单</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              pageOrders.map((order) => {
                const isHovered = selectedId === order.id;
                return (
                  <tr
                    key={order.id}
                    onMouseEnter={() => setSelectedId(order.id)}
                    onMouseLeave={() => setSelectedId(null)}
                    className={`border-b border-slate-50 transition-colors ${
                      isHovered ? 'bg-brand-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="relative w-[60px] h-[80px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                        <img
                          src={order.photos[0]}
                          alt={order.model}
                          className="w-full h-full object-cover"
                        />
                        {order.duplicateSnWarning && (
                          <div className="absolute top-1 left-1 w-5 h-5 rounded-md bg-warn-500 flex items-center justify-center shadow">
                            <AlertTriangle size={12} className="text-white" />
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-brand-600/60 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                          <button
                            onClick={() => onViewDetail(order)}
                            className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center text-brand-600 hover:bg-white"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{order.brand}</span>
                            <span className="text-slate-700 font-medium text-sm">{order.model}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`chip !py-0.5 !px-1.5 text-[10px] font-bold ${getRatingCls(order.appearanceRating)}`}>
                              {order.appearanceRating}
                            </span>
                            <span className="text-xs text-slate-500">{order.storage}</span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{order.color}</span>
                          </div>
                          {!order.privacyWiped && order.status === 'pending_in' && (
                            <div className="mt-1.5">
                              <span className="chip !bg-warn-50 !text-warn-600 !text-[10px] !py-0.5">
                                待隐私清除
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                            {order.serialNumber}
                          </span>
                          <button
                            onClick={() => copySN(order.serialNumber, order.id)}
                            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors"
                            title="复制序列号"
                          >
                            {copiedId === order.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        {order.imei && (
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            IMEI: {order.imei}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">初</span>
                          <span className="font-mono text-xs text-slate-500 line-through tabular-nums">
                            ¥{order.initialPrice.toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {order.finalPrice !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-brand-600 font-bold">成</span>
                            <PriceTag value={order.finalPrice} size="sm" tone={
                              order.finalPrice > order.initialPrice ? 'up' :
                              order.finalPrice < order.initialPrice ? 'down' : 'default'
                            } />
                            {order.finalPrice !== order.initialPrice && (
                              <ArrowUpRight size={12} className={order.finalPrice > order.initialPrice ? 'text-emerald-500 rotate-0' : 'text-rose-500 rotate-90'} />
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">—</div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={order.status} size="md" />
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-xs">
                        <div className="font-mono text-slate-700 tabular-nums">
                          {dayjs(order.createdAt).format('MM-DD')}
                        </div>
                        <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                          {dayjs(order.createdAt).format('HH:mm')}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetail(order)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={13} />
                          详情
                        </button>
                        <button
                          onClick={() => navigate(`/register/${order.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 size={13} />
                          编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {orders.length > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500">
            显示第 <span className="font-bold text-slate-700">{startIdx + 1}</span> -{' '}
            <span className="font-bold text-slate-700">{Math.min(startIdx + PAGE_SIZE, orders.length)}</span> 条，
            共 <span className="font-bold text-brand-600">{orders.length}</span> 条
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  p === safePage
                    ? 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-soft'
                    : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
