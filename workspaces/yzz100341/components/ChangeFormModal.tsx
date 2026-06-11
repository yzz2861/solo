'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Bus, MapPin, Calendar, User } from 'lucide-react';
import { cn, todayStr } from '@/lib/utils';
import { useRoutes, useCreateChange, type Student } from '@/hooks/useApi';

type ChangeFormModalProps = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: () => void;
};

export function ChangeFormModal({ open, onClose, student, onSuccess }: ChangeFormModalProps) {
  const [date, setDate] = useState(todayStr());
  const [newRouteId, setNewRouteId] = useState('');
  const [newStopId, setNewStopId] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: routes, isLoading: routesLoading } = useRoutes({ revalidateOnFocus: false });
  const { trigger: createChange, isMutating } = useCreateChange({
    onSuccess: () => {
      setSuccessMsg('变更申请已提交成功！');
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess?.();
        handleClose();
      }, 1200);
    },
    onError: (err) => {
      setFormError(err.message || '提交失败，请稍后重试');
    },
  });

  const selectedRoute = useMemo(
    () => routes?.find((r) => r.id === newRouteId),
    [routes, newRouteId]
  );

  useEffect(() => {
    if (open) {
      setDate(todayStr());
      setNewRouteId('');
      setNewStopId('');
      setReason('');
      setFormError('');
      setSuccessMsg('');
    }
  }, [open, student]);

  useEffect(() => {
    setNewStopId('');
  }, [newRouteId]);

  function handleClose() {
    if (!isMutating) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!student) {
      setFormError('请选择学生');
      return;
    }
    if (!date) {
      setFormError('请选择日期');
      return;
    }
    if (!newRouteId) {
      setFormError('请选择新线路');
      return;
    }
    if (!newStopId) {
      setFormError('请选择新站点');
      return;
    }

    await createChange({
      studentId: student.id,
      date,
      newRouteId,
      newStopId,
      reason: reason.trim() || undefined,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-brand-orange to-brand-orange-dark px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">发起上车点变更</h2>
            <p className="text-white/80 text-sm mt-0.5">选择新的线路和站点</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isMutating}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          {student && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-brand-navy">{student.name}</p>
                  <p className="text-sm text-slate-500">
                    {student.studentNo} · {student.class.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Calendar className="w-4 h-4 text-brand-orange" />
              变更日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayStr()}
              disabled={isMutating}
              className={cn(
                'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white',
                'text-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange',
                'transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Bus className="w-4 h-4 text-brand-orange" />
              新线路
            </label>
            <select
              value={newRouteId}
              onChange={(e) => setNewRouteId(e.target.value)}
              disabled={isMutating || routesLoading}
              className={cn(
                'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white',
                'text-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange',
                'transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
              required
            >
              <option value="">请选择线路</option>
              {routes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}（{r.plateNo}）
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <MapPin className="w-4 h-4 text-brand-orange" />
              新站点
            </label>
            <select
              value={newStopId}
              onChange={(e) => setNewStopId(e.target.value)}
              disabled={isMutating || !selectedRoute}
              className={cn(
                'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white',
                'text-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange',
                'transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
              required
            >
              <option value="">
                {selectedRoute ? '请选择站点' : '请先选择线路'}
              </option>
              {selectedRoute?.stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">变更原因（可选）</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请简要说明变更原因..."
              rows={3}
              disabled={isMutating}
              className={cn(
                'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white resize-none',
                'text-slate-900 placeholder-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange',
                'transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            />
          </div>

          {formError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 animate-fade-in-up">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{formError}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 animate-fade-in-up">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-600">{successMsg}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isMutating}
              className={cn(
                'flex-1 py-3 rounded-xl font-medium text-slate-600',
                'bg-slate-100 hover:bg-slate-200',
                'transition-colors',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className={cn(
                'flex-1 py-3 rounded-xl font-semibold text-white',
                'bg-gradient-to-r from-brand-orange to-brand-orange-dark',
                'hover:from-brand-orange-dark hover:to-[#D15A25]',
                'shadow-lg shadow-brand-orange/30 hover:shadow-brand-orange/40',
                'transform hover:-translate-y-0.5 active:translate-y-0',
                'transition-all duration-200',
                'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0',
                'flex items-center justify-center gap-2'
              )}
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交申请'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
