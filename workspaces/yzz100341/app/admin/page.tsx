'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Calendar,
  Download,
  Filter,
  Loader2,
  ArrowRight,
  Eye,
  X,
} from 'lucide-react';
import { cn, todayStr, formatDateTime, STATUS_LABEL } from '@/lib/utils';
import { ChangeStatusBadge } from '@/components/ChangeStatusBadge';
import type { SessionUser } from '@/lib/auth';

interface RouteInfo {
  id: string;
  name: string;
  plateNo: string;
}

interface StudentInfo {
  id: string;
  name: string;
  studentNo: string;
}

interface StopInfo {
  id: string;
  name: string;
}

interface ChangeRecord {
  id: string;
  studentId: string;
  student: StudentInfo;
  date: string;
  originalRouteId: string;
  originalRoute: RouteInfo;
  originalStopId: string;
  originalStop: StopInfo;
  newRouteId: string;
  newRoute: RouteInfo;
  newStopId: string;
  newStop: StopInfo;
  reason: string | null;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: string;
  status: string;
  confirmedById: string | null;
  confirmedByName: string | null;
  confirmedAt: string | null;
  rejectComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [toDate, setToDate] = useState(todayStr());
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedChange, setSelectedChange] = useState<ChangeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login');
          return;
        }
        if (data.user.role !== 'ADMIN') {
          router.push('/');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [routesRes, changesRes] = await Promise.all([
        fetch('/api/routes', { credentials: 'include' }),
        fetch('/api/changes', { credentials: 'include' }),
      ]);
      const routesData = await routesRes.json();
      const changesData = await changesRes.json();
      setRoutes(routesData);
      setChanges(changesData);
    } catch (e) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredChanges = changes.filter((c) => {
    const changeDate = new Date(c.date);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    if (changeDate < from || changeDate > to) return false;
    if (selectedRoute && c.originalRouteId !== selectedRoute && c.newRouteId !== selectedRoute) {
      return false;
    }
    if (selectedStatus && c.status !== selectedStatus) return false;
    return true;
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('from', fromDate);
      params.set('to', toDate);
      if (selectedRoute) params.set('route', selectedRoute);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await fetch(`/api/audit/export?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `audit-export-${todayStr()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('导出CSV失败');
    } finally {
      setExporting(false);
    }
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
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">校务处审计</h1>
              <p className="text-sm text-slate-500">查看和导出所有变更记录</p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-card',
              'bg-brand-navy text-white hover:bg-brand-navy-light',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            导出CSV
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-brand-orange" />
            <span className="text-sm font-medium text-slate-700">筛选条件</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">开始日期</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4 text-brand-orange" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm text-slate-700 bg-transparent border-none outline-none focus:ring-0 flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">结束日期</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4 text-brand-orange" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm text-slate-700 bg-transparent border-none outline-none focus:ring-0 flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">线路</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-orange/30"
              >
                <option value="">全部线路</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.plateNo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">状态</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-orange/30"
              >
                <option value="">全部状态</option>
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-semibold text-brand-navy">变更记录</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-medium">
            共 {filteredChanges.length} 条
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Shield className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">暂无变更记录</p>
            <p className="text-sm mt-1">请调整筛选条件查看</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    学生
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    站点变更
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    发起人
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    确认人
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredChanges.map((change) => (
                  <tr key={change.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700">{change.date}</div>
                      <div className="text-xs text-slate-400">{formatDateTime(change.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-brand-navy">{change.student.name}</div>
                      <div className="text-xs text-slate-400">{change.student.studentNo}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">
                          {change.originalStop.name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
                        <span className="text-sm font-medium text-brand-orange">
                          {change.newStop.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {change.originalRoute.name} → {change.newRoute.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-slate-700">{change.initiatorName}</div>
                      <div className="text-xs text-slate-400">{change.initiatorRole}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {change.confirmedByName ? (
                        <>
                          <div className="text-sm text-slate-700">{change.confirmedByName}</div>
                          <div className="text-xs text-slate-400">
                            {change.confirmedAt && formatDateTime(change.confirmedAt)}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ChangeStatusBadge status={change.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedChange(change)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-brand-navy hover:bg-brand-navy/10 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-brand-navy">变更详情</h3>
              <button
                onClick={() => setSelectedChange(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">学生</label>
                  <p className="text-sm font-semibold text-brand-navy mt-0.5">
                    {selectedChange.student.name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">日期</label>
                  <p className="text-sm text-slate-700 mt-0.5">{selectedChange.date}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">原站点</label>
                  <p className="text-sm text-slate-700 mt-0.5">
                    {selectedChange.originalStop.name}
                    <span className="text-xs text-slate-400 ml-1">
                      ({selectedChange.originalRoute.name})
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">新站点</label>
                  <p className="text-sm font-medium text-brand-orange mt-0.5">
                    {selectedChange.newStop.name}
                    <span className="text-xs text-slate-400 ml-1">
                      ({selectedChange.newRoute.name})
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">发起人</label>
                  <p className="text-sm text-slate-700 mt-0.5">
                    {selectedChange.initiatorName}
                    <span className="text-xs text-slate-400 ml-1">({selectedChange.initiatorRole})</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">状态</label>
                  <div className="mt-0.5">
                    <ChangeStatusBadge status={selectedChange.status} />
                  </div>
                </div>
              </div>
              {selectedChange.reason && (
                <div>
                  <label className="text-xs font-medium text-slate-500">变更原因</label>
                  <p className="text-sm text-slate-700 mt-1 p-3 bg-slate-50 rounded-lg">
                    {selectedChange.reason}
                  </p>
                </div>
              )}
              {selectedChange.confirmedByName && (
                <div>
                  <label className="text-xs font-medium text-slate-500">确认信息</label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                    由 <span className="font-medium">{selectedChange.confirmedByName}</span> 于{' '}
                    {selectedChange.confirmedAt && formatDateTime(selectedChange.confirmedAt)} 确认
                  </div>
                </div>
              )}
              {selectedChange.rejectComment && (
                <div>
                  <label className="text-xs font-medium text-slate-500">驳回理由</label>
                  <p className="text-sm text-red-600 mt-1 p-3 bg-red-50 rounded-lg">
                    {selectedChange.rejectComment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
