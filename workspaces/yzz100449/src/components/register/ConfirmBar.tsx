import { useState } from 'react';
import type { RecycleOrder } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useRecycleStore } from '../../store/useRecycleStore';
import { canTransition, isCheckCompleted, getFailReasons } from '../../utils/transition';
import { ShieldAlert, Eraser, PackageCheck, XOctagon, AlertTriangle, Printer } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';
import NoticeSheetModal from './NoticeSheetModal';

interface Props {
  order: RecycleOrder;
  onNavigateList: () => void;
}

export default function ConfirmBar({ order, onNavigateList }: Props) {
  const user = useAuthStore((s) => s.currentUser)!;
  const update = useRecycleStore((s) => s.updateOrder);
  const changeStatus = useRecycleStore((s) => s.changeStatus);

  const [dlg, setDlg] = useState<null | 'in' | 'fail'>(null);
  const [bargainRemark, setBargainRemark] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);

  const accountOk = order.checkResult.account.idLoggedOut === 'pass';
  const checkDone = isCheckCompleted(order.checkResult);
  const tInStock = canTransition('pending_in', 'in_stock', { ...order, privacyWiped: true });

  const doInStock = () => {
    if (!tInStock.ok) return alert(tInStock.reason);
    const fail = getFailReasons(order.checkResult);
    changeStatus(order.id, 'in_stock', {
      action: '入库完成',
      operator: user.name,
      operatorRole: user.role,
      detail: `成交价 ¥${order.finalPrice ?? order.initialPrice}`,
    });
    update(order.id, { failReasons: fail });
    setDlg(null);
    setTimeout(onNavigateList, 300);
  };

  const doBargainFail = () => {
    const fail = getFailReasons(order.checkResult);
    if (fail.length === 0 && !bargainRemark.trim())
      return alert('请至少勾选不通过项或填写议价失败原因');
    changeStatus(order.id, 'bargain_fail', {
      action: '议价失败，未成交',
      operator: user.name,
      operatorRole: user.role,
      detail: bargainRemark.trim() || undefined,
    });
    update(order.id, {
      bargainFailRemark: bargainRemark.trim() || undefined,
      failReasons: fail.length ? fail : undefined,
    });
    setDlg(null);
    setBargainRemark('');
    setNoticeOpen(true);
  };

  return (
    <>
      <div className="card p-6 sticky bottom-6 z-10 mt-6 border-2 border-slate-200 shadow-soft bg-gradient-to-br from-white to-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
            checkDone ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              checkDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}><ShieldAlert size={18} /></div>
            <div className="flex-1">
              <div className={`font-bold text-sm ${checkDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                检测项完成度
              </div>
              <div className="text-xs mt-0.5 text-slate-600">
                {checkDone ? '四项检测均已判定' : '仍有检测项待判定'}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${
            accountOk ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              accountOk ? 'bg-emerald-500 text-white' : 'bg-danger-500 text-white animate-pulse-slow'
            }`}><PackageCheck size={18} /></div>
            <div className="flex-1">
              <div className={`font-bold text-sm ${accountOk ? 'text-emerald-700' : 'text-danger-700'}`}>
                账号锁状态
              </div>
              <div className="text-xs mt-0.5 text-slate-600">
                {accountOk ? 'Apple ID / 账号已退出 ✓' : '⚠️ 未退出 → 禁止入库'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-start gap-3">
            <label className="cursor-pointer flex items-start gap-3 flex-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                order.privacyWiped ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}><Eraser size={18} /></div>
              <div className="flex-1 flex items-center gap-2">
                <input type="checkbox" checked={order.privacyWiped}
                  onChange={(e) => update(order.id, { privacyWiped: e.target.checked })}
                  className="w-5 h-5 accent-brand-600 rounded" />
                <div>
                  <div className="font-bold text-sm text-slate-700">隐私数据已清除确认</div>
                  <div className="text-xs text-slate-500 mt-0.5">恢复出厂 / 格式化 SD 卡</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {!tInStock.ok && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            <span><b>入库前置未通过：</b>{tInStock.reason}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-between items-center">
          <button type="button" onClick={() => setNoticeOpen(true)} className="btn-secondary">
            <Printer size={16} /> 预览检测告知单
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDlg('fail')} className="btn-danger">
              <XOctagon size={16} /> 议价失败 / 未成交
            </button>
            <button
              type="button"
              disabled={!tInStock.ok || !order.brand || !order.model || !order.serialNumber || !order.initialPrice}
              onClick={() => setDlg('in')}
              className="btn-primary min-w-[180px]"
              title={tInStock.ok ? '' : tInStock.reason}
            >
              <PackageCheck size={18} /> 确认入库
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog open={dlg === 'in'} title="确认入库此回收单？" onClose={() => setDlg(null)}
        onConfirm={doInStock} confirmText="确认入库" confirmTone="primary">
        <div className="space-y-2 text-sm">
          <p>机型：<b>{order.brand} {order.model}</b>（{order.storage} / {order.color}）</p>
          <p>序列号：<code className="font-mono bg-slate-100 px-2 py-0.5 rounded">{order.serialNumber}</code></p>
          <p>成交价：<b className="text-brand-700">¥{(order.finalPrice ?? order.initialPrice).toLocaleString()}</b></p>
          <p className="pt-2 text-slate-500 border-t border-slate-100">
            入库后状态变为「已入库（待上架）」，店长可在工作台审核上架。
          </p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog open={dlg === 'fail'} title="议价失败 / 未成交留档" onClose={() => setDlg(null)}
        onConfirm={doBargainFail} confirmText="保存留档" confirmTone="danger">
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-rose-50 text-sm text-rose-700 border border-rose-200">
            未成交订单将永久保留检测记录与价格历史，用于后续数据分析。
          </div>
          <div>
            <label className="label">议价失败原因（选填）</label>
            <textarea rows={3} value={bargainRemark} onChange={(e) => setBargainRemark(e.target.value)}
              placeholder="例：顾客心理价位与最终报价差距过大，协商无果" className="input resize-none" />
          </div>
          <p className="text-xs text-slate-500">确认后将自动生成「检测不通过告知单」供顾客查看/打印。</p>
        </div>
      </ConfirmDialog>

      {noticeOpen && (
        <NoticeSheetModal order={order} onClose={() => { setNoticeOpen(false); onNavigateList(); }} />
      )}
    </>
  );
}
