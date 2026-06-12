import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  X, Edit3, ChevronLeft, ChevronRight, Camera, Smartphone,
  Battery, Droplets, UserCheck, Shield, TrendingUp, TrendingDown,
  Minus, Clock, User, FileText, AlertTriangle, CheckCircle2,
  XCircle, HelpCircle, ExternalLink
} from 'lucide-react';
import type { RecycleOrder, CheckResult } from '/Users/bill/Documents/solo/workspaces/yzz100449/src/types';
import StatusBadge from '/Users/bill/Documents/solo/workspaces/yzz100449/src/components/common/StatusBadge';
import PriceTag from '/Users/bill/Documents/solo/workspaces/yzz100449/src/components/common/PriceTag';

interface Props {
  open: boolean;
  order: RecycleOrder | null;
  onClose: () => void;
}

type TabKey = 'info' | 'check' | 'price' | 'logs';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'info', label: '基础信息', icon: <Smartphone size={14} /> },
  { key: 'check', label: '检测报告', icon: <Shield size={14} /> },
  { key: 'price', label: '价格明细', icon: <TrendingUp size={14} /> },
  { key: 'logs', label: '操作日志', icon: <Clock size={14} /> },
];

export default function DetailDrawer({ open, order, onClose }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('info');
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setTab('info');
      setPhotoIdx(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, order?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!order) return null;

  const getRatingCls = (rating: string) => {
    const map: Record<string, string> = {
      'A+': 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white',
      'A': 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white',
      'B': 'bg-gradient-to-br from-sky-400 to-sky-500 text-white',
      'C': 'bg-gradient-to-br from-amber-400 to-amber-500 text-white',
      'D': 'bg-gradient-to-br from-rose-400 to-rose-500 text-white',
    };
    return map[rating] ?? 'bg-slate-400 text-white';
  };

  const checkIcon = (r: CheckResult) => {
    if (r === 'pass') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (r === 'fail') return <XCircle size={14} className="text-rose-500" />;
    return <HelpCircle size={14} className="text-slate-400" />;
  };
  const checkText = (r: CheckResult) => ({
    pass: '通过', fail: '不合格', pending: '待确认',
  }[r]);
  const checkCls = (r: CheckResult) => ({
    pass: 'text-emerald-600 bg-emerald-50',
    fail: 'text-rose-600 bg-rose-50',
    pending: 'text-slate-600 bg-slate-50',
  }[r]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[520px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="shrink-0 border-b border-slate-100 bg-gradient-to-br from-brand-50 via-white to-white">
          <div className="flex items-start justify-between p-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${getRatingCls(order.appearanceRating)}`}>
                  外观 {order.appearanceRating}
                </div>
                <StatusBadge status={order.status} size="sm" />
                {order.duplicateSnWarning && (
                  <span className="chip !bg-warn-50 !text-warn-600">
                    <AlertTriangle size={11} /> SN重复
                  </span>
                )}
              </div>
              <h2 className="mt-2.5 text-xl font-black text-slate-800 tracking-tight">
                {order.brand} {order.model}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>{order.storage}</span>
                <span className="text-slate-300">·</span>
                <span>{order.color}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono tabular-nums">{order.serialNumber}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-3">
              <button
                onClick={() => navigate(`/register/${order.id}`)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                title="编辑订单"
              >
                <Edit3 size={17} />
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="card !rounded-xl p-3 text-center border-brand-100">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">初始估价</div>
                <div className="mt-1">
                  <PriceTag value={order.initialPrice} size="sm" />
                </div>
              </div>
              <div className="card !rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  {order.finalPrice !== null ? '最终成交' : '状态'}
                </div>
                <div className="mt-1">
                  {order.finalPrice !== null ? (
                    <PriceTag
                      value={order.finalPrice}
                      size="sm"
                      tone={
                        order.finalPrice > order.initialPrice ? 'up' :
                        order.finalPrice < order.initialPrice ? 'down' : 'default'
                      }
                    />
                  ) : (
                    <span className="text-sm text-slate-500">议价中</span>
                  )}
                </div>
              </div>
              <div className="card !rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">议价次数</div>
                <div className="mt-1 text-lg font-black font-mono text-brand-600 tabular-nums">
                  {order.priceHistory.length}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="shrink-0 border-b border-slate-100 px-5 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-3 text-xs font-medium inline-flex items-center gap-1.5 border-b-2 transition-all ${
                tab === t.key
                  ? 'text-brand-600 border-brand-500'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'info' && (
            <div className="p-5 space-y-5">
              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Camera size={12} /> 设备照片
                </h3>
                <div className="card !rounded-xl p-3 relative">
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={order.photos[photoIdx]}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                    {order.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIdx((i) => (i - 1 + order.photos.length) % order.photos.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-600 hover:bg-white"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setPhotoIdx((i) => (i + 1) % order.photos.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-slate-600 hover:bg-white"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {order.photos.map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                i === photoIdx ? 'bg-brand-500 w-4' : 'bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {order.photos.length > 1 && (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {order.photos.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIdx(i)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            i === photoIdx ? 'border-brand-500 shadow-soft' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={p} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Smartphone size={12} /> 基本信息
                </h3>
                <div className="card !rounded-xl divide-y divide-slate-50">
                  {[
                    ['品牌', order.brand],
                    ['型号', order.model],
                    ['存储容量', order.storage],
                    ['颜色', order.color],
                    ['外观评级', order.appearanceRating],
                    ['序列号', order.serialNumber],
                    ['IMEI', order.imei ?? '—'],
                    ['创建人', `${order.createdBy} (${order.createdByRole === 'manager' ? '店长' : '店员'})`],
                    ['创建时间', dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')],
                    ['更新时间', dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center px-4 py-2.5 gap-4">
                      <span className="text-xs text-slate-500 w-20 shrink-0">{k}</span>
                      <span className="text-sm text-slate-800 font-medium flex-1 min-w-0 truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield size={12} /> 隐私与安全
                </h3>
                <div className="card !rounded-xl p-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                    order.privacyWiped
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-warn-50 text-warn-600'
                  }`}>
                    {order.privacyWiped ? (
                      <><CheckCircle2 size={16} /> 隐私数据已清除</>
                    ) : (
                      <><AlertTriangle size={16} /> 尚未清除隐私数据</>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {tab === 'check' && (
            <div className="p-5 space-y-4">
              {[
                {
                  title: '屏幕检测', icon: <Camera size={14} />,
                  items: [
                    ['划痕', order.checkResult.screen.scratch],
                    ['碎裂', order.checkResult.screen.crack],
                    ['显示', order.checkResult.screen.display],
                  ],
                  remark: order.checkResult.screen.remark,
                },
                {
                  title: '电池检测', icon: <Battery size={14} />,
                  items: [
                    [`健康度 ${order.checkResult.battery.health}%`, order.checkResult.battery.health >= 85 ? 'pass' : (order.checkResult.battery.health >= 75 ? 'pending' : 'fail') as CheckResult],
                    ['鼓包', order.checkResult.battery.bulge],
                  ],
                  remark: order.checkResult.battery.remark,
                },
                {
                  title: '进水检测', icon: <Droplets size={14} />,
                  items: [['试纸', order.checkResult.water.indicator]],
                  remark: order.checkResult.water.remark,
                },
                {
                  title: '账号检测', icon: <UserCheck size={14} />,
                  items: [['ID已退出', order.checkResult.account.idLoggedOut]],
                  remark: order.checkResult.account.remark,
                },
              ].map((sec) => (
                <div key={sec.title} className="card !rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-brand-600 shadow-sm">
                      {sec.icon}
                    </span>
                    <span className="font-bold text-slate-700 text-sm">{sec.title}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {sec.items.map(([k, v]) => (
                      <div key={k as string} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-slate-600">{k as string}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${checkCls(v as CheckResult)}`}>
                          {checkIcon(v as CheckResult)}
                          {checkText(v as CheckResult)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {sec.remark && (
                    <div className="px-4 pb-4">
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                        <span className="font-medium text-slate-600">备注：</span>
                        {sec.remark}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {order.failReasons && order.failReasons.length > 0 && (
                <div className="card !rounded-xl !border-rose-100 overflow-hidden">
                  <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-rose-500 shadow-sm">
                      <XCircle size={14} />
                    </span>
                    <span className="font-bold text-rose-700 text-sm">不合格原因</span>
                  </div>
                  <ul className="p-4 space-y-2">
                    {order.failReasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50/50 rounded-lg px-3 py-2">
                        <XCircle size={14} className="mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {order.bargainFailRemark && (
                <div className="card !rounded-xl !border-warn-100 p-4 bg-warn-50/50">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-warn-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-warn-700 text-sm">议价失败备注</div>
                      <p className="text-sm text-warn-600 mt-1">{order.bargainFailRemark}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'price' && (
            <div className="p-5 space-y-5">
              <section>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card !rounded-xl p-4">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">初始估价</div>
                    <div className="mt-2"><PriceTag value={order.initialPrice} size="md" /></div>
                  </div>
                  <div className="card !rounded-xl p-4 border-brand-100 bg-gradient-to-br from-brand-50/50 to-white">
                    <div className="text-[10px] text-brand-600 uppercase tracking-wider font-bold">最终成交价</div>
                    <div className="mt-2">
                      {order.finalPrice !== null ? (
                        <PriceTag
                          value={order.finalPrice}
                          size="lg"
                          tone={
                            order.finalPrice > order.initialPrice ? 'up' :
                            order.finalPrice < order.initialPrice ? 'down' : 'default'
                          }
                        />
                      ) : (
                        <span className="text-base text-slate-500 font-medium">—</span>
                      )}
                    </div>
                    {order.finalPrice !== null && order.finalPrice !== order.initialPrice && (
                      <div className={`mt-1.5 text-xs font-medium inline-flex items-center gap-1 ${
                        order.finalPrice > order.initialPrice ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {order.finalPrice > order.initialPrice ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        差额 ¥{Math.abs(order.finalPrice - order.initialPrice).toLocaleString('zh-CN')}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText size={12} /> 议价历史
                </h3>
                {order.priceHistory.length === 0 ? (
                  <div className="card !rounded-xl p-8 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                      <Minus size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">暂无议价记录</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-slate-200" />
                    <div className="space-y-3">
                      {[
                        {
                          id: 'init',
                          price: order.initialPrice,
                          timestamp: order.createdAt,
                          reason: '初始系统估价',
                          operator: order.createdBy,
                          operatorRole: order.createdByRole,
                          type: 'init' as const,
                        },
                        ...order.priceHistory.map((p, i) => ({
                          ...p,
                          type: (p.newPrice > p.oldPrice ? 'up' : p.newPrice < p.oldPrice ? 'down' : 'flat') as 'up' | 'down' | 'flat',
                        })),
                      ].map((p, i, arr) => {
                        const isFirst = i === 0;
                        const isLast = i === arr.length - 1;
                        const diff = isFirst ? 0 : (p as any).newPrice - (p as any).oldPrice;
                        return (
                          <div key={(p as any).id ?? 'init'} className="relative pl-12">
                            <div className={`absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow ${
                              isFirst ? 'bg-slate-500' :
                              (p as any).type === 'up' ? 'bg-emerald-500' :
                              (p as any).type === 'down' ? 'bg-rose-500' : 'bg-slate-400'
                            }`}>
                              {isFirst ? <Minus size={10} /> :
                                (p as any).type === 'up' ? <TrendingUp size={10} /> :
                                (p as any).type === 'down' ? <TrendingDown size={10} /> : <Minus size={10} />}
                            </div>
                            <div className={`card !rounded-xl p-3.5 ${isLast ? '!border-brand-200 bg-brand-50/30' : ''}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <PriceTag
                                  value={isFirst ? (p as any).price : (p as any).newPrice}
                                  size="sm"
                                  tone={isFirst ? 'default' : (p as any).type === 'up' ? 'up' : (p as any).type === 'down' ? 'down' : 'default'}
                                />
                                {!isFirst && diff !== 0 && (
                                  <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {diff > 0 ? '+' : ''}¥{diff.toLocaleString('zh-CN')}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm text-slate-700">{(p as any).reason}</p>
                              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <User size={10} />
                                  {(p as any).operator}
                                  <span className="chip !py-0 !px-1.5 !text-[9px] bg-slate-100 text-slate-500">
                                    {(p as any).operatorRole === 'manager' ? '店长' : '店员'}
                                  </span>
                                </span>
                                <span className="font-mono tabular-nums">
                                  {dayjs((p as any).timestamp).format('MM-DD HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'logs' && (
            <div className="p-5">
              {order.logs.length === 0 ? (
                <div className="card !rounded-xl p-8 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Clock size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">暂无操作日志</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-200 via-slate-200 to-slate-100" />
                  <div className="space-y-3">
                    {order.logs.slice().reverse().map((log) => (
                      <div key={log.id} className="relative pl-12">
                        <div className="absolute left-2.5 w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-soft">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="card !rounded-xl p-3.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800">{log.action}</span>
                            <span className="chip !py-0.5 !px-2 !text-[10px] bg-brand-50 text-brand-600">
                              {log.operatorRole === 'manager' ? '店长' : '店员'}
                            </span>
                          </div>
                          {log.detail && (
                            <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                              {log.detail}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <User size={10} />
                              {log.operator}
                            </span>
                            <span className="font-mono tabular-nums inline-flex items-center gap-1">
                              <Clock size={10} />
                              {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              关闭
            </button>
            <button
              onClick={() => navigate(`/detail/${order.id}`)}
              className="btn-secondary flex-1"
            >
              <ExternalLink size={15} />
              独立页面
            </button>
            <button
              onClick={() => navigate(`/register/${order.id}`)}
              className="btn-primary flex-1"
            >
              <Edit3 size={15} />
              编辑订单
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
