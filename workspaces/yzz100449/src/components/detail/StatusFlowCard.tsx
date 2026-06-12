import { useState } from 'react';
import {
  GitBranch,
  ArrowRightCircle,
  Package,
  PackageCheck,
  Store,
  XOctagon,
  Handshake,
  Clock,
  UserCircle2,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Lock,
  Logs,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import type { RecycleOrder, RecycleStatus } from '../../types';
import { STATUS_LABEL, STATUS_COLOR } from '../../types';
import { canTransition } from '../../utils/transition';
import { useRecycleStore } from '../../store/useRecycleStore';
import { useAuthStore } from '../../store/useAuthStore';
import StatusBadge from '../common/StatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';

interface Props {
  order: RecycleOrder;
}

const STATUS_FLOW: Array<{ status: RecycleStatus; label: string; icon: any }> = [
  { status: 'pending_in', label: '待入库', icon: Package },
  { status: 'in_stock', label: '已入库', icon: PackageCheck },
  { status: 'on_shelf', label: '已上架', icon: Store },
];

const TERMINAL_STATUSES: Array<{ status: RecycleStatus; label: string; icon: any; danger?: boolean }> = [
  { status: 'returned', label: '已退回', icon: XOctagon, danger: true },
  { status: 'bargain_fail', label: '议价失败', icon: Handshake, danger: true },
];

const TRANSITION_LABELS: Record<string, string> = {
  'pending_in->in_stock': '确认入库',
  'in_stock->on_shelf': '商品上架',
  'pending_in->bargain_fail': '标记议价失败',
  'in_stock->returned': '退回商品',
  'on_shelf->returned': '退回商品',
};

export default function StatusFlowCard({ order }: Props) {
  const changeStatus = useRecycleStore((s) => s.changeStatus);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [pendingStatus, setPendingStatus] = useState<RecycleStatus | null>(null);
  const [showError, setShowError] = useState<string | null>(null);
  const [expandLogs, setExpandLogs] = useState(false);

  const availableTransitions: RecycleStatus[] = [];
  if (order.status === 'pending_in') {
    availableTransitions.push('in_stock', 'bargain_fail');
  } else if (order.status === 'in_stock') {
    availableTransitions.push('on_shelf', 'returned');
  } else if (order.status === 'on_shelf') {
    availableTransitions.push('returned');
  }

  const currentFlowIdx = STATUS_FLOW.findIndex((s) => s.status === order.status);
  const isTerminal = ['returned', 'bargain_fail'].includes(order.status);

  const handleTransitionClick = (toStatus: RecycleStatus) => {
    setShowError(null);
    const result = canTransition(order.status, toStatus, order);
    if (!result.ok) {
      setShowError(result.reason);
      return;
    }
    setPendingStatus(toStatus);
  };

  const handleConfirmTransition = () => {
    if (!pendingStatus || !currentUser) return;
    const toStatus = pendingStatus;
    const actionLabel = TRANSITION_LABELS[`${order.status}->${toStatus}`] || '状态变更';
    changeStatus(order.id, toStatus, {
      action: actionLabel,
      operator: currentUser.name,
      operatorRole: currentUser.role,
      detail: `${STATUS_LABEL[order.status]} → ${STATUS_LABEL[toStatus]}`,
    });
    setPendingStatus(null);
  };

  const previewTransition = (toStatus: RecycleStatus) => {
    return canTransition(order.status, toStatus, order);
  };

  const visibleLogs = expandLogs ? order.logs : order.logs.slice(-5);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-soft">
            <GitBranch size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">状态流转</h3>
            <p className="text-xs text-slate-500 mt-0.5">当前状态 · 可用操作 · 操作日志</p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6">
        <div className="text-[11px] text-slate-500 mb-3 font-medium">📦 正常流转路径</div>
        <div className="flex items-stretch gap-2">
          {STATUS_FLOW.map((step, idx) => {
            const StepIcon = step.icon;
            const isReached = currentFlowIdx >= idx;
            const isCurrent = currentFlowIdx === idx;
            return (
              <div key={step.status} className="flex-1 flex items-stretch">
                <div
                  className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                    isCurrent
                      ? 'border-brand-500 bg-brand-50 shadow-soft'
                      : isReached
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? 'bg-brand-600 text-white'
                          : isReached
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isReached && !isCurrent ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <StepIcon size={14} />
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-brand-700'
                          : isReached
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded-full overflow-hidden bg-slate-200 ${
                      isReached ? '' : 'opacity-40'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-brand-400 to-brand-600 w-1/2 animate-pulse-slow'
                          : isReached
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 w-full'
                            : 'w-0'
                      }`}
                    />
                  </div>
                </div>
                {idx < STATUS_FLOW.length - 1 && (
                  <div className="flex items-center px-1 text-slate-300">
                    <ArrowRightCircle size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="text-[11px] text-slate-500 font-medium">⚠️ 异常状态</div>
          <div className="flex gap-2">
            {TERMINAL_STATUSES.map((step) => {
              const StepIcon = step.icon;
              const isActive = order.status === step.status;
              return (
                <div
                  key={step.status}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 ${
                    isActive
                      ? step.danger
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 bg-slate-50/50 opacity-60'
                  }`}
                >
                  <StepIcon
                    size={14}
                    className={
                      isActive
                        ? step.danger
                          ? 'text-rose-600'
                          : 'text-amber-600'
                        : 'text-slate-400'
                    }
                  />
                  <span
                    className={`text-xs font-bold ${
                      isActive
                        ? step.danger
                          ? 'text-rose-700'
                          : 'text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="chip bg-white/80 border border-slate-200 text-[10px] text-slate-500">
                      终态
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-brand-700" />
            <span className="text-sm font-bold text-slate-800">强制校验规则</span>
          </div>
          {isTerminal && (
            <span className="chip bg-slate-200 text-slate-600 text-[11px]">
              <Lock size={11} /> 已锁定，不可变更
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg ${
              order.checkResult.account.idLoggedOut === 'pass'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {order.checkResult.account.idLoggedOut === 'pass' ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            <span className="font-medium">Apple ID / 账号锁已退出</span>
            <span className="ml-auto text-[10px] opacity-80">入库必需</span>
          </div>
          <div
            className={`flex items-center gap-2 p-2 rounded-lg ${
              order.privacyWiped
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {order.privacyWiped ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            <span className="font-medium">隐私数据已清除</span>
            <span className="ml-auto text-[10px] opacity-80">入库/上架必需</span>
          </div>
        </div>
      </div>

      {showError && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3 animate-pulse-slow">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-rose-700 text-sm">状态变更被阻止</div>
            <div className="text-xs text-rose-600 mt-1">{showError}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowError(null)}
            className="text-rose-400 hover:text-rose-600 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {!isTerminal && availableTransitions.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] text-slate-500 mb-2.5 font-medium">🚀 可用操作</div>
          <div className="flex flex-wrap gap-2.5">
            {availableTransitions.map((toStatus) => {
              const result = previewTransition(toStatus);
              const label = TRANSITION_LABELS[`${order.status}->${toStatus}`] || `转为 ${STATUS_LABEL[toStatus]}`;
              const isDanger = ['returned', 'bargain_fail'].includes(toStatus);
              const canDo = result.ok;
              return (
                <button
                  key={toStatus}
                  type="button"
                  disabled={!canDo}
                  onClick={() => handleTransitionClick(toStatus)}
                  className={`btn ${
                    isDanger
                      ? canDo
                        ? 'btn-danger'
                        : 'bg-white text-danger-400 border-2 border-danger-200 opacity-50 cursor-not-allowed'
                      : canDo
                        ? 'btn-primary'
                        : 'bg-brand-50 text-brand-400 border-2 border-brand-200 opacity-50 cursor-not-allowed'
                  }`}
                  title={!canDo ? result.reason : undefined}
                >
                  <ArrowRightCircle size={16} />
                  {label}
                  {!canDo && <Lock size={14} />}
                </button>
              );
            })}
          </div>
          {availableTransitions.some((t) => !previewTransition(t).ok) && (
            <div className="mt-2.5 text-[11px] text-slate-500">
              💡 置灰按钮表示当前不满足前置条件，鼠标悬停可查看原因
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t-2 border-slate-100">
        <button
          type="button"
          onClick={() => setExpandLogs((v) => !v)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Logs size={16} className="text-brand-700" />
            <span className="text-sm font-bold text-slate-800">操作日志</span>
            <span className="chip bg-brand-50 text-brand-700 text-[11px]">
              {order.logs.length} 条
            </span>
          </div>
          {expandLogs ? (
            <ChevronUp size={18} className="text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-400" />
          )}
        </button>

        {expandLogs && order.logs.length > 5 && (
          <div className="mt-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-700 flex items-center gap-1.5">
            <AlertCircle size={12} />
            仅展示最近 5 条记录，已展开查看全部
          </div>
        )}

        <div className="mt-2 relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-100 via-slate-100 to-slate-50 rounded-full" />
          <div className="space-y-0">
            {[...visibleLogs].reverse().map((log, idx) => {
              const isFirst = idx === 0;
              return (
                <div key={log.id} className="relative flex gap-3 py-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-card ${
                      isFirst
                        ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    <Clock size={13} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span
                        className={`text-sm font-bold ${
                          isFirst ? 'text-brand-700' : 'text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {dayjs(log.timestamp).format('MM-DD HH:mm:ss')}
                      </span>
                    </div>
                    {log.detail && (
                      <div className="mt-1 text-xs text-slate-500 flex items-start gap-1.5">
                        <FileText size={11} className="mt-0.5 shrink-0" />
                        {log.detail}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <UserCircle2 size={11} />
                      {log.operator}
                      <span
                        className={`chip text-[10px] py-0 ${
                          log.operatorRole === 'manager'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {log.operatorRole === 'manager' ? '店长' : '员工'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        title="确认状态变更"
        onClose={() => setPendingStatus(null)}
        onConfirm={handleConfirmTransition}
        confirmText={
          TRANSITION_LABELS[`${order.status}->${pendingStatus}`] || '确认变更'
        }
        cancelText="取消"
        confirmTone={
          ['returned', 'bargain_fail'].includes(pendingStatus!) ? 'danger' : 'primary'
        }
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-50">
            <span className={`chip ${STATUS_COLOR[order.status]} px-3 py-1.5 text-xs`}>
              {STATUS_LABEL[order.status]}
            </span>
            <ArrowRightCircle size={22} className="text-brand-600" />
            <span
              className={`chip px-3 py-1.5 text-xs ${
                pendingStatus ? STATUS_COLOR[pendingStatus] : ''
              }`}
            >
              {pendingStatus && STATUS_LABEL[pendingStatus]}
            </span>
          </div>
          <p className="text-slate-600">
            确定要将此订单状态从「
            <span className="font-bold text-slate-800">{STATUS_LABEL[order.status]}</span>
            」变更为「
            <span className="font-bold text-brand-700">
              {pendingStatus && STATUS_LABEL[pendingStatus]}
            </span>
            」吗？
          </p>
          {pendingStatus && ['returned', 'bargain_fail'].includes(pendingStatus) && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>此操作为终态操作，变更后将无法再转回正常流转状态，请谨慎操作！</span>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
