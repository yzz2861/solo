import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Printer, Smartphone, ShieldAlert, ShieldCheck, CheckCircle2,
  XCircle, MinusCircle, Battery, Droplets, CircleDollarSign, TrendingDown,
  TrendingUp, PackageCheck, History, AlertTriangle, RotateCcw,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useRecycleStore } from '../store/useRecycleStore';
import { useAuthStore } from '../store/useAuthStore';
import { STATUS_LABEL, STATUS_COLOR, type RecycleStatus } from '../types';
import StatusBadge from '../components/common/StatusBadge';
import PriceTag from '../components/common/PriceTag';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useState } from 'react';
import { canTransition } from '../utils/transition';
import NoticeSheetModal from '../components/register/NoticeSheetModal';

const checkIcon = (v: string) => {
  if (v === 'pass') return <CheckCircle2 size={16} className="text-emerald-600" />;
  if (v === 'fail') return <XCircle size={16} className="text-danger-600" />;
  return <MinusCircle size={16} className="text-slate-400" />;
};
const checkLabel = (v: string) => {
  if (v === 'pass') return { text: '通过', cls: 'bg-emerald-50 text-emerald-700' };
  if (v === 'fail') return { text: '不通过', cls: 'bg-rose-50 text-rose-700' };
  return { text: '待定', cls: 'bg-slate-100 text-slate-500' };
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { getOrderById, changeStatus, orders } = useRecycleStore();
  const { currentUser } = useAuthStore();
  const order = useMemo(() => (id ? getOrderById(id) : undefined), [id, getOrderById, orders]);

  const [dlgOpen, setDlgOpen] = useState<RecycleStatus | null>(null);
  const [dlgTitle, setDlgTitle] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const isManager = currentUser?.role === 'manager';

  if (!order) {
    return (
      <div className="card p-16 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-danger-400" />
        <div className="text-lg font-bold text-slate-700 mb-2">未找到对应回收单</div>
        <div className="text-sm text-slate-500 mb-5">可能已被删除或链接无效</div>
        <Link to="/list" className="btn-primary inline-flex">
          <ArrowLeft size={16} />
          返回列表
        </Link>
      </div>
    );
  }

  const openStatusDlg = (to: RecycleStatus, title: string) => {
    const result = canTransition(order.status, to, order);
    if (!result.ok) {
      alert(result.reason);
      return;
    }
    setDlgTitle(title);
    setDlgOpen(to);
  };

  const confirmStatusChange = () => {
    if (!dlgOpen || !currentUser) return;
    changeStatus(order.id, dlgOpen, {
      action: dlgTitle,
      operator: currentUser.name,
      operatorRole: currentUser.role,
    });
    setDlgOpen(null);
  };

  const history = [
    { id: 'init', type: 'init' as const, oldPrice: 0, newPrice: order.initialPrice, reason: '系统初估价', operator: order.createdBy, timestamp: order.createdAt },
    ...order.priceHistory.map(p => ({ ...p, type: 'bargain' as const })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  const currentPrice = order.finalPrice ?? order.initialPrice;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/list" className="btn-ghost !py-2 !h-auto !px-3">
            <ArrowLeft size={16} />
            返回列表
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800">
                {order.brand} {order.model}
              </h2>
              <StatusBadge status={order.status} />
              {order.duplicateSnWarning && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  <AlertTriangle size={12} />
                  序列号重复警告
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {order.id} · {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setNoticeOpen(true)} className="btn-secondary">
            <Printer size={16} />
            打印告知单
          </button>
          {order.status === 'pending_in' && (
            <Link to={`/register/${order.id}`} className="btn-secondary">
              <Edit3 size={16} />
              继续编辑
            </Link>
          )}
          {order.status === 'pending_in' && (
            <button onClick={() => openStatusDlg('in_stock', '确认入库')} className="btn-primary">
              <PackageCheck size={16} />
              入库
            </button>
          )}
          {order.status === 'in_stock' && isManager && (
            <button onClick={() => openStatusDlg('on_shelf', '审核通过上架')} className="btn-primary">
              ✓ 确认上架
            </button>
          )}
          {['in_stock', 'on_shelf'].includes(order.status) && (
            <button onClick={() => openStatusDlg('returned', '退回顾客')} className="btn-danger">
              <RotateCcw size={16} />
              退回
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <Smartphone size={18} />
              </span>
              基础信息
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="col-span-2 md:col-span-1 row-span-3">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50">
                  <img src={order.photos[0]} alt="" className="w-full h-full object-cover" />
                </div>
                {order.photos.length > 1 && (
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    {order.photos.slice(1).map((p, i) => (
                      <img key={i} src={p} className="aspect-square rounded-lg object-cover border border-slate-100 bg-slate-50" />
                    ))}
                  </div>
                )}
              </div>
              <InfoItem label="品牌" value={order.brand} />
              <InfoItem label="型号" value={order.model} />
              <InfoItem label="存储容量" value={order.storage} />
              <InfoItem label="颜色" value={order.color} />
              <InfoItem
                label="成色评级"
                value={
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                    order.appearanceRating === 'A+' ? 'bg-emerald-100 text-emerald-700' :
                    order.appearanceRating === 'A' ? 'bg-brand-100 text-brand-700' :
                    order.appearanceRating === 'B' ? 'bg-blue-100 text-blue-700' :
                    order.appearanceRating === 'C' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>{order.appearanceRating}</span>
                }
              />
              <InfoItem
                label="序列号"
                value={<span className="font-mono text-sm tabular-nums">{order.serialNumber}</span>}
              />
              <InfoItem
                label="IMEI"
                value={order.imei ? <span className="font-mono text-sm tabular-nums">{order.imei}</span> : '—'}
              />
              <InfoItem
                label="隐私清除"
                value={order.privacyWiped ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-medium"><ShieldCheck size={14} /> 已确认</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-danger-600 text-sm font-medium"><ShieldAlert size={14} /> 未确认</span>
                )}
              />
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </span>
              四项检测报告
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckCard title="屏幕检测" icon={Smartphone}>
                <CheckRow label="表面划痕" value={order.checkResult.screen.scratch} remark={order.checkResult.screen.remark} />
                <CheckRow label="玻璃碎裂" value={order.checkResult.screen.crack} />
                <CheckRow label="显示异常/坏点" value={order.checkResult.screen.display} remark={order.checkResult.screen.remark} />
              </CheckCard>
              <CheckCard title="电池检测" icon={Battery}>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600">电池健康度</span>
                    <span className={`font-mono font-bold tabular-nums ${
                      order.checkResult.battery.health >= 90 ? 'text-emerald-600' :
                      order.checkResult.battery.health >= 80 ? 'text-warn-600' : 'text-danger-600'
                    }`}>{order.checkResult.battery.health}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      order.checkResult.battery.health >= 90 ? 'bg-emerald-500' :
                      order.checkResult.battery.health >= 80 ? 'bg-warn-500' : 'bg-danger-500'
                    }`} style={{ width: order.checkResult.battery.health + '%' }} />
                  </div>
                </div>
                <CheckRow label="是否鼓包" value={order.checkResult.battery.bulge} remark={order.checkResult.battery.remark} />
              </CheckCard>
              <CheckCard title="进水检测" icon={Droplets}>
                <CheckRow label="进水试纸" value={order.checkResult.water.indicator} remark={order.checkResult.water.remark} />
              </CheckCard>
              <CheckCard title="账号锁检测" icon={ShieldAlert}>
                <CheckRow label="Apple ID / 账号退出" value={order.checkResult.account.idLoggedOut} remark={order.checkResult.account.remark} />
                {order.checkResult.account.idLoggedOut !== 'pass' && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>账号锁未退出，禁止入库上架！请顾客现场退出所有品牌账号。</span>
                  </div>
                )}
              </CheckCard>
            </div>
            {order.failReasons && order.failReasons.length > 0 && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200">
                <div className="font-bold text-danger-700 mb-2 text-sm">⚠️ 不通过项记录</div>
                <ol className="list-decimal list-inside space-y-1 text-sm text-rose-700">
                  {order.failReasons.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </div>
            )}
            {order.bargainFailRemark && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <b>议价失败备注：</b>{order.bargainFailRemark}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <History size={18} />
              </span>
              操作日志
            </h3>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-brand-300 to-slate-200" />
              {order.logs.slice().sort((a, b) => a.timestamp - b.timestamp).map(l => (
                <div key={l.id} className="relative">
                  <div className="absolute -left-[18px] top-1 w-4 h-4 rounded-full bg-white ring-4 ring-brand-100 border-2 border-brand-500" />
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{l.action}</span>
                        <span className="chip bg-white text-slate-500 border border-slate-200">
                          {l.operator} · {l.operatorRole === 'manager' ? '店长' : '店员'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {dayjs(l.timestamp).format('MM-DD HH:mm:ss')}
                      </span>
                    </div>
                    {l.detail && <div className="text-xs text-slate-500 mt-1">{l.detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <CircleDollarSign size={18} />
              </span>
              估价信息
            </h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">初估价</div>
                <div className="font-mono text-2xl font-black text-slate-700 tabular-nums line-through opacity-70">
                  ¥{order.initialPrice.toLocaleString()}
                </div>
              </div>
              <div className={`p-4 rounded-2xl border-2 ${
                currentPrice < order.initialPrice
                  ? 'bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200'
                  : currentPrice > order.initialPrice
                  ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                  : 'bg-gradient-to-br from-brand-50 to-slate-50 border-brand-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500 mb-1">当前成交价</div>
                  {currentPrice !== order.initialPrice && (
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      currentPrice < order.initialPrice ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {currentPrice < order.initialPrice ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                      {currentPrice > order.initialPrice ? '+' : ''}{currentPrice - order.initialPrice}
                    </span>
                  )}
                </div>
                <div className={`font-mono text-3xl font-black tabular-nums ${
                  currentPrice < order.initialPrice ? 'text-danger-600' :
                  currentPrice > order.initialPrice ? 'text-emerald-600' : 'text-brand-700'
                }`}>¥{currentPrice.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">共议价 {order.priceHistory.length} 次</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <TrendingDown size={18} />
              </span>
              价格变动时间线
            </h3>
            {history.length <= 1 ? (
              <div className="text-center py-8 text-slate-400 text-sm">暂无议价记录</div>
            ) : (
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
                          <span className="font-mono font-bold text-lg tabular-nums">¥{h.newPrice.toLocaleString()}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
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
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!dlgOpen}
        title={dlgTitle}
        onClose={() => setDlgOpen(null)}
        onConfirm={confirmStatusChange}
        confirmText={dlgTitle}
        confirmTone={dlgOpen === 'returned' || dlgOpen === 'bargain_fail' ? 'danger' : 'primary'}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>机型：<b>{order.brand} {order.model}</b>（{order.storage} / {order.color}）</p>
          <p>序列号：<code className="font-mono bg-slate-100 px-2 py-0.5 rounded">{order.serialNumber}</code></p>
          <p>状态变更：<b>{STATUS_LABEL[order.status]}</b> → <b className="text-brand-700">{dlgOpen ? STATUS_LABEL[dlgOpen] : ''}</b></p>
        </div>
      </ConfirmDialog>

      {noticeOpen && <NoticeSheetModal order={order} onClose={() => setNoticeOpen(false)} />}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function CheckCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div className="font-bold text-sm text-slate-800">{title}</div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function CheckRow({ label, value, remark }: { label: string; value: string; remark?: string }) {
  const l = checkLabel(value);
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {checkIcon(value)}
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`chip ${l.cls} text-[11px]`}>{l.text}</span>
      </div>
    </div>
  );
}
