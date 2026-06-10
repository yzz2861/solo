import { useState } from 'react';
import type { Order, WashStep, AddonConfig, Worker, AddAddonRequest } from '../../../shared/types';
import { WASH_STEP_LABELS, WASH_STEPS } from '../../../shared/types';
import { ChevronRight, Plus, DollarSign, Undo2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { ConfirmModal } from '../ConfirmModal';
import { orderApi, addonConfigApi, workerApi } from '../../lib/services';
import clsx from 'clsx';
import { useEffect } from 'react';

interface OrderDetailPanelProps {
  order: Order | null;
  onRefresh: () => void;
}

export function OrderDetailPanel({ order, onRefresh }: OrderDetailPanelProps) {
  const [addonConfigs, setAddonConfigs] = useState<AddonConfig[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newAddon, setNewAddon] = useState<AddAddonRequest | null>(null);
  const [adjustPrice, setAdjustPrice] = useState<number | null>(null);
  const [adjustReason, setAdjustReason] = useState('');
  const { showToast } = useAppStore();

  useEffect(() => {
    addonConfigApi.getList().then(setAddonConfigs);
    workerApi.getList().then(setWorkers);
  }, []);

  if (!order) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-slate-300" />
        </div>
        <p className="text-slate-500">从左侧队列选择订单</p>
        <p className="text-slate-400 text-sm mt-1">查看详情、更新进度、录入加项</p>
      </div>
    );
  }

  const isDone = order.status === 'done' || order.status === 'cancelled';
  const unpaidAddons = order.addons.filter((a) => !a.paid);

  const handleNextStep = async () => {
    const currentIdx = WASH_STEPS.indexOf(order.currentStep);
    if (currentIdx >= WASH_STEPS.length - 1) return;

    if (order.currentStep === 'drying') {
      if (unpaidAddons.length > 0) {
        showToast('warning', `还有 ${unpaidAddons.length} 项加项未付款，请先确认收款`);
        return;
      }
    }

    const nextStep = WASH_STEPS[currentIdx + 1];
    try {
      await orderApi.update(order.id, { currentStep: nextStep });
      showToast('success', `已更新到：${WASH_STEP_LABELS[nextStep]}`);
      onRefresh();
    } catch {
      showToast('error', '更新失败');
    }
  };

  const handleSetStep = async (step: WashStep) => {
    try {
      await orderApi.update(order.id, { currentStep: step });
      showToast('success', `已更新到：${WASH_STEP_LABELS[step]}`);
      onRefresh();
    } catch {
      showToast('error', '更新失败');
    }
  };

  const handleAssignWorker = async (workerId: string) => {
    try {
      await orderApi.update(order.id, { workerId });
      showToast('success', '已分配洗车工');
      onRefresh();
    } catch {
      showToast('error', '分配失败');
    }
  };

  const handleAddAddon = async (config: AddonConfig) => {
    const price = adjustPrice ?? config.defaultPrice;
    const data: AddAddonRequest = {
      name: config.name,
      price,
      originalPrice: config.defaultPrice,
      priceAdjustReason: adjustReason || undefined,
    };
    try {
      await orderApi.addAddon(order.id, data);
      showToast('success', `已添加：${config.name}`);
      setNewAddon(null);
      setAdjustPrice(null);
      setAdjustReason('');
      onRefresh();
    } catch {
      showToast('error', '添加失败');
    }
  };

  const handleMarkPaid = async (addonId: string) => {
    try {
      await orderApi.markAddonPaid(order.id, addonId);
      showToast('success', '已确认收款');
      onRefresh();
    } catch {
      showToast('error', '操作失败');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showToast('warning', '请填写撤销原因');
      return;
    }
    try {
      await orderApi.cancel(order.id, { cancelReason, cancelledBy: '前台' });
      showToast('success', '已撤销核销，套餐已退回');
      setShowCancelModal(false);
      setCancelReason('');
      onRefresh();
    } catch {
      showToast('error', '撤销失败');
    }
  };

  const totalAddon = order.addons.filter((a) => a.paid).reduce((s, a) => s + a.price, 0);

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden flex flex-col h-full">
      <div className={clsx(
        'p-5 border-b',
        order.status === 'cancelled' ? 'bg-red-50 border-red-100' :
        order.status === 'done' ? 'bg-green-50 border-green-100' : 'bg-brand-50 border-brand-100'
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand text-white font-bold text-xl">
              #{order.queueNumber}
            </span>
            <div>
              <div className="text-2xl font-bold text-slate-900">{order.plateNumber}</div>
              <div className="text-sm text-slate-500">
                {order.memberName ? `${order.memberName} · ` : ''}
                {order.packageName || (order.payType === 'cash' ? '现金洗车' : '')}
              </div>
            </div>
          </div>
          <span className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium',
            order.status === 'queued' && 'bg-slate-100 text-slate-700',
            order.status === 'washing' && 'bg-blue-100 text-blue-700',
            order.status === 'done' && 'bg-green-100 text-green-700',
            order.status === 'cancelled' && 'bg-red-100 text-red-700'
          )}>
            {order.status === 'queued' && '排队中'}
            {order.status === 'washing' && '清洗中'}
            {order.status === 'done' && '已完成'}
            {order.status === 'cancelled' && '已撤销'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>创建：{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
          {order.completedAt && <span>完成：{new Date(order.completedAt).toLocaleString('zh-CN')}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">清洗进度</h3>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {WASH_STEPS.map((step, idx) => {
              const isActive = step === order.currentStep;
              const isPast = WASH_STEPS.indexOf(order.currentStep) > idx;
              return (
                <button
                  key={step}
                  onClick={() => !isDone && handleSetStep(step)}
                  disabled={isDone}
                  className={clsx(
                    'flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap',
                    isActive && 'bg-brand text-white border-brand shadow-md',
                    isPast && !isActive && 'bg-green-50 text-green-700 border-green-200',
                    !isActive && !isPast && 'bg-slate-50 text-slate-400 border-slate-200',
                    !isDone && 'cursor-pointer hover:shadow'
                  )}
                >
                  {isPast && !isActive ? '✓ ' : ''}{WASH_STEP_LABELS[step]}
                </button>
              );
            })}
          </div>
          {!isDone && order.currentStep !== 'done' && (
            <button
              onClick={handleNextStep}
              className="mt-3 w-full py-2.5 bg-brand text-white rounded-xl font-medium hover:bg-brand-light transition-colors flex items-center justify-center gap-2"
            >
              进入下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">洗车工</h3>
          {order.workerName ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="font-medium text-slate-900">{order.workerName}</span>
              {!isDone && (
                <select
                  defaultValue={order.workerId}
                  onChange={(e) => handleAssignWorker(e.target.value)}
                  className="text-sm px-2 py-1 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">更换</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            !isDone && (
              <select
                value=""
                onChange={(e) => handleAssignWorker(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:border-brand"
              >
                <option value="">点击分配洗车工</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">加项服务</h3>
            {!isDone && (
              <button
                onClick={() => setNewAddon(newAddon ? null : { name: '', price: 0, originalPrice: 0 })}
                className="text-xs text-brand font-medium flex items-center gap-1 hover:text-brand-light"
              >
                <Plus className="w-3.5 h-3.5" />
                新增加项
              </button>
            )}
          </div>

          {newAddon && (
            <div className="mb-3 p-4 bg-orange-50 rounded-xl border border-orange-200 animate-fade-in space-y-3">
              <div>
                <label className="block text-xs font-medium text-orange-800 mb-1">选择加项</label>
                <select
                  value={newAddon.name}
                  onChange={(e) => {
                    const cfg = addonConfigs.find((c) => c.name === e.target.value);
                    setNewAddon({
                      name: e.target.value,
                      price: cfg?.defaultPrice || 0,
                      originalPrice: cfg?.defaultPrice || 0,
                    });
                    setAdjustPrice(cfg?.defaultPrice || null);
                  }}
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white text-sm focus:outline-none focus:border-orange-400"
                >
                  <option value="">请选择...</option>
                  {addonConfigs.map((c) => (
                    <option key={c.id} value={c.name}>{c.name} (¥{c.defaultPrice})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-orange-800 mb-1">实收价格</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                  <input
                    type="number"
                    value={adjustPrice ?? ''}
                    onChange={(e) => setAdjustPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-orange-200 rounded-lg bg-white text-sm font-bold focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              {adjustPrice !== null && newAddon.originalPrice > 0 && adjustPrice !== newAddon.originalPrice && (
                <div>
                  <label className="block text-xs font-medium text-orange-800 mb-1">改价原因 (必填)</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="例如：熟客优惠、活动折扣"
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white text-sm focus:outline-none focus:border-orange-400"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const cfg = addonConfigs.find((c) => c.name === newAddon.name);
                    if (cfg) handleAddAddon(cfg);
                  }}
                  disabled={!newAddon.name || (adjustPrice !== newAddon.originalPrice && newAddon.originalPrice > 0 && !adjustReason.trim())}
                  className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认添加
                </button>
                <button
                  onClick={() => {
                    setNewAddon(null);
                    setAdjustPrice(null);
                    setAdjustReason('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {order.addons.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">暂无加项服务</p>
          ) : (
            <div className="space-y-2">
              {order.addons.map((a) => (
                <div key={a.id} className={clsx(
                  'p-3 rounded-xl border',
                  a.paid ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-200'
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{a.name}</span>
                    <span className="text-lg font-bold text-slate-900">¥{a.price}</span>
                  </div>
                  {a.price !== a.originalPrice && (
                    <div className="text-xs text-slate-500 mb-1">
                      原价 ¥{a.originalPrice} · 改价原因：{a.priceAdjustReason || '未填'}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{new Date(a.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                    {a.paid ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 已收款
                      </span>
                    ) : !isDone ? (
                      <button
                        onClick={() => handleMarkPaid(a.id)}
                        className="text-amber-700 font-medium flex items-center gap-1 hover:text-amber-800"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> 确认收款
                      </button>
                    ) : (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> 未收款
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">费用明细</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">洗车</span>
              <span className="font-medium">
                {order.payType === 'member'
                  ? `会员扣${order.packageDeducted}次${order.cashAmount ? ` (¥${order.cashAmount})` : ''}`
                  : `¥${order.cashAmount || 0}`}
              </span>
            </div>
            {order.addons.length > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">加项服务（{order.addons.filter(a => a.paid).length}/{order.addons.length}已收）</span>
                <span className="font-medium">¥{totalAddon}</span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between">
              <span className="font-semibold text-slate-900">实收合计</span>
              <span className="text-xl font-bold text-brand">
                ¥{totalAddon + (order.payType === 'cash' ? (order.cashAmount || 0) : (order.cashAmount || 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-2.5 text-red-600 bg-red-50 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Undo2 className="w-4 h-4" />
            撤销核销
          </button>
        </div>
      )}

      {order.status === 'cancelled' && order.cancelReason && (
        <div className="p-4 bg-red-50 border-t border-red-100">
          <div className="text-xs text-red-600">
            撤销原因：<span className="font-medium">{order.cancelReason}</span>
          </div>
          <div className="text-xs text-red-500 mt-1">
            操作人：{order.cancelledBy} · {order.cancelledAt && new Date(order.cancelledAt).toLocaleString('zh-CN')}
          </div>
        </div>
      )}

      <ConfirmModal
        open={showCancelModal}
        title="撤销核销确认"
        message={`确定要撤销车牌号 ${order.plateNumber} 的核销单吗？\n\n套餐次数将被退回，数据不可恢复。`}
        confirmText="确认撤销"
        confirmVariant="danger"
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
      />
      {showCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="relative pointer-events-auto mt-40 bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">撤销原因（必填）</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="例如：车牌输入错误、客户临时不洗了"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
