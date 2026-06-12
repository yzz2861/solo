import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, PlusCircle, Filter, ChevronDown, Eye, Edit3, Calendar,
  AlertTriangle, ShieldAlert, RotateCcw,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useRecycleStore } from '../store/useRecycleStore';
import { useAuthStore } from '../store/useAuthStore';
import { STATUS_LABEL, STATUS_COLOR, type RecycleStatus } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import PriceTag from '../components/common/PriceTag';
import ConfirmDialog from '../components/common/ConfirmDialog';

const STATUS_OPTIONS: Array<{ value: 'all' | RecycleStatus; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'pending_in', label: '待入库' },
  { value: 'in_stock', label: '已入库待上架' },
  { value: 'on_shelf', label: '已上架' },
  { value: 'returned', label: '已退回' },
  { value: 'bargain_fail', label: '议价失败' },
];

export default function ListPage() {
  const { orders, resetAll } = useRecycleStore();
  const { currentUser } = useAuthStore();
  const nav = useNavigate();
  const [kw, setKw] = useState('');
  const [status, setStatus] = useState<'all' | RecycleStatus>('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const isManager = currentUser?.role === 'manager';

  const filtered = useMemo(() => {
    let list = [...orders];
    if (status !== 'all') list = list.filter(o => o.status === status);
    if (kw.trim()) {
      const k = kw.toLowerCase();
      list = list.filter(o =>
        o.serialNumber.toLowerCase().includes(k) ||
        o.brand.toLowerCase().includes(k) ||
        o.model.toLowerCase().includes(k) ||
        (o.imei?.toLowerCase().includes(k) ?? false) ||
        o.createdBy.toLowerCase().includes(k)
      );
    }
    if (dateRange.from) {
      const t = dayjs(dateRange.from).startOf('day').valueOf();
      list = list.filter(o => o.createdAt >= t);
    }
    if (dateRange.to) {
      const t = dayjs(dateRange.to).endOf('day').valueOf();
      list = list.filter(o => o.createdAt <= t);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, status, kw, dateRange]);

  const stats = useMemo(() => {
    const r: Record<RecycleStatus | 'all', number> = { all: orders.length, pending_in: 0, in_stock: 0, on_shelf: 0, returned: 0, bargain_fail: 0 };
    orders.forEach(o => { r[o.status] = (r[o.status] ?? 0) + 1; });
    return r;
  }, [orders]);

  const hasRisk = (o: any) => {
    return !o.privacyWiped && ['pending_in', 'in_stock'].includes(o.status)
      || o.checkResult.account.idLoggedOut !== 'pass'
      || o.duplicateSnWarning
      || o.checkResult.water.indicator === 'fail'
      || o.checkResult.battery.bulge === 'fail'
      || o.checkResult.screen.crack === 'fail';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-11"
              placeholder="搜索序列号 / IMEI / 机型 / 操作人"
              value={kw}
              onChange={e => setKw(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={`btn ${filterOpen ? 'bg-brand-50 text-brand-700 border-2 border-brand-200' : 'btn-secondary'}`}
          >
            <Filter size={16} />
            筛选
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {isManager && (
            <button onClick={() => setResetOpen(true)} className="btn-ghost text-slate-400 hover:text-danger-600">
              <RotateCcw size={16} />
              重置数据
            </button>
          )}
        </div>
        <Link to="/register" className="btn-primary">
          <PlusCircle size={16} />
          新建回收单
        </Link>
      </div>

      {filterOpen && (
        <div className="card p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">按状态筛选</label>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    status === s.value ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    status === s.value ? 'bg-brand-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {stats[s.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label flex items-center gap-1.5">
              <Calendar size={14} />
              按创建日期
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="input" value={dateRange.from}
                onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
              <input type="date" className="input" value={dateRange.to}
                onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-2">
              {[
                { label: '今天', fn: () => { const d = dayjs().format('YYYY-MM-DD'); setDateRange({ from: d, to: d }); } },
                { label: '近7天', fn: () => setDateRange({ from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }) },
                { label: '本月', fn: () => setDateRange({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }) },
                { label: '清空', fn: () => setDateRange({ from: '', to: '' }) },
              ].map(b => (
                <button key={b.label} onClick={b.fn}
                  className="px-2.5 py-1 rounded-md text-xs bg-slate-100 hover:bg-brand-100 hover:text-brand-700 text-slate-600 transition-colors">
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <div className="text-xs text-slate-500">
              当前筛选结果：<span className="font-bold text-brand-700 text-lg">{filtered.length}</span> 条
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {STATUS_OPTIONS.map(s => {
          const active = status === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`card p-4 text-left transition-all hover:-translate-y-0.5 ${active ? 'ring-2 ring-brand-500 shadow-soft' : ''}`}
            >
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="mt-1.5 font-mono text-2xl font-black text-slate-800 tabular-nums">
                {stats[s.value] ?? 0}
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card py-20 flex flex-col items-center justify-center text-slate-400">
          <Search size={48} className="mb-3 opacity-40" />
          <div className="text-sm">没有匹配的回收记录</div>
          <button onClick={() => { setKw(''); setStatus('all'); setDateRange({ from: '', to: '' }); }}
            className="mt-3 text-xs text-brand-600 underline underline-offset-2">清空筛选条件</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                  <th className="px-5 py-3 text-left font-medium">商品</th>
                  <th className="px-5 py-3 text-left font-medium">序列号 / IMEI</th>
                  <th className="px-5 py-3 text-left font-medium">成色</th>
                  <th className="px-5 py-3 text-left font-medium">价格</th>
                  <th className="px-5 py-3 text-left font-medium">状态</th>
                  <th className="px-5 py-3 text-left font-medium">风险标签</th>
                  <th className="px-5 py-3 text-left font-medium">操作人</th>
                  <th className="px-5 py-3 text-left font-medium">创建时间</th>
                  <th className="px-5 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const risky = hasRisk(o);
                  return (
                    <tr
                      key={o.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${
                        risky && ['pending_in', 'in_stock'].includes(o.status) ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={o.photos[0]} alt=""
                            className="w-14 h-14 rounded-xl object-cover border border-slate-100 bg-slate-50" />
                          <div>
                            <div className="font-semibold text-slate-800">{o.brand} {o.model}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{o.storage} · {o.color}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-slate-700 tabular-nums">{o.serialNumber}</div>
                        {o.imei && <div className="font-mono text-[11px] text-slate-400 mt-1 tabular-nums">{o.imei}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          o.appearanceRating === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                          o.appearanceRating === 'A' ? 'bg-brand-100 text-brand-700' :
                          o.appearanceRating === 'B' ? 'bg-blue-100 text-blue-700' :
                          o.appearanceRating === 'C' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {o.appearanceRating}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <PriceTag value={o.finalPrice ?? o.initialPrice} />
                        {o.finalPrice !== null && o.finalPrice !== o.initialPrice && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-through">
                            原价 ¥{o.initialPrice.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-4">
                        {risky ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-[11px] font-medium">
                            <ShieldAlert size={12} />
                            待处理
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                            ✓ 正常
                          </span>
                        )}
                        {o.duplicateSnWarning && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                            SN重复
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-700">{o.createdBy}</div>
                        <div className="text-[11px] text-slate-400">
                          {o.createdByRole === 'manager' ? '店长' : '店员'}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 tabular-nums">
                        {dayjs(o.createdAt).format('YYYY-MM-DD')}
                        <div className="text-[11px] text-slate-400 mt-0.5">{dayjs(o.createdAt).format('HH:mm')}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => nav(`/detail/${o.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Eye size={13} />
                            详情
                          </button>
                          {o.status === 'pending_in' && (
                            <button
                              onClick={() => nav(`/register/${o.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Edit3 size={13} />
                              编辑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={resetOpen}
        title="重置所有数据？"
        onClose={() => setResetOpen(false)}
        onConfirm={() => { resetAll(); setResetOpen(false); }}
        confirmText="确认重置"
        confirmTone="danger"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-danger-500 shrink-0" />
          <div>
            <div className="font-bold text-slate-800 mb-1">此操作不可撤销</div>
            <div className="text-sm text-slate-600">所有回收记录将被清空并恢复为初始 Mock 数据。</div>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
