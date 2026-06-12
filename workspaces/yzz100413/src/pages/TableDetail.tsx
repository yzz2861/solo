import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, ArrowRightLeft, Coffee, Receipt, Plus, Minus,
  Truck, CheckCircle2, XCircle, Search, Trash2, AlertTriangle, Clock, User
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { useNowTick, useSessionSeconds } from '@/hooks/useTick';
import { formatDuration, formatMoney, formatDateTime } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Modal, { ConfirmDialog } from '@/components/Modal';
import OpenTableModal, { OpenTableParams } from '@/components/OpenTableModal';
import type { DeliveryStatus, OrderItem } from '@/types';

export default function TableDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const table = useBilliardStore(s => s.tables.find(t => t.id === id));
  const sessions = useBilliardStore(s => s.sessions);
  const checkouts = useBilliardStore(s => s.checkouts);
  const session = sessions.find(s => s.table_id === id && !checkouts.some(c => c.session_id === s.id));

  const startSession = useBilliardStore(s => s.startSession);
  const pauseSession = useBilliardStore(s => s.pauseSession);
  const resumeSession = useBilliardStore(s => s.resumeSession);
  const transferTable = useBilliardStore(s => s.transferTable);
  const addItem = useBilliardStore(s => s.addItem);
  const removeItem = useBilliardStore(s => s.removeItem);
  const updateDelivery = useBilliardStore(s => s.updateDeliveryStatus);

  const items = useBilliardStore(s => s.items);
  const pauses = useBilliardStore(s => s.pauses);
  const transfers = useBilliardStore(s => s.transfers);
  const members = useBilliardStore(s => s.members);
  const packages = useBilliardStore(s => s.packages);
  const products = useBilliardStore(s => s.products.filter(p => p.active));
  const tables = useBilliardStore(s => s.tables);
  const settings = useBilliardStore(s => s.settings);
  const getFeePreview = useBilliardStore(s => s.getTableFeePreview);
  const getGrand = useBilliardStore(s => s.getSessionGrandTotal);

  const now = useNowTick(1000);
  const sessionSec = useSessionSeconds(session?.id);
  const openPause = session ? pauses.find(p => p.session_id === session.id && !p.pause_end) : null;

  const [openTableOpen, setOpenTableOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('等朋友');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [searchText, setSearchText] = useState('');
  const [confirmCancelItem, setConfirmCancelItem] = useState<OrderItem | null>(null);

  const sessionItems = useMemo(
    () => session ? items.filter(i => i.session_id === session.id) : [],
    [items, session]
  );
  const sessionTransfers = useMemo(
    () => session ? transfers.filter(t => t.session_id === session.id) : [],
    [transfers, session]
  );
  const sessionPauses = useMemo(
    () => session ? pauses.filter(p => p.session_id === session.id) : [],
    [pauses, session]
  );

  const tableFee = session ? getFeePreview(session.id, now) : 0;
  const productTotal = sessionItems.filter(i => i.delivery_status !== 'cancelled').reduce((s, i) => s + i.subtotal, 0);
  const grandTotal = session ? getGrand(session.id, now) : 0;

  useEffect(() => {
    if (!table) { navigate('/'); return; }
  }, [table, navigate]);

  if (!table) return null;

  const doOpenTable = (p: OpenTableParams) => {
    const r = startSession(table.id, p.customerType, p.memberId, p.packageId, p.note);
    if (r.ok) { showToast(r.message, 'success'); setOpenTableOpen(false); }
    else showToast(r.message, 'error');
  };

  const doPause = () => {
    if (!session) return;
    pauseSession(session.id, pauseReason.trim() || '无');
    showToast(`已暂停 ${table.name}：${pauseReason || '无'}`, 'info');
    setPauseOpen(false);
  };

  const doResume = () => {
    if (!session) return;
    resumeSession(session.id);
    showToast(`已恢复 ${table.name} 计时`, 'success');
  };

  const doTransfer = () => {
    if (!session || !transferTarget) return;
    const r = transferTable(session.id, transferTarget);
    if (r.ok) {
      showToast(r.message, 'success');
      setTransferOpen(false);
      setTimeout(() => navigate(`/table/${transferTarget}`), 400);
    } else {
      showToast(r.message, 'error');
    }
  };

  const addCart = (pid: string, qty = 1) => setCart(c => ({ ...c, [pid]: (c[pid] || 0) + qty }));
  const subCart = (pid: string) => setCart(c => {
    const q = (c[pid] || 0) - 1;
    const next = { ...c };
    if (q <= 0) delete next[pid]; else next[pid] = q;
    return next;
  });
  const confirmAddItems = () => {
    if (!session) return;
    let added = 0;
    for (const [pid, q] of Object.entries(cart)) {
      if (q > 0) {
        const r = addItem(session.id, pid, q);
        if (r.ok) added += q; else showToast(r.message, 'error');
      }
    }
    if (added > 0) { showToast(`已添加 ${added} 件商品，将送达 ${table.name}`, 'success'); }
    setCart({});
    setAddItemOpen(false);
  };

  const customerLabel = useMemo(() => {
    if (!session) return null;
    if (session.customer_type === 'walk-in') { label: '散客'; return { icon: '👤', label: '散客', sub: '按时计费' }; }
    if (session.customer_type === 'member' && session.member_id) {
      const m = members.find(x => x.id === session.member_id);
      return { icon: '🏆', label: m?.name ?? '会员', sub: `折扣${(m?.discount_rate ?? 1) * 10}折 · 余额${formatMoney(m?.balance ?? 0)}` };
    }
    if (session.customer_type === 'package' && session.package_id) {
      const p = packages.find(x => x.id === session.package_id);
      return { icon: '🎁', label: p?.name ?? '包时套餐', sub: `${p?.duration_minutes ?? 0}分钟 · ${formatMoney(p?.package_price ?? 0)}` };
    }
    return null;
  }, [session, members, packages]);

  const filteredProducts = products.filter(p =>
    !searchText || p.name.includes(searchText) || p.category.includes(searchText)
  );
  const cartTotal = Object.entries(cart).reduce((sum, [pid, q]) => {
    const p = products.find(x => x.id === pid);
    return sum + (p?.price ?? 0) * q;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost !px-3">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-felt-700">{table.table_no} 号桌 · {table.name}</h1>
              <span className={`badge ${
                table.status === 'idle' ? 'bg-felt-500/10 text-felt-600'
                : table.status === 'paused' ? 'bg-sky-500/10 text-sky-600'
                : table.status === 'maintenance' ? 'bg-zinc-500/10 text-zinc-600'
                : 'bg-warn-500/10 text-warn-600'
              }`}>
                {table.status === 'idle' ? '空闲' : table.status === 'occupied' ? '占用中' : table.status === 'paused' ? '已暂停' : '维护中'}
              </span>
            </div>
            <div className="text-xs text-felt-500 mt-0.5">小时费率 {formatMoney(table.hourly_rate)} · {formatMoney(round2Min(table.hourly_rate / 60))}/分钟</div>
          </div>
        </div>

        {session && (
          <div className="flex items-center gap-2">
            {openPause ? (
              <button className="btn-warn" onClick={doResume}>
                <Play size={16} /> 恢复计时
              </button>
            ) : (
              <button className="btn-secondary" onClick={() => setPauseOpen(true)}>
                <Pause size={16} /> 暂停
              </button>
            )}
            <button className="btn-secondary" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft size={16} /> 换桌
            </button>
            <button className="btn-secondary" onClick={() => setAddItemOpen(true)}>
              <Coffee size={16} /> 加购
            </button>
            <button className="btn-primary" onClick={() => navigate(`/checkout/${session.id}`)}>
              <Receipt size={16} /> 去结账
            </button>
          </div>
        )}
      </div>

      {table.status === 'idle' ? (
        <div className="card p-12 text-center">
          <div className="w-24 h-24 rounded-3xl bg-felt-500/10 mx-auto mb-5 flex items-center justify-center text-5xl">🎱</div>
          <div className="font-serif text-2xl font-bold text-felt-700 mb-2">此桌当前空闲</div>
          <p className="text-sm text-felt-500 mb-6">客人已到店？立即开台开始计时</p>
          <button className="btn-gold !px-8 !py-3 text-base" onClick={() => setOpenTableOpen(true)}>
            <Play size={20} /> 为 {table.name} 开台
          </button>
        </div>
      ) : session ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-100 to-gold-300/60 flex items-center justify-center text-3xl">
                    {customerLabel?.icon}
                  </div>
                  <div>
                    <div className="font-serif text-xl font-bold text-felt-700">{customerLabel?.label}</div>
                    <div className="text-xs text-felt-500 mt-0.5">{customerLabel?.sub}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-felt-500 mb-1">开台时间</div>
                  <div className="text-sm text-felt-700 font-semibold">{formatDateTime(session.start_time)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-xl bg-cream-50 p-4 border border-cream-200 text-center">
                  <div className="text-[11px] text-felt-500 mb-1 flex items-center justify-center gap-1">
                    <Clock size={12} /> 已计时
                  </div>
                  <div className="font-mono font-black text-felt-700 text-2xl tabular-nums">
                    {openPause ? (
                      <span className="text-sky-600 flex items-center justify-center gap-2">
                        <Pause size={16} />
                        {formatDuration(session.total_paused_seconds + Math.floor((Date.now() - new Date(openPause.pause_start).getTime()) / 1000))}
                      </span>
                    ) : formatDuration(sessionSec)}
                  </div>
                  {openPause && (
                    <div className="text-[11px] text-sky-600 mt-1">
                      暂停中 · {openPause.pause_reason}
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-cream-50 p-4 border border-cream-200 text-center">
                  <div className="text-[11px] text-felt-500 mb-1">桌费（实时）</div>
                  <div className="font-serif font-black text-felt-700 text-2xl">{formatMoney(tableFee)}</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 p-4 text-white text-center shadow-md">
                  <div className="text-[11px] text-white/80 mb-1">消费合计</div>
                  <div className="font-serif font-black text-white text-3xl">{formatMoney(grandTotal)}</div>
                </div>
              </div>

              {(sessionTransfers.length > 0 || sessionPauses.length > 0) && (
                <div className="border-t border-cream-200 pt-4 space-y-3">
                  {sessionTransfers.map(t => {
                    const from = tables.find(x => x.id === t.from_table_id);
                    const to = tables.find(x => x.id === t.to_table_id);
                    return (
                      <div key={t.id} className="flex items-center gap-3 text-xs text-felt-500">
                        <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                          <ArrowRightLeft size={14} />
                        </span>
                        <span>换桌：{from?.table_no}号 → {to?.table_no}号</span>
                        <span className="ml-auto">{formatDateTime(t.transfer_time)}</span>
                      </div>
                    );
                  })}
                  {sessionPauses.map(p => (
                    <div key={p.id} className="flex items-center gap-3 text-xs text-felt-500">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Pause size={14} />
                      </span>
                      <span>
                        暂停 · {p.pause_reason}
                        {p.pause_end && ` · 时长 ${formatDuration(Math.floor((new Date(p.pause_end).getTime() - new Date(p.pause_start).getTime()) / 1000))}`}
                        {!p.pause_end && ' · 进行中'}
                      </span>
                      <span className="ml-auto">{formatDateTime(p.pause_start)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-bold text-felt-700 flex items-center gap-2">
                  <Coffee size={18} className="text-gold-600" />
                  消费商品 <span className="badge bg-felt-500/10 text-felt-600">{sessionItems.filter(i => i.delivery_status !== 'cancelled').length}</span>
                </h3>
                <button className="btn-secondary !py-2 text-xs" onClick={() => setAddItemOpen(true)}>
                  <Plus size={14} /> 加购
                </button>
              </div>
              {sessionItems.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-felt-100 rounded-xl">
                  <div className="text-4xl mb-2">☕️</div>
                  <div className="text-sm text-felt-400">暂未点单，点击右上角「加购」</div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-cream-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-cream-50 text-felt-500 text-xs uppercase tracking-wide">
                        <th className="text-left py-2.5 px-4 font-semibold">商品</th>
                        <th className="text-center py-2.5 px-4 font-semibold">送达桌</th>
                        <th className="text-center py-2.5 px-4 font-semibold">数量</th>
                        <th className="text-right py-2.5 px-4 font-semibold">小计</th>
                        <th className="text-center py-2.5 px-4 font-semibold">配送</th>
                        <th className="py-2.5 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionItems.map(it => {
                        const p = products.find(x => x.id === it.product_id) ?? useBilliardStore.getState().products.find(x => x.id === it.product_id);
                        const tbl = tables.find(t => t.id === it.table_id_at_add);
                        const deliveryBadge: Record<DeliveryStatus, { label: string; cls: string }> = {
                          pending:   { label: '待配送', cls: 'bg-warn-500/10 text-warn-600' },
                          delivered: { label: '已送达', cls: 'bg-felt-500/10 text-felt-600' },
                          cancelled: { label: '已取消', cls: 'bg-zinc-500/10 text-zinc-500 line-through' },
                        };
                        return (
                          <tr key={it.id} className={`border-t border-cream-100 ${it.delivery_status === 'cancelled' ? 'opacity-50' : ''}`}>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-felt-700">{p?.name}</div>
                              <div className="text-xs text-felt-400">{p?.category} · 单价 {formatMoney(it.unit_price)}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {tbl ? (
                                <span className="chip border-gold-300/50 bg-gold-500/10 text-gold-700">
                                  <Truck size={11} /> {tbl.table_no}号
                                </span>
                              ) : '-'}
                              {tbl && tbl.id !== table.id && it.delivery_status === 'pending' && (
                                <div className="text-[10px] text-sky-600 mt-0.5">（已换桌到{table.table_no}号）</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-felt-700">×{it.quantity}</td>
                            <td className="py-3 px-4 text-right font-serif font-bold text-felt-700">{formatMoney(it.subtotal)}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className={`badge ${deliveryBadge[it.delivery_status].cls}`}>{deliveryBadge[it.delivery_status].label}</span>
                                {it.delivery_status === 'pending' && (
                                  <button
                                    onClick={() => { updateDelivery(it.id, 'delivered'); showToast('已标记送达', 'success'); }}
                                    className="p-1 rounded hover:bg-felt-500/10 text-felt-500"
                                    title="标记已送达"
                                  ><CheckCircle2 size={14} /></button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {it.delivery_status !== 'cancelled' && (
                                <button
                                  onClick={() => setConfirmCancelItem(it)}
                                  className="p-1.5 rounded hover:bg-danger-500/10 text-danger-500"
                                  title="取消/退单"
                                ><XCircle size={14} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-cream-50 border-t border-cream-200">
                        <td colSpan={3} className="py-3 px-4 text-right font-semibold text-felt-600">商品合计</td>
                        <td className="py-3 px-4 text-right font-serif font-black text-xl text-felt-700">{formatMoney(productTotal)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="card p-5 sticky top-20">
              <div className="text-xs text-felt-500 mb-1 font-semibold uppercase tracking-wide">消费汇总</div>
              <div className="space-y-2.5 py-3 border-b border-cream-200">
                <div className="flex justify-between text-sm">
                  <span className="text-felt-500">桌费</span>
                  <span className="font-semibold text-felt-700">{formatMoney(tableFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-felt-500">商品</span>
                  <span className="font-semibold text-felt-700">{formatMoney(productTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-felt-500">小计</span>
                  <span className="font-semibold text-felt-700">{formatMoney(tableFee + productTotal)}</span>
                </div>
              </div>
              <div className="py-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-felt-600">应收总额</span>
                  <span className="font-serif font-black text-4xl text-felt-700">{formatMoney(grandTotal)}</span>
                </div>
              </div>
              <button
                className="btn-primary w-full !py-3 text-base"
                onClick={() => navigate(`/checkout/${session.id}`)}
              >
                <Receipt size={18} /> 立即结账
              </button>
            </div>

            {session && (
              <div className="card p-5">
                <div className="text-xs text-felt-500 mb-3 font-semibold uppercase tracking-wide">快捷操作</div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary !py-3" onClick={() => setAddItemOpen(true)}>
                    <Coffee size={16} /> 加购
                  </button>
                  {openPause ? (
                    <button className="btn-primary !py-3" onClick={doResume}>
                      <Play size={16} /> 恢复
                    </button>
                  ) : (
                    <button className="btn-secondary !py-3" onClick={() => setPauseOpen(true)}>
                      <Pause size={16} /> 暂停
                    </button>
                  )}
                  <button className="btn-secondary !py-3" onClick={() => setTransferOpen(true)}>
                    <ArrowRightLeft size={16} /> 换桌
                  </button>
                  <button className="btn-ghost !py-3 text-felt-500" onClick={() => navigate('/')}>
                    <ArrowLeft size={16} /> 返回
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <OpenTableModal
        open={openTableOpen}
        tableId={table.id}
        onClose={() => setOpenTableOpen(false)}
        onSubmit={doOpenTable}
      />

      <Modal
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title={`暂停 ${table.name} 计时`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPauseOpen(false)}>取消</button>
            <button className="btn-warn" onClick={doPause} disabled={!pauseReason.trim()}>
              <Pause size={16} /> 确认暂停
            </button>
          </>
        }
      >
        <label className="label">暂停原因</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['等朋友', '去吃饭', '接电话', '休息一下'].map(r => (
            <button
              key={r}
              onClick={() => setPauseReason(r)}
              className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                pauseReason === r ? 'border-felt-500 bg-felt-500/10 text-felt-700' : 'border-felt-100 hover:border-felt-300'
              }`}
            >{r}</button>
          ))}
        </div>
        <input className="input" value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="或自定义原因" />
        <div className="mt-4 rounded-xl bg-warn-500/5 border border-warn-500/20 p-3 text-xs text-warn-600 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>暂停超过 {settings.pause_reminder_minutes} 分钟将提醒前台确认客人是否还在。暂停时长不计入桌费。</span>
        </div>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title={`换桌：${table.name} → 选择目标桌`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setTransferOpen(false)}>取消</button>
            <button className="btn-primary" onClick={doTransfer} disabled={!transferTarget}>
              <ArrowRightLeft size={16} /> 确认换桌
            </button>
          </>
        }
      >
        <div className="rounded-xl bg-sky-500/5 border border-sky-400/20 p-3 text-xs text-sky-700 mb-4 flex items-start gap-2">
          <Truck size={14} className="mt-0.5 shrink-0" />
          <span>换桌后，当前计时、已加购饮料、消费记录都会<strong>自动继承</strong>到新桌。商品配送列表会自动更新为新桌号，避免服务员送错。</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tables.filter(t => t.id !== table.id).map(t => {
            const disabled = t.status !== 'idle';
            const active = t.id === transferTarget;
            return (
              <button
                key={t.id}
                disabled={disabled}
                onClick={() => setTransferTarget(t.id)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  disabled ? 'bg-zinc-50 border-zinc-200 opacity-50 cursor-not-allowed'
                  : active ? 'border-felt-500 bg-felt-500/5 shadow -translate-y-0.5'
                  : 'border-felt-100 hover:border-gold-500/50 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`status-dot ${
                    t.status === 'idle' ? 'bg-felt-500'
                    : t.status === 'occupied' ? 'bg-warn-500'
                    : t.status === 'paused' ? 'bg-sky-500'
                    : 'bg-zinc-400'
                  }`}></span>
                  {disabled && <span className="text-[10px] text-zinc-500">{t.status === 'occupied' ? '占用' : t.status === 'paused' ? '暂停' : '维护'}</span>}
                </div>
                <div className="font-serif text-xl font-black text-felt-700">{t.table_no}</div>
                <div className="text-[11px] text-felt-500">{t.name}</div>
              </button>
            );
          })}
        </div>
        {transferTarget && (() => {
          const t = tables.find(x => x.id === transferTarget);
          return (
            <div className="mt-4 rounded-xl bg-gold-500/10 border border-gold-500/30 p-3 text-sm">
              <span className="text-gold-700 font-semibold">即将换桌：</span>
              <span className="text-felt-700 ml-1">{table.table_no}号（{table.name}）→ {t?.table_no}号（{t?.name}）</span>
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={addItemOpen}
        onClose={() => { setAddItemOpen(false); setCart({}); setSearchText(''); }}
        size="xl"
        title={`加购商品 · 送达 ${table.name}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setAddItemOpen(false); setCart({}); }}>取消</button>
            <button className="btn-primary" disabled={Object.keys(cart).length === 0} onClick={confirmAddItems}>
              <Plus size={16} /> 确认加购 · {formatMoney(cartTotal)}
            </button>
          </>
        }
      >
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-felt-400" />
          <input
            className="input pl-9"
            placeholder="搜索饮料、小吃..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-auto scrollbar-thin pr-1">
          {filteredProducts.map(p => {
            const q = cart[p.id] || 0;
            const disabled = p.stock <= 0;
            return (
              <div key={p.id} className={`rounded-xl border-2 p-3 transition-all ${
                disabled ? 'bg-zinc-50 border-zinc-200 opacity-60'
                : q > 0 ? 'bg-gold-500/10 border-gold-500/40'
                : 'bg-white border-felt-100 hover:border-felt-300'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl">{p.category === '饮料' ? '🥤' : p.category === '小吃' ? '🍟' : '📦'}</div>
                    <div className="font-bold text-felt-700 mt-0.5">{p.name}</div>
                    <div className="text-[11px] text-felt-400">库存 {p.stock}</div>
                  </div>
                  <div className="font-serif font-black text-felt-700 text-lg">{formatMoney(p.price)}</div>
                </div>
                <div className="flex items-center justify-between">
                  {q === 0 ? (
                    <button
                      disabled={disabled}
                      onClick={() => addCart(p.id)}
                      className="w-full py-1.5 rounded-lg bg-felt-500 text-white text-xs font-semibold hover:bg-felt-600 disabled:bg-zinc-300 disabled:cursor-not-allowed"
                    >+ 添加</button>
                  ) : (
                    <div className="w-full flex items-center justify-between">
                      <button
                        onClick={() => subCart(p.id)}
                        className="w-8 h-8 rounded-lg bg-cream-100 text-felt-700 hover:bg-felt-500/10 flex items-center justify-center"
                      ><Minus size={14} /></button>
                      <span className="font-mono font-bold text-felt-700 text-lg">{q}</span>
                      <button
                        disabled={disabled}
                        onClick={() => addCart(p.id)}
                        className="w-8 h-8 rounded-lg bg-felt-500 text-white hover:bg-felt-600 disabled:bg-zinc-300 flex items-center justify-center"
                      ><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmCancelItem}
        onClose={() => setConfirmCancelItem(null)}
        onConfirm={() => {
          if (confirmCancelItem) {
            removeItem(confirmCancelItem.id);
            showToast('已退单，库存已恢复', 'success');
          }
          setConfirmCancelItem(null);
        }}
        title="退单确认"
        danger
        message={
          <>
            确定取消此商品？
            <div className="mt-2 rounded-lg bg-cream-50 p-3 text-left text-xs">
              <div className="font-semibold text-felt-700">
                {products.find(p => p.id === confirmCancelItem?.product_id)?.name}
              </div>
              <div className="text-felt-500">
                数量 ×{confirmCancelItem?.quantity} · 小计 {formatMoney(confirmCancelItem?.subtotal ?? 0)}
              </div>
              <div className="text-felt-400 mt-1">操作后将自动退还对应库存数量。</div>
            </div>
          </>
        }
      />
    </div>
  );
}

function round2Min(n: number) { return Math.round(n * 100) / 100; }
