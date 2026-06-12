import { useMemo, useState } from 'react';
import {
  FileBarChart, Download, Printer, AlertTriangle, CheckCircle2, TrendingUp,
  Coffee, Percent, DollarSign, CalendarDays, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { formatMoney, formatDateTime, buildDailyReportCSV, downloadCSV } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import { isSameDay } from '@/lib/utils';

export default function DailyReport() {
  const sessions = useBilliardStore(s => s.sessions);
  const tables = useBilliardStore(s => s.tables);
  const checkouts = useBilliardStore(s => s.checkouts);
  const revocations = useBilliardStore(s => s.revocations);
  const settings = useBilliardStore(s => s.settings);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const nowIso = new Date().toISOString();

  const todayCheckouts = useMemo(() => checkouts.filter(c => isSameDay(c.checkout_time, date + 'T00:00:00')), [checkouts, date]);
  const todayRevoked = useMemo(() => revocations.filter(r => isSameDay(r.revocation_time, date + 'T00:00:00')), [revocations, date]);
  const unreleased = useMemo(() => sessions.filter(s => !checkouts.some(c => c.session_id === s.id)), [sessions, checkouts]);

  const metrics = useMemo(() => {
    let tableFee = 0, product = 0, subtotal = 0, discount = 0, received = 0, net = 0;
    todayCheckouts.forEach(c => {
      tableFee += c.table_fee;
      product += c.product_total;
      subtotal += c.subtotal;
      discount += c.discount_amount;
      received += c.received;
    });
    net = received;
    const revokedTotal = todayRevoked.reduce((s, r) => s + r.original_amount, 0);
    return { tableFee, product, subtotal, discount, received, net, orderCount: todayCheckouts.length, revokedTotal, revokedCount: todayRevoked.length };
  }, [todayCheckouts, todayRevoked]);

  const byMethod = useMemo(() => {
    const m: Record<string, number> = {};
    todayCheckouts.forEach(c => { m[c.payment_method] = (m[c.payment_method] || 0) + c.final_total; });
    return m;
  }, [todayCheckouts]);

  const doExport = () => {
    const enriched = todayCheckouts.map(c => {
      const session = sessions.find(s2 => s2.id === c.session_id);
      const tbl = tables.find(t => t.id === session?.table_id);
      return { ...c, table_no: tbl?.table_no, table_name: tbl?.name };
    });
    const csv = buildDailyReportCSV(enriched, metrics.revokedCount, metrics.revokedTotal);
    const fn = `日结报表_${date}_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}.csv`;
    downloadCSV(fn, csv);
    showToast(`已导出 ${enriched.length} 条订单到 CSV`, 'success');
  };

  const today = new Date().toISOString().slice(0, 10);
  const notToday = date !== today;
  const canPrint = todayCheckouts.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-felt-700 flex items-center gap-2">
            <FileBarChart className="text-gold-600" size={24} /> 日结报表
          </h1>
          <p className="text-xs text-felt-500 mt-0.5">查看每日营收汇总，导出给老板复盘（桌费/饮料/折扣/撤销）</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-cream-200 px-3 py-2">
            <CalendarDays size={16} className="text-felt-400" />
            <input type="date" className="bg-transparent outline-none text-sm text-felt-700 font-medium"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <button className="btn-secondary" disabled={!canPrint} onClick={() => {
            const fn = `日结_${date}.html`;
            showToast('建议使用 CSV 导出后打印', 'info');
            window.print();
          }}>
            <Printer size={14} /> 打印
          </button>
          <button className="btn-primary" onClick={doExport} disabled={todayCheckouts.length === 0}>
            <Download size={14} /> 导出 CSV
          </button>
        </div>
      </div>

      {unreleased.length > 0 && !notToday && (
        <div className="rounded-2xl bg-warn-500/5 border border-warn-500/30 p-4 mb-5 flex items-start gap-3 animate-slideDown">
          <AlertTriangle size={20} className="text-warn-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-warn-600">还有 {unreleased.length} 个未结订单</div>
            <div className="text-xs text-warn-500 mt-0.5">
              日结前请确认所有订单已结账。未结订单列表：
              {unreleased.map(u => {
                const t = tables.find(tbl => tbl.id === u.table_id);
                return <span key={u.id} className="inline-flex ml-2 chip border-warn-500/30 bg-warn-500/10 text-warn-600 text-[11px] mt-1">{t?.table_no}号桌</span>;
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard label="桌台费" value={metrics.tableFee} icon={<TrendingUp size={18} />} color="felt"
          hint={`${metrics.orderCount} 单 · 均价 ${formatMoney(metrics.orderCount ? metrics.tableFee / metrics.orderCount : 0)}`} />
        <MetricCard label="饮料小吃" value={metrics.product} icon={<Coffee size={18} />} color="gold"
          hint={`${metrics.orderCount} 单涉及商品`} />
        <MetricCard label="优惠抵扣" value={-metrics.discount} icon={<Percent size={18} />} color="danger"
          hint={`共优惠 ${formatMoney(metrics.discount)}`} arrow="down" />
        <MetricCard label="净收入" value={metrics.net} icon={<DollarSign size={18} />} color="green"
          hint={`实收合计 ${formatMoney(metrics.received)}`} primary />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-3 bg-cream-50/60 border-b border-cream-200 flex items-center justify-between">
            <h3 className="font-serif font-bold text-felt-700">当日订单明细（{todayCheckouts.length}）</h3>
            <span className="badge bg-felt-500/10 text-felt-600">共 {todayCheckouts.length} 单</span>
          </div>
          <div className="overflow-auto scrollbar-thin max-h-[55vh]">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-white sticky top-0 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200 z-10">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold">时间</th>
                  <th className="text-left py-3 px-4 font-semibold">桌台</th>
                  <th className="text-right py-3 px-4 font-semibold">桌费</th>
                  <th className="text-right py-3 px-4 font-semibold">商品</th>
                  <th className="text-right py-3 px-4 font-semibold">优惠</th>
                  <th className="text-right py-3 px-4 font-semibold">应收</th>
                  <th className="text-center py-3 px-5 font-semibold">收款方式</th>
                </tr>
              </thead>
              <tbody>
                {todayCheckouts.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-felt-400">
                    <div className="text-5xl mb-2">📭</div>暂无订单
                  </td></tr>
                ) : [...todayCheckouts].sort((a, b) => a.checkout_time.localeCompare(b.checkout_time)).map(c => {
                  const session = sessions.find(s2 => s2.id === c.session_id);
                  const tbl = tables.find(t => t.id === session?.table_id);
                  const revoked = revocations.some(r => r.checkout_id === c.id);
                  const methodMap: Record<string, string> = {
                    cash: '💵 现金', wechat: '💚 微信', alipay: '💙 支付宝', member_balance: '👛 余额'
                  };
                  return (
                    <tr key={c.id} className={`border-b border-cream-100 ${revoked ? 'opacity-50 line-through bg-danger-500/5' : 'hover:bg-cream-50/40'}`}>
                      <td className="py-3 px-5 text-xs text-felt-500 whitespace-nowrap">{formatDateTime(c.checkout_time).slice(5)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-felt-700">{tbl?.table_no}号·{tbl?.name}</span>
                        {revoked && <span className="ml-2 badge bg-danger-500/10 text-danger-600">已撤销</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{formatMoney(c.table_fee)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatMoney(c.product_total)}</td>
                      <td className="py-3 px-4 text-right font-mono text-danger-500">-{formatMoney(c.discount_amount)}</td>
                      <td className="py-3 px-4 text-right font-serif font-bold text-felt-700">{formatMoney(c.final_total)}</td>
                      <td className="py-3 px-5 text-center">
                        <span className="chip border-felt-100 bg-felt-500/5 text-felt-600 text-xs">{methodMap[c.payment_method]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-felt-500 text-white sticky bottom-0 z-10">
                <tr>
                  <td colSpan={2} className="py-3 px-5 text-sm font-semibold">合计</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(metrics.tableFee)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(metrics.product)}</td>
                  <td className="py-3 px-4 text-right font-mono">-{formatMoney(metrics.discount)}</td>
                  <td className="py-3 px-4 text-right font-serif font-black text-xl">{formatMoney(metrics.net)}</td>
                  <td className="py-3 px-5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-serif font-bold text-felt-700 mb-4">收款方式统计</h3>
            {Object.keys(byMethod).length === 0 ? (
              <div className="text-center py-6 text-felt-400 text-sm">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(byMethod).map(([k, v]) => {
                  const labelMap: Record<string, string> = { cash: '💵 现金', wechat: '💚 微信', alipay: '💙 支付宝', member_balance: '👛 会员余额' };
                  const pct = metrics.received > 0 ? v / metrics.received * 100 : 0;
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-felt-700">{labelMap[k] ?? k}</span>
                        <span className="font-serif font-bold text-felt-700">{formatMoney(v)} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-felt-500 to-gold-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-serif font-bold text-felt-700 mb-4">撤销记录审计</h3>
            {todayRevoked.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="mx-auto text-felt-500/30 mb-2" />
                <div className="text-sm text-felt-400">今日无撤销</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-auto scrollbar-thin">
                {todayRevoked.map(r => (
                  <div key={r.id} className="rounded-lg bg-danger-500/5 border border-danger-500/20 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-felt-500">{formatDateTime(r.revocation_time).slice(5)}</span>
                      <span className="font-serif font-bold text-danger-500">{formatMoney(r.original_amount)}</span>
                    </div>
                    <div className="text-xs text-felt-700">{r.reason}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-cream-200 flex justify-between items-center">
              <span className="text-xs text-felt-500">撤销单数 / 金额</span>
              <span className="font-serif font-bold text-danger-500">{todayRevoked.length}单 · {formatMoney(metrics.revokedTotal)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-felt-500 to-felt-700 text-white p-5 shadow-lg">
            <div className="text-xs text-white/70 mb-1">{date} 总营收</div>
            <div className="font-serif font-black text-4xl mb-4">{formatMoney(metrics.net)}</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-white/70">订单数</div>
                <div className="font-bold text-lg text-white">{metrics.orderCount}</div>
              </div>
              <div>
                <div className="text-white/70">客单价</div>
                <div className="font-bold text-lg text-white">{formatMoney(metrics.orderCount ? metrics.net / metrics.orderCount : 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 打印区域 */}
      <div className="print-area hidden p-4 font-mono">
        <div className="text-center font-bold text-base border-b border-dashed border-black pb-2 mb-2">{settings.store_name}</div>
        <div className="text-center text-xs mb-2">日结报表 · {date}</div>
        <div className="text-xs space-y-1 border-b border-dashed border-black pb-2 mb-2">
          <div>订单数: {metrics.orderCount} 单</div>
          <div>桌台费: {formatMoney(metrics.tableFee)}</div>
          <div>商品: {formatMoney(metrics.product)}</div>
          <div>优惠: -{formatMoney(metrics.discount)}</div>
          <div>净收入: {formatMoney(metrics.net)}</div>
          <div>撤销: {todayRevoked.length} 单 / {formatMoney(metrics.revokedTotal)}</div>
        </div>
        {todayCheckouts.map((c, i) => {
          const tbl = tables.find(t => t.id === sessions.find(s2 => s2.id === c.session_id)?.table_id);
          return (
            <div key={c.id} className="text-[10px] border-b border-dotted border-black py-1">
              {i + 1}. {tbl?.table_no}号 桌{c.table_fee} 商{c.product_total} 优{c.discount_amount} ={c.final_total}
            </div>
          );
        })}
        <div className="text-center text-xs mt-3 pt-2 border-t border-dashed border-black">{settings.print_footer}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, hint, color, arrow, primary }: {
  label: string; value: number; icon: React.ReactNode; hint?: string;
  color: 'felt' | 'gold' | 'danger' | 'green'; arrow?: 'up' | 'down'; primary?: boolean;
}) {
  const colorMap = {
    felt:   { bg: 'bg-felt-500/10', fg: 'text-felt-600',  bar: 'from-felt-500 to-felt-700' },
    gold:   { bg: 'bg-gold-500/15', fg: 'text-gold-600',  bar: 'from-gold-400 to-gold-600' },
    danger: { bg: 'bg-danger-500/10',fg: 'text-danger-500',bar: 'from-rose-400 to-danger-500' },
    green:  { bg: 'bg-emerald-500/10',fg: 'text-emerald-600', bar: 'from-emerald-400 to-felt-600' },
  }[color];
  return (
    <div className={`card p-4 border-2 border-cream-100 ${primary ? 'ring-2 ring-gold-500/40' : ''} hover:-translate-y-0.5 transition-transform`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorMap.bg} ${colorMap.fg} flex items-center justify-center`}>{icon}</div>
        {arrow && (arrow === 'up'
          ? <span className="text-emerald-500 text-xs font-semibold flex items-center gap-0.5"><ArrowUpRight size={12} />增长</span>
          : <span className="text-danger-500 text-xs font-semibold flex items-center gap-0.5"><ArrowDownRight size={12} />抵扣</span>)}
      </div>
      <div className="text-xs text-felt-500 mb-1">{label}</div>
      <div className={`font-serif font-black text-2xl ${primary ? 'text-felt-700' : colorMap.fg}`}>
        {value < 0 ? '-' : ''}{formatMoney(Math.abs(value)).replace('¥', '¥')}
      </div>
      {hint && <div className="text-[11px] text-felt-400 mt-1">{hint}</div>}
    </div>
  );
}
