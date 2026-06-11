'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus,
  Calendar,
  Check,
  X,
  Printer,
  ArrowRight,
  Loader2,
  CheckCheck,
  User,
} from 'lucide-react';
import { cn, todayStr, formatDateTime, ROLE_LABEL } from '@/lib/utils';
import { ChangeStatusBadge } from '@/components/ChangeStatusBadge';
import type { SessionUser } from '@/lib/auth';

interface BusRouteInfo {
  id: string;
  name: string;
  plateNo: string;
}

interface StudentInfo {
  id: string;
  name: string;
}

interface StopInfo {
  id: string;
  name: string;
}

interface ChangeItem {
  id: string;
  studentId: string;
  student: StudentInfo;
  date: string;
  originalRouteId: string;
  originalStopId: string;
  originalStop: StopInfo;
  newRouteId: string;
  newStopId: string;
  newStop: StopInfo;
  reason: string | null;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: string;
  status: string;
  createdAt: string;
}

export default function DriverPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [route, setRoute] = useState<BusRouteInfo | null>(null);
  const [date, setDate] = useState(todayStr());
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchChanges = useCallback(async () => {
    if (!user?.routeId) return;
    setLoading(true);
    try {
      const [routeRes, changesRes] = await Promise.all([
        fetch('/api/routes', { credentials: 'include' }),
        fetch(`/api/changes?date=${date}&status=PENDING`, { credentials: 'include' }),
      ]);
      const routes = await routeRes.json();
      const allChanges = await changesRes.json();
      const currentRoute = routes.find((r: BusRouteInfo) => r.id === user.routeId);
      setRoute(currentRoute || null);
      const filtered = allChanges.filter(
        (c: ChangeItem) =>
          c.originalRouteId === user.routeId || c.newRouteId === user.routeId
      );
      setChanges(filtered);
    } catch (e) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [user?.routeId, date]);

  useEffect(() => {
    if (user) fetchChanges();
  }, [user, fetchChanges]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === changes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(changes.map((c) => c.id)));
    }
  };

  const handleSingleAction = async (id: string, status: 'CONFIRMED' | 'REJECTED') => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/changes/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      setChanges((prev) => prev.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setError(status === 'CONFIRMED' ? '确认失败' : '驳回失败');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setProcessingIds(new Set(ids));
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/changes/${id}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'CONFIRMED' }),
          })
        )
      );
      setChanges((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError('批量确认失败');
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handlePrint = () => {
    if (!route) return;
    window.open(`/print/route/${route.id}?date=${date}`, '_blank');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-orange flex items-center justify-center shadow-card">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">司机工作台</h1>
              <p className="text-sm text-slate-500">
                {route ? (
                  <span className="font-medium text-brand-orange">
                    线路：{route.name} 车牌 {route.plateNo}
                  </span>
                ) : (
                  '加载线路信息中...'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-card border border-slate-200">
              <Calendar className="w-4 h-4 text-brand-orange" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none focus:ring-0"
              />
            </div>
            <button
              onClick={handlePrint}
              disabled={!route}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-card',
                'bg-brand-navy text-white hover:bg-brand-navy-light',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Printer className="w-4 h-4" />
              打印今日变更小抄
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-brand-navy">待确认变更列表</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-medium">
              {changes.length} 条待处理
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-sm text-brand-navy hover:text-brand-orange transition-colors"
            >
              {selectedIds.size === changes.length ? '取消全选' : '全选'}
            </button>
            <button
              onClick={handleBatchConfirm}
              disabled={selectedIds.size === 0}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                'bg-brand-orange text-white hover:bg-brand-orange-dark shadow-sm',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-orange'
              )}
            >
              <CheckCheck className="w-4 h-4" />
              批量确认 ({selectedIds.size})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          </div>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Check className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">暂无待确认变更</p>
            <p className="text-sm mt-1">当日所有乘车安排已就绪</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {changes.map((change) => (
              <div
                key={change.id}
                className={cn(
                  'px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors',
                  selectedIds.has(change.id) && 'bg-brand-orange/5'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(change.id)}
                  onChange={() => toggleSelect(change.id)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-base font-semibold text-brand-navy">
                      {change.student.name}
                    </span>
                    <ChangeStatusBadge status={change.status} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {change.originalStop.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-orange" />
                    <span className="px-2 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-medium">
                      {change.newStop.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      发起人：{change.initiatorName}（{ROLE_LABEL[change.initiatorRole] || change.initiatorRole}）
                    </span>
                    <span>{formatDateTime(change.createdAt)}</span>
                  </div>
                  {change.reason && (
                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                      {change.reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSingleAction(change.id, 'CONFIRMED')}
                    disabled={processingIds.has(change.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      'bg-green-500 text-white hover:bg-green-600 shadow-sm',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {processingIds.has(change.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    确认
                  </button>
                  <button
                    onClick={() => handleSingleAction(change.id, 'REJECTED')}
                    disabled={processingIds.has(change.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {processingIds.has(change.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    驳回
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
