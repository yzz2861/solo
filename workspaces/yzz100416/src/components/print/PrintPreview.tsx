import { useAppStore } from '@/store/useAppStore';
import { todayStr } from '@/utils/dateUtils';
import { Flower2, Car, Users, UserCircle } from 'lucide-react';
import type { WeddingCarOrder } from '@/types';

const formatDateCN = (date: string) => {
  const [y, m, d] = date.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
};

const weekdayCN = (dateStr: string) => {
  const day = new Date(dateStr).getDay();
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day];
};

export const PrintPreview = ({ standalone = false, customDate }: { standalone?: boolean; customDate?: string }) => {
  const { orders, flowers, florists, selectedDate } = useAppStore();
  const date = customDate || selectedDate || todayStr();
  const todayOrders = orders.filter(o => o.date === date);
  const sorted = [...todayOrders].sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));

  const total = sorted.reduce((s, o) => s + o.costTotal, 0);
  const pending = sorted.filter(o => o.status === 'pending').length;
  const progress = sorted.filter(o => o.status === 'in_progress').length;
  const done = sorted.filter(o => o.status === 'delivered').length;

  const getFlowerText = (o: WeddingCarOrder) =>
    o.flowers
      .map(of => {
        const f = flowers.find(x => x.id === of.flowerId);
        return f ? `${f.name}×${of.quantity}${f.unit}` : '';
      })
      .filter(Boolean)
      .join('、');

  const getFlorist = (id: string | null) => florists.find(f => f.id === id)?.name || '未分配';

  return (
    <div className={`${standalone ? 'min-h-screen bg-white' : ''} print-area`}>
      <div className="max-w-[210mm] mx-auto p-8 md:p-12 print:p-0">
        {/* 标题 */}
        <div className="text-center mb-8 pb-6 border-b-2 border-double border-coffee-300">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flower2 className="w-6 h-6 text-rose-500" />
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-coffee-800 tracking-wider">
              花嫁 · 早班扎花准备单
            </h1>
            <Flower2 className="w-6 h-6 text-rose-500 transform -scale-x-100" />
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-coffee-600 font-medium">
            <span>📅 {formatDateCN(date)}</span>
            <span className="text-coffee-300">|</span>
            <span>📆 {weekdayCN(date)}</span>
            <span className="text-coffee-300">|</span>
            <span>📋 共 {sorted.length} 单</span>
          </div>
        </div>

        {/* 统计汇总 */}
        <div className="grid grid-cols-4 gap-4 mb-8 print:mb-6">
          {[
            { label: '订单总数', value: sorted.length, color: 'text-coffee-700', border: 'border-coffee-200' },
            { label: '待准备', value: pending, color: 'text-amber-600', border: 'border-amber-200' },
            { label: '制作中', value: progress, color: 'text-rose-600', border: 'border-rose-200' },
            { label: '已完成', value: done, color: 'text-sage-600', border: 'border-sage-200' },
          ].map(s => (
            <div key={s.label} className={`p-3 rounded-xl border ${s.border} bg-white text-center`}>
              <div className={`text-2xl font-bold font-serif ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-coffee-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 花材总需求 */}
        <div className="mb-8 p-4 rounded-xl bg-cream-50 border border-cream-200">
          <h3 className="text-sm font-bold text-coffee-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-cream-200">
            <Flower2 className="w-4 h-4 text-rose-500" />
            今日花材总需求清单
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
            {(() => {
              const m = new Map<string, { name: string; qty: number; unit: string; cat: string }>();
              sorted.forEach(o => o.flowers.forEach(of => {
                const f = flowers.find(x => x.id === of.flowerId);
                if (!f) return;
                const cur = m.get(f.id) || { name: f.name, qty: 0, unit: f.unit, cat: f.category };
                cur.qty += of.quantity;
                m.set(f.id, cur);
              }));
              return Array.from(m.values())
                .sort((a, b) => a.cat.localeCompare(b.cat))
                .map(v => (
                  <div key={v.name} className="text-xs bg-white rounded-lg p-2 border border-cream-200">
                    <span className="text-coffee-400 text-[10px] mr-1">[{v.cat}]</span>
                    <span className="font-semibold text-coffee-700">{v.name}</span>
                    <span className="float-right font-bold text-gold-600">{v.qty}{v.unit}</span>
                  </div>
                ));
            })()}
          </div>
          {sorted.length === 0 && (
            <p className="text-center text-sm text-coffee-400 py-4">今日暂无订单</p>
          )}
        </div>

        {/* 订单明细表格 */}
        <div className="rounded-xl border border-coffee-200 overflow-hidden">
          <div className="bg-coffee-700 text-white px-4 py-2.5 flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="font-serif font-semibold">婚车扎花明细 · 按到店时间排序</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-100 text-coffee-600 text-xs">
                <th className="px-3 py-2 text-left w-10">序号</th>
                <th className="px-3 py-2 text-left w-16">到店</th>
                <th className="px-3 py-2 text-left">新人</th>
                <th className="px-3 py-2 text-left">车型</th>
                <th className="px-3 py-2 text-left w-24">车牌</th>
                <th className="px-3 py-2 text-left">花材</th>
                <th className="px-3 py-2 text-left w-16">扎花师</th>
                <th className="px-3 py-2 text-left w-16">状态</th>
                <th className="px-3 py-2 text-left w-20">备注</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-coffee-400">— 暂无订单 —</td>
                </tr>
              ) : (
                sorted.map((o, i) => (
                  <tr key={o.id} className="border-t border-cream-200 align-top hover:bg-cream-50/50">
                    <td className="px-3 py-2.5 font-bold text-coffee-500 font-serif">{i + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-coffee-700">{o.arrivalTime}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <UserCircle className="w-3 h-3 text-rose-400" />
                        <span className="text-coffee-700">{o.coupleName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-coffee-600">{o.carModel}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-coffee-800 tracking-wide">{o.plateNumber}</td>
                    <td className="px-3 py-2.5 text-[11px] text-coffee-600 leading-relaxed max-w-xs">{getFlowerText(o)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3 text-sage-500" />
                        <span className={getFlorist(o.floristId) === '未分配' ? 'text-danger-600' : 'text-coffee-700'}>
                          {getFlorist(o.floristId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {o.status === 'pending' && <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700">待准备</span>}
                      {o.status === 'in_progress' && <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700">制作中</span>}
                      {o.status === 'delivered' && <span className="inline-block px-2 py-0.5 rounded bg-sage-100 text-sage-700">已交车</span>}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-coffee-500 max-w-xs whitespace-pre-wrap">
                      {o.handoverNote || '—'}
                      {o.anomalies.length > 0 && (
                        <div className="mt-1 text-danger-600">⚠ {o.anomalies.join('、')}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 页脚 */}
        <div className="mt-10 pt-6 border-t border-cream-200 flex items-center justify-between text-xs text-coffee-400">
          <div className="flex items-center gap-6">
            <span>📊 总成本预估：<span className="font-bold text-gold-600">¥{total}</span></span>
            <span>打印时间：{new Date().toLocaleString('zh-CN')}</span>
          </div>
          <div className="flex items-center gap-10">
            <span>店长签字：___________</span>
            <span>扎花师签字：___________</span>
          </div>
        </div>
      </div>
    </div>
  );
};
