import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Hash, Clock, AlertTriangle, FileX2, Receipt } from 'lucide-react';
import { useBilliardStore } from '@/store';
import { formatMoney, formatDateTime } from '@/lib/utils';

export default function QueryCenter() {
  const tables = useBilliardStore(s => s.tables);
  const sessions = useBilliardStore(s => s.sessions);
  const items = useBilliardStore(s => s.items);
  const checkouts = useBilliardStore(s => s.checkouts);
  const revocations = useBilliardStore(s => s.revocations);
  const operators = useBilliardStore(s => s.operators);
  const members = useBilliardStore(s => s.members);
  const products = useBilliardStore(s => s.products);
  const getFee = useBilliardStore(s => s.getTableFeePreview);
  const getGrand = useBilliardStore(s => s.getSessionGrandTotal);

  const [tab, setTab] = useState<'unpaid' | 'history' | 'revoke'>('unpaid');
  const [q, setQ] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const unpaid = useMemo(() => {
    const open = sessions.filter(s => !checkouts.some(c => c.session_id === s.id));
    if (tableNo.trim()) {
      const n = parseInt(tableNo);
      const t = tables.find(t => t.table_no === n);
      if (t) return open.filter(s => s.table_id === t.id);
    }
    return open;
  }, [sessions, checkouts, tables, tableNo]);

  const history = useMemo(() => {
    let list = [...checkouts];
    if (q.trim()) list = list.filter(c => {
      const session = sessions.find(s => s.id === c.session_id);
      const table = tables.find(t => t.id === session?.table_id);
      if (table && String(table.table_no).includes(q)) return true;
      if (c.id.includes(q)) return true;
      return false;
    });
    if (dateFrom) list = list.filter(c => c.checkout_time.slice(0, 10) >= dateFrom);
    if (dateTo)   list = list.filter(c => c.checkout_time.slice(0, 10) <= dateTo);
    return list.sort((a, b) => b.checkout_time.localeCompare(a.checkout_time));
  }, [checkouts, sessions, tables, q, dateFrom, dateTo]);

  const revList = useMemo(() => [...revocations].sort((a, b) => b.revocation_time.localeCompare(a.revocation_time)), [revocations]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-felt-700">查询中心</h1>
        <p className="text-xs text-felt-500 mt-0.5">未结消费、历史订单、撤销记录一站式查询</p>
      </div>

      <div className="mb-5 inline-flex p-1 bg-cream-100 rounded-xl">
        {([
          { k: 'unpaid',  l: '🔍 未结消费查询', i: Hash },
          { k: 'history', l: '📋 历史订单',     i: Receipt },
          { k: 'revoke',  l: '⚠️ 撤销记录',     i: AlertTriangle },
        ] as const).map(({ k, l, i: I }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              tab === k ? 'bg-white shadow text-felt-700' : 'text-felt-500 hover:text-felt-700'
            }`}>
            <I size={15} /> {l}
          </button>
        ))}
      </div>

      {tab === 'unpaid' && (
        <div>
          <div className="card p-4 mb-4 flex items-end gap-3 flex-wrap">
            <div className="min-w-[160px]">
              <label className="label">按桌号查询</label>
              <input type="number" className="input !py-2" placeholder="输入桌号，如 5" value={tableNo} onChange={e => setTableNo(e.target.value)} />
            </div>
            <button className="btn-ghost !text-felt-400" onClick={() => setTableNo('')}>清除</button>
            <div className="ml-auto chip border-felt-100 bg-felt-500/5 text-felt-600">
              <Clock size={12} /> 当前未结 <span className="font-bold">{unpaid.length}</span> 单
            </div>
          </div>
          <div className="space-y-4">
            {unpaid.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <div className="font-serif text-xl font-bold text-felt-700 mb-1">太棒了！</div>
                <p className="text-sm text-felt-500">当前没有未结订单</p>
              </div>
            ) : unpaid.map(s => {
              const table = tables.find(t => t.id === s.table_id);
              const member = s.member_id ? members.find(m => m.id === s.member_id) : null;
              const its = items.filter(i => i.session_id === s.id && i.delivery_status !== 'cancelled');
              const grand = getGrand(s.id);
              const fee = getFee(s.id);
              return (
                <div key={s.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-cream-50/60 border-b border-cream-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-felt-500 text-white flex items-center justify-center font-serif font-black">
                        {table?.table_no ?? '?'}
                      </div>
                      <div>
                        <div className="font-serif text-lg font-bold text-felt-700">{table?.name} · {table?.table_no}号桌</div>
                        <div className="text-xs text-felt-500">
                          开台于 {formatDateTime(s.start_time)}
                          · {s.customer_type === 'walk-in' ? '👤 散客' : s.customer_type === 'member' ? `🏆 ${member?.name}` : '🎁 包时套餐'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-felt-500">消费合计</div>
                      <div className="font-serif font-black text-2xl text-felt-700">{formatMoney(grand)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-cream-100 text-sm">
                    <div className="p-4">
                      <div className="text-xs text-felt-500 mb-1">桌费</div>
                      <div className="font-serif font-bold text-lg text-felt-700">{formatMoney(fee)}</div>
                    </div>
                    <div className="p-4">
                      <div className="text-xs text-felt-500 mb-1">商品 {its.length} 项</div>
                      <div className="font-serif font-bold text-lg text-felt-700">
                        {formatMoney(its.reduce((s, i) => s + i.subtotal, 0))}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-end gap-2">
                      <Link to={`/table/${table?.id}`} className="btn-secondary !py-2">
                        <Search size={14} /> 查看详情
                      </Link>
                      <Link to={`/checkout/${s.id}`} className="btn-primary !py-2">
                        去结账
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="card p-4 mb-4 flex items-end gap-3 flex-wrap">
            <div className="min-w-[200px]">
              <label className="label">关键词（桌号/订单ID）</label>
              <input className="input !py-2" placeholder="搜索..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div>
              <label className="label">从</label>
              <input type="date" className="input !py-2" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">到</label>
              <input type="date" className="input !py-2" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <button className="btn-ghost !text-felt-400" onClick={() => { setQ(''); setDateFrom(new Date().toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); }}>
              重置
            </button>
            <div className="ml-auto chip border-felt-100 bg-felt-500/5 text-felt-600">
              共 <span className="font-bold ml-1">{history.length}</span> 条
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-auto scrollbar-thin max-h-[60vh]">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="sticky top-0 bg-cream-50 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold">结账时间</th>
                    <th className="text-left py-3 px-4 font-semibold">桌台</th>
                    <th className="text-right py-3 px-4 font-semibold">桌费</th>
                    <th className="text-right py-3 px-4 font-semibold">商品</th>
                    <th className="text-right py-3 px-4 font-semibold">优惠</th>
                    <th className="text-right py-3 px-4 font-semibold">应收</th>
                    <th className="text-center py-3 px-4 font-semibold">方式</th>
                    <th className="text-center py-3 px-5 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center text-felt-400">暂无记录</td></tr>
                  ) : history.map(c => {
                    const session = sessions.find(s2 => s2.id === c.session_id);
                    const table = tables.find(t => t.id === session?.table_id);
                    const methodMap: Record<string, string> = {
                      cash: '💵 现金', wechat: '💚 微信', alipay: '💙 支付宝', member_balance: '👛 余额'
                    };
                    const revoked = revocations.some(r => r.checkout_id === c.id);
                    return (
                      <tr key={c.id} className={`border-b border-cream-100 ${revoked ? 'opacity-50 line-through' : 'hover:bg-cream-50/40'}`}>
                        <td className="py-3 px-5 text-xs text-felt-500">{formatDateTime(c.checkout_time)}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-felt-700">{table?.table_no}号 · {table?.name}</div>
                          <div className="text-[11px] text-felt-400">开台 {session ? formatDateTime(session.start_time) : ''}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{formatMoney(c.table_fee)}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatMoney(c.product_total)}</td>
                        <td className="py-3 px-4 text-right font-mono text-danger-500">-{formatMoney(c.discount_amount)}</td>
                        <td className="py-3 px-4 text-right font-serif font-bold text-lg text-felt-700">{formatMoney(c.final_total)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="chip border-felt-100 bg-felt-500/5 text-felt-600 text-xs">
                            {methodMap[c.payment_method] ?? c.payment_method}
                          </span>
                          {revoked && <span className="ml-2 badge bg-danger-500/10 text-danger-600">已撤销</span>}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <Link to={`/checkout/${c.session_id}`} className="btn-ghost !py-1 !px-3 text-xs">
                            <Receipt size={12} /> 查看
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'revoke' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 text-xs uppercase tracking-wide text-felt-500 border-b border-cream-200">
                <th className="text-left py-3 px-5 font-semibold">撤销时间</th>
                <th className="text-left py-3 px-4 font-semibold">原订单</th>
                <th className="text-right py-3 px-4 font-semibold">原金额</th>
                <th className="text-left py-3 px-4 font-semibold">撤销人</th>
                <th className="text-left py-3 px-5 font-semibold">原因</th>
              </tr>
            </thead>
            <tbody>
              {revList.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-felt-400">暂无撤销记录</td></tr>
              ) : revList.map(r => {
                const op = operators.find(o => o.id === r.operator_id);
                const ck = checkouts.find(c => c.id === r.checkout_id);
                const session = ck ? sessions.find(s2 => s2.id === ck.session_id) : null;
                const table = tables.find(t => t.id === session?.table_id);
                return (
                  <tr key={r.id} className="border-b border-cream-100 hover:bg-danger-500/5">
                    <td className="py-3 px-5 text-xs text-felt-500">{formatDateTime(r.revocation_time)}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-felt-700">{table ? `${table.table_no}号·${table.name}` : '—'}</div>
                      <div className="text-[11px] text-felt-400">{r.checkout_id}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-serif font-bold text-danger-500">{formatMoney(r.original_amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-felt-500/10 text-felt-600 flex items-center justify-center text-xs font-serif font-bold">
                          {op?.display_name?.[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-felt-700 text-xs">{op?.display_name}</div>
                          <div className="text-[10px] text-felt-400">{op?.role === 'admin' ? '管理员' : '收银员'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-felt-700">
                      <div className="inline-flex items-start gap-2">
                        <FileX2 size={14} className="text-danger-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{r.reason}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
