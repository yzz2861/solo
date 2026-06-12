import { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import { categoryEmoji, claimColor, claimLabel, currency, formatDateTime } from '@/components/ui/helpers';
import type { ClaimStatus } from '../../shared/types.js';

export default function ApprovalsPage() {
  const { claims, loadClaims, resolveClaim, showToast } = useRentalStore();
  const [filter, setFilter] = useState<ClaimStatus | 'all'>('all');
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const filtered = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  async function handleResolve(id: number, decision: 'approved' | 'rejected') {
    setProcessing(id);
    try {
      await resolveClaim(id, decision, '店长');
      showToast('success', decision === 'approved' ? '已通过赔损申请' : '已驳回赔损申请');
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setProcessing(null);
    }
  }

  const counts = {
    all: claims.length,
    pending: claims.filter((c) => c.status === 'pending').length,
    approved: claims.filter((c) => c.status === 'approved').length,
    rejected: claims.filter((c) => c.status === 'rejected').length,
  };

  return (
    <div className="space-y-5">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-4 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === s
                ? s === 'pending'
                  ? 'bg-ember-500 text-white shadow-soft'
                  : s === 'approved'
                  ? 'bg-forest-700 text-white shadow-soft'
                  : s === 'rejected'
                  ? 'bg-bark-600 text-white shadow-soft'
                  : 'bg-bark-700 text-white shadow-soft'
                : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
            }`}
          >
            {s === 'all' ? '全部' : claimLabel[s]}
            <span className="ml-1.5 opacity-85">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/70 rounded-2xl border border-cream-200 p-16 text-center text-bark-400">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {filter === 'pending' ? '暂无待审批赔损单 🎉' : '暂无相关记录'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft overflow-hidden hover:shadow-card transition-shadow animate-fade-in-up"
            >
              <div
                className={`h-1 ${
                  c.status === 'pending'
                    ? 'bg-ember-500'
                    : c.status === 'approved'
                    ? 'bg-forest-600'
                    : 'bg-bark-400'
                }`}
              />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-ember-50 flex items-center justify-center text-xl">
                      {c.equipment ? categoryEmoji[c.equipment.category] : '📦'}
                    </div>
                    <div>
                      <div className="font-semibold text-bark-800">
                        {c.equipment?.name || '装备 #' + c.equipmentId}
                      </div>
                      <div className="text-xs text-bark-400 mt-0.5">
                        赔损单 #{c.id} · 提交于 {formatDateTime(c.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${
                      claimColor[c.status]
                    }`}
                  >
                    {c.status === 'pending' && <Clock className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {c.status === 'approved' && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {c.status === 'rejected' && <XCircle className="inline w-3 h-3 mr-1 -mt-0.5" />}
                    {claimLabel[c.status]}
                  </span>
                </div>

                {c.rental && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bark-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {c.rental.renterName} · {c.rental.renterPhone}
                    </span>
                    <span className="text-rose-600 font-semibold text-sm">
                      {currency(c.amount)}
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>{c.description}</span>
                  </div>
                </div>

                {c.status === 'pending' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleResolve(c.id, 'approved')}
                      disabled={processing === c.id}
                      className="flex-1 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      通过扣款 {currency(c.amount)}
                    </button>
                    <button
                      onClick={() => handleResolve(c.id, 'rejected')}
                      disabled={processing === c.id}
                      className="px-5 py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-bark-700 text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      驳回
                    </button>
                  </div>
                ) : (
                  <div className="pt-1 text-xs text-bark-500 border-t border-cream-100 pt-3">
                    由 <span className="font-medium text-bark-700">{c.approvedBy}</span> 于{' '}
                    {formatDateTime(c.approvedAt)} 处理
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
