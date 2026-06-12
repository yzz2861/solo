import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Lock, Unlock, Percent, Banknote, CreditCard, Smartphone,
  Wallet, Printer, FileX2, AlertTriangle, X, Trash2,
} from 'lucide-react';
import { useBilliardStore } from '@/store';
import { useNowTick } from '@/hooks/useTick';
import { formatMoney, formatDateTime, calcCheckoutTotals, calcChange, formatDuration, calcElapsedBillableSeconds } from '@/lib/utils';
import { showToast } from '@/components/Toast';
import Modal, { ConfirmDialog } from '@/components/Modal';
import type { PaymentMethod } from '@/types';

export default function Checkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessions = useBilliardStore(s => s.sessions);
  const tables = useBilliardStore(s => s.tables);
  const items = useBilliardStore(s => s.items);
  const products = useBilliardStore(s => s.products);
  const members = useBilliardStore(s => s.members);
  const packages = useBilliardStore(s => s.packages);
  const checkouts = useBilliardStore(s => s.checkouts);
  const operators = useBilliardStore(s => s.operators);
  const settings = useBilliardStore(s => s.settings);
  const currentOpId = useBilliardStore(s => s.current_operator_id);
  const doCheckout = useBilliardStore(s => s.checkout);
  const lockCheckout = useBilliardStore(s => s.lockCheckout);
  const revokeCheckout = useBilliardStore(s => s.revokeCheckout);
  const getFee = useBilliardStore(s => s.getTableFeePreview);

  const session = sessions.find(s => s.id === sessionId);
  const prevCheckout = checkouts.find(c => c.session_id === sessionId);
  const now = useNowTick(1000);
  const table = session ? tables.find(t => t.id === session.table_id) : null;

  const [discountMode, setDiscountMode] = useState<'rate' | 'amount'>('rate');
  const [discountValue, setDiscountValue] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [received, setReceived] = useState<string>('');
  const [locked, setLocked] = useState(false);
  const [memberBalancePay, setMemberBalancePay] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeAdminPwd, setRevokeAdminPwd] = useState('');
  const [checkoutDone, setCheckoutDone] = useState<string | null>(prevCheckout?.id ?? null);

  useEffect(() => {
    if (session && session.customer_type === 'member') {
      setDiscountMode('rate');
      const m = members.find(x => x.id === session.member_id);
      if (m) setDiscountValue(m.discount_rate);
    }
  }, [session, members]);

  const sessionItems = useMemo(
    () => session ? items.filter(i => i.session_id === session.id && i.delivery_status !== 'cancelled') : [],
    [items, session]
  );
  const tableFee = session ? getFee(session.id, now) : 0;
  const productTotal = useMemo(() => sessionItems.reduce((s, i) => s + i.subtotal, 0), [sessionItems]);
  const totals = calcCheckoutTotals(tableFee, productTotal, { type: discountMode, value: discountValue });

  const member = session?.customer_type === 'member' ? members.find(m => m.id === session.member_id) : null;
  const pkg = session?.customer_type === 'package' ? packages.find(p => p.id === session.package_id) : null;

  const receivedNum = parseFloat(received) || 0;
  const finalTotal = totals.finalTotal;
  const change = calcChange(receivedNum, finalTotal);
  const canSubmit = !locked
    && (!memberBalancePay || (member && member.balance >= finalTotal))
    && ((paymentMethod === 'cash' && receivedNum >= finalTotal) || paymentMethod !== 'cash');

  const doSubmit = () => {
    if (!session || !currentOpId || !canSubmit) return;
    let pm: PaymentMethod = paymentMethod;
    if (member && memberBalancePay) pm = 'member_balance';
    const actualReceived = pm === 'member_balance' ? finalTotal : receivedNum;
    const r = doCheckout(
      session.id,
      { type: discountMode, value: discountValue },
      pm,
      actualReceived,
      currentOpId
    );
    if (r.ok) {
      showToast('结账成功！', 'success');
      setLocked(true);
      setCheckoutDone(r.checkoutId ?? null);
      if (r.checkoutId) lockCheckout(r.checkoutId);
    } else {
      showToast(r.message, 'error');
    }
  };

  const doRevoke = () => {
    if (!checkoutDone || !currentOpId) return;
    const r = revokeCheckout(checkoutDone, currentOpId, revokeReason.trim(), revokeAdminPwd);
    if (r.ok) {
      showToast('已记录撤销', 'success');
      setRevokeOpen(false);
      setRevokeReason('');
      setRevokeAdminPwd('');
    } else {
      showToast(r.message, 'error');
    }
  };

  const printReceipt = () => {
    if (!checkoutDone) return;
    window.print();
  };

  if (!session || !table) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/')} className="btn-ghost !px-3"><ArrowLeft size={18} /></button>
          <h1 className="font-serif text-2xl font-bold text-felt-700">结账</h1>
        </div>
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">❓</div>
          <div className="font-serif text-xl font-bold text-felt-700 mb-2">订单不存在</div>
          <button className="btn-primary mt-4" onClick={() => navigate('/')}>返回桌台总览</button>
        </div>
      </div>
    );
  }

  const elapsedSec = calcElapsedBillableSeconds(session, now);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="no-print flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/table/${table.id}`)} className="btn-ghost !px-3"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-felt-700">{table.table_no} 号桌 · 结账</h1>
            <div className="text-xs text-felt-500 mt-0.5">{table.name} · 开台于 {formatDateTime(session.start_time)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {checkoutDone && (
            <button className="btn-secondary" onClick={printReceipt}>
              <Printer size={16} /> 打印小票
            </button>
          )}
          {checkoutDone && (
            <button className="btn-danger" onClick={() => setRevokeOpen(true)}>
              <FileX2 size={16} /> 撤销此单
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <div className="card p-6 no-print">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs text-felt-500 mb-1">客人类型</div>
                <div className="flex items-center gap-2">
                  <span className="chip border-felt-200 bg-felt-500/5">
                    {session.customer_type === 'walk-in' && '👤 散客'}
                    {session.customer_type === 'member' && `🏆 ${member?.name ?? '会员'}`}
                    {session.customer_type === 'package' && `🎁 ${pkg?.name ?? '包时'}`}
                  </span>
                  {member && (
                    <span className="chip border-gold-300/50 bg-gold-500/10 text-gold-700">
                      余额 {formatMoney(member.balance)} · {(member.discount_rate * 10).toFixed(1)}折
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-felt-500 mb-1">计费时长</div>
                <div className="font-mono font-bold text-felt-700 text-xl tabular-nums">{formatDuration(elapsedSec)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-cream-50 border border-cream-200">
              <div>
                <div className="text-[11px] text-felt-500">桌台费</div>
                <div className="font-serif font-bold text-felt-700 text-lg">{formatMoney(tableFee)}</div>
              </div>
              <div>
                <div className="text-[11px] text-felt-500">商品</div>
                <div className="font-serif font-bold text-felt-700 text-lg">{formatMoney(productTotal)}</div>
              </div>
              <div>
                <div className="text-[11px] text-felt-500">项目数</div>
                <div className="font-serif font-bold text-felt-700 text-lg">{sessionItems.length} 项</div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-cream-50/60 border-b border-cream-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-felt-700">消费明细</h3>
              <span className="badge bg-felt-500/10 text-felt-600">{sessionItems.length} 条</span>
            </div>
            {sessionItems.length === 0 ? (
              <div className="p-8 text-center text-felt-400 text-sm">暂无商品消费</div>
            ) : (
              <div className="divide-y divide-cream-100 max-h-96 overflow-auto scrollbar-thin">
                {sessionItems.map(it => {
                  const p = products.find(x => x.id === it.product_id);
                  const t = tables.find(x => x.id === it.table_id_at_add);
                  return (
                    <div key={it.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cream-50 flex items-center justify-center text-xl">
                          {p?.category === '饮料' ? '🥤' : '🍟'}
                        </div>
                        <div>
                          <div className="font-semibold text-felt-700">{p?.name}</div>
                          <div className="text-[11px] text-felt-400">
                            单价 {formatMoney(it.unit_price)} · {t ? `${t.table_no}号桌下单` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-felt-600">×{it.quantity}</div>
                        <div className="font-serif font-bold text-felt-700">{formatMoney(it.subtotal)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-3 bg-cream-50/60 border-t border-cream-200 flex justify-between">
              <span className="text-sm text-felt-500">桌费 + 商品 小计</span>
              <span className="font-serif font-bold text-felt-700 text-lg">{formatMoney(totals.subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6 sticky top-20">
            <div className="no-print mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-bold text-felt-700 flex items-center gap-2">
                  <Percent size={16} className="text-gold-600" /> 优惠
                </h3>
                <div className="flex rounded-lg bg-cream-100 p-0.5">
                  <button
                    disabled={locked}
                    onClick={() => setDiscountMode('rate')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      discountMode === 'rate' ? 'bg-white shadow text-felt-700' : 'text-felt-500 hover:text-felt-700'
                    } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >折扣率</button>
                  <button
                    disabled={locked}
                    onClick={() => setDiscountMode('amount')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      discountMode === 'amount' ? 'bg-white shadow text-felt-700' : 'text-felt-500 hover:text-felt-700'
                    } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >优惠金额</button>
                </div>
              </div>
              {discountMode === 'rate' ? (
                <div>
                  <div className="grid grid-cols-5 gap-1.5 mb-2">
                    {[1, 0.95, 0.9, 0.85, 0.8].map(r => (
                      <button
                        key={r}
                        disabled={locked}
                        onClick={() => setDiscountValue(r)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border ${
                          Math.abs(discountValue - r) < 0.0001
                            ? 'border-gold-500 bg-gold-500/10 text-gold-700'
                            : 'border-felt-100 hover:border-felt-300 text-felt-600'
                        } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >{r === 1 ? '无折' : `${(r * 10).toFixed(0)}折`}</button>
                    ))}
                  </div>
                  <input
                    disabled={locked}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={discountValue}
                    onChange={e => setDiscountValue(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                    className={`input !py-2 text-sm ${locked ? 'input-locked' : ''}`}
                  />
                </div>
              ) : (
                <input
                  disabled={locked}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="输入优惠金额，如 10"
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={e => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`input !py-2 text-sm ${locked ? 'input-locked' : ''}`}
                />
              )}
            </div>

            <div className={`rounded-2xl p-5 mb-5 transition-all ${
              locked ? 'bg-cream-100 border-2 border-gold-500/40' : 'bg-gradient-to-br from-felt-500 to-felt-700 text-white shadow-lg'
            }`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className={locked ? 'text-felt-600' : 'text-white/80'}>小计</span>
                  <span className={`font-semibold ${locked ? 'text-felt-700' : 'text-white'}`}>{formatMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={locked ? 'text-felt-600' : 'text-white/80'}>优惠</span>
                  <span className={`font-semibold ${locked ? 'text-danger-500' : 'text-gold-300'}`}>- {formatMoney(totals.discountAmount)}</span>
                </div>
                <div className="border-t border-white/20 my-3"></div>
                <div className="flex justify-between items-end">
                  <span className={`text-sm font-semibold ${locked ? 'text-felt-700' : 'text-white/90'}`}>应收总额</span>
                  <span className={`font-serif font-black text-4xl ${locked ? 'text-felt-700' : 'text-white'}`}>
                    {formatMoney(finalTotal)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 no-print">
                <button
                  onClick={() => setLocked(l => !l)}
                  className={`w-full !py-2.5 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-all ${
                    locked
                      ? 'bg-white text-felt-700 hover:bg-cream-50'
                      : 'bg-gold-500 text-felt-900 hover:bg-gold-300'
                  }`}
                  disabled={!!checkoutDone}
                >
                  {locked ? <>已锁定 <Lock size={14} /></> : <>锁定金额 <Unlock size={14} /></>}
                </button>
              </div>
              {locked && (
                <div className="mt-3 rounded-lg bg-gold-500/15 border border-gold-500/30 p-2.5 text-[11px] text-gold-700 flex items-start gap-2 no-print">
                  <Lock size={12} className="mt-0.5 shrink-0" />
                  <span>金额已锁定，收银员无法再修改。如需调整请先点击解锁按钮。</span>
                </div>
              )}
            </div>

            <div className="no-print space-y-4">
              <div>
                <div className="label">收款方式</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { k: 'cash',          label: '现金',     icon: Banknote },
                    { k: 'wechat',        label: '微信',     icon: Smartphone },
                    { k: 'alipay',        label: '支付宝',   icon: CreditCard },
                  ] as { k: PaymentMethod; label: string; icon: typeof Banknote }[]).map(({ k, label, icon: I }) => {
                    const active = paymentMethod === k && !memberBalancePay;
                    return (
                      <button
                        key={k}
                        disabled={locked}
                        onClick={() => { setPaymentMethod(k); setMemberBalancePay(false); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                          active ? 'border-felt-500 bg-felt-500 text-white shadow'
                                 : 'border-felt-100 hover:border-felt-300 text-felt-600'
                        } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <I size={15} /> {label}
                      </button>
                    );
                  })}
                </div>
                {member && (
                  <button
                    disabled={locked}
                    onClick={() => setMemberBalancePay(v => !v)}
                    className={`mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      memberBalancePay ? 'border-gold-500 bg-gold-500/10 text-gold-700 shadow'
                                        : 'border-felt-100 hover:border-gold-300 text-felt-600'
                    } ${locked ? 'opacity-50 cursor-not-allowed' : ''} ${member.balance < finalTotal ? 'opacity-60' : ''}`}
                  >
                    <Wallet size={15} />
                    会员余额支付（余额 {formatMoney(member.balance)}）
                    {member.balance < finalTotal && <span className="ml-auto text-danger-500 text-xs">余额不足</span>}
                  </button>
                )}
              </div>

              {(paymentMethod === 'cash' && !memberBalancePay) && (
                <div>
                  <div className="label">实收金额</div>
                  <input
                    disabled={locked}
                    type="number"
                    step={0.01}
                    min={0}
                    value={received}
                    onChange={e => setReceived(e.target.value)}
                    placeholder={`请输入实收，如 ${Math.ceil(finalTotal)}`}
                    className={`input !py-3 text-lg font-mono font-bold ${locked ? 'input-locked' : ''}`}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[finalTotal, Math.ceil(finalTotal), Math.ceil(finalTotal / 10) * 10, Math.ceil(finalTotal / 50) * 50, Math.ceil(finalTotal / 100) * 100].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                      <button
                        key={v}
                        disabled={locked}
                        onClick={() => setReceived(String(v))}
                        className={`chip border-felt-100 hover:border-gold-500/50 hover:bg-gold-500/5 text-xs ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >{formatMoney(v)}</button>
                    ))}
                  </div>
                  {receivedNum > 0 && receivedNum >= finalTotal && (
                    <div className="mt-3 rounded-lg bg-gold-500/10 border border-gold-500/30 p-3 flex items-center justify-between">
                      <span className="text-sm text-gold-700">找零</span>
                      <span className="font-serif font-black text-2xl text-gold-700">{formatMoney(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {!checkoutDone ? (
                <button
                  onClick={doSubmit}
                  disabled={!canSubmit}
                  className="btn-primary w-full !py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ 确认收款 · {formatMoney(finalTotal)}
                </button>
              ) : (
                <div className="rounded-xl bg-felt-500 text-white p-5 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-2">
                    <Printer size={26} />
                  </div>
                  <div className="font-serif text-xl font-bold mb-1">结账完成！</div>
                  <div className="text-sm text-white/80 mb-4">应收 {formatMoney(finalTotal)} · 实收 {formatMoney(receivedNum > 0 ? receivedNum : finalTotal)}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-secondary !py-2.5 w-full" onClick={printReceipt}>
                      <Printer size={14} /> 打印小票
                    </button>
                    <button className="btn-gold !py-2.5 w-full" onClick={() => navigate('/')}>
                      返回桌台
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 打印区域 */}
            <div className="print-area hidden">
              <div className="text-center mb-2 font-bold">{settings.store_name}</div>
              <div className="text-center text-xs mb-3">结账小票 · {formatDateTime(new Date().toISOString())}</div>
              <div className="border-t border-dashed border-black py-2 text-xs space-y-1">
                <div>桌号：{table.table_no}（{table.name}）</div>
                <div>开台：{formatDateTime(session.start_time)}</div>
                <div>时长：{formatDuration(elapsedSec)}</div>
                <div>类型：{session.customer_type === 'walk-in' ? '散客' : session.customer_type === 'member' ? `会员 ${member?.name}` : `套餐 ${pkg?.name}`}</div>
              </div>
              <div className="border-t border-dashed border-black py-2 text-xs space-y-1">
                {sessionItems.map(it => {
                  const p = products.find(x => x.id === it.product_id);
                  return (
                    <div key={it.id} className="flex justify-between">
                      <span>{p?.name} ×{it.quantity}</span>
                      <span>{formatMoney(it.subtotal)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-semibold">桌费<span>{formatMoney(tableFee)}</span></div>
              </div>
              <div className="border-t border-dashed border-black py-2 text-xs space-y-1">
                <div className="flex justify-between">小计<span>{formatMoney(totals.subtotal)}</span></div>
                <div className="flex justify-between">优惠<span>-{formatMoney(totals.discountAmount)}</span></div>
                <div className="flex justify-between font-bold text-base">应收<span>{formatMoney(finalTotal)}</span></div>
                <div className="flex justify-between">实收<span>{formatMoney(receivedNum > 0 ? receivedNum : finalTotal)}</span></div>
                <div className="flex justify-between">找零<span>{formatMoney(change)}</span></div>
                <div className="flex justify-between">
                  方式<span>{paymentMethod === 'cash' ? '现金' : paymentMethod === 'wechat' ? '微信' : paymentMethod === 'alipay' ? '支付宝' : '会员余额'}</span>
                </div>
              </div>
              <div className="text-center text-xs mt-3 pt-2 border-t border-dashed border-black">
                {settings.print_footer}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={revokeOpen}
        onClose={() => { setRevokeOpen(false); setRevokeReason(''); setRevokeAdminPwd(''); }}
        title="撤销订单"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRevokeOpen(false)}>取消</button>
            <button className="btn-danger" onClick={doRevoke}>
              <Trash2 size={14} /> 确认撤销
            </button>
          </>
        }
      >
        <div className="rounded-xl bg-danger-500/5 border border-danger-500/20 p-3 text-xs text-danger-600 mb-4 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>撤销操作将记录到<strong>撤销审计日志</strong>，需要输入管理员密码，撤销后库存和会员余额不会自动恢复，请线下处理。</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">撤销原因</label>
            <textarea
              rows={2}
              className="input resize-none"
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="如：金额输错需重开、客人投诉免单等"
            />
          </div>
          <div>
            <label className="label">管理员密码</label>
            <input
              type="password"
              className="input"
              value={revokeAdminPwd}
              onChange={e => setRevokeAdminPwd(e.target.value)}
              placeholder="请输入管理员密码确认"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
