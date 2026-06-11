'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  Bus,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { cn, todayStr } from '@/lib/utils';
import { ChangeStatusBadge } from '@/components/ChangeStatusBadge';
import type { SessionUser } from '@/lib/auth';

interface ClassInfo {
  id: string;
  name: string;
}

interface StopInfo {
  id: string;
  name: string;
}

interface ChangeDetail {
  id: string;
  status: string;
  originalStop: StopInfo;
  newStop: StopInfo;
}

interface RosterItem {
  id: string;
  name: string;
  studentNo: string;
  class: ClassInfo;
  defaultStop: StopInfo;
  actualStopId: string;
  actualStop: StopInfo;
  changeStatus: string;
  changeDetail: ChangeDetail | null;
}

interface RosterResponse {
  route: { id: string; name: string; plateNo: string };
  date: string;
  totalCount: number;
  roster: RosterItem[];
}

export default function ConductorPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [date, setDate] = useState(todayStr());
  const [rosterData, setRosterData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchRoster = useCallback(async () => {
    if (!user?.routeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/routes/${user.routeId}/roster?date=${date}`, { credentials: 'include' });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setRosterData(data);
    } catch (e) {
      setError('加载名单失败');
    } finally {
      setLoading(false);
    }
  }, [user?.routeId, date]);

  useEffect(() => {
    if (user) fetchRoster();
  }, [user, fetchRoster]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  const getRideTypeLabel = (item: RosterItem) => {
    if (item.changeStatus === 'CONFIRMED_IN') {
      return { text: '变更转入', highlight: true };
    }
    if (item.changeStatus === 'PENDING_IN') {
      return { text: '待转入', highlight: true };
    }
    return { text: '默认', highlight: false };
  };

  const isHighlightRow = (item: RosterItem) => {
    return (
      item.changeStatus === 'CONFIRMED_IN' ||
      item.changeStatus === 'PENDING_IN' ||
      item.changeStatus === 'PENDING_OUT'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-navy flex items-center justify-center shadow-card">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">跟车老师名单</h1>
              <p className="text-sm text-slate-500">
                {rosterData ? (
                  <span className="font-medium text-brand-orange">
                    线路：{rosterData.route.name} 车牌 {rosterData.route.plateNo}
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
            {rosterData && (
              <span className="px-4 py-2 bg-brand-orange/10 text-brand-orange rounded-lg font-medium text-sm">
                共 {rosterData.totalCount} 人
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          </div>
        ) : !rosterData || rosterData.roster.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bus className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">暂无乘车名单</p>
            <p className="text-sm mt-1">请选择其他日期查看</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                    序号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    学生姓名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    班级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    实际站点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    乘车类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    变更状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rosterData.roster.map((item, index) => {
                  const rideType = getRideTypeLabel(item);
                  const highlight = isHighlightRow(item);
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors',
                        highlight
                          ? 'bg-brand-orange/8 hover:bg-brand-orange/12'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'text-sm font-medium',
                          highlight ? 'text-brand-orange' : 'text-slate-500'
                        )}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'text-sm font-semibold',
                          highlight ? 'text-brand-orange' : 'text-brand-navy'
                        )}>
                          {item.name}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">
                          学号：{item.studentNo}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{item.class.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.changeDetail ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 line-through">
                              {item.changeDetail.originalStop.name}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-brand-orange" />
                            <span className="text-sm font-medium text-brand-orange">
                              {item.changeDetail.newStop.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">{item.actualStop.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            rideType.highlight
                              ? 'bg-brand-orange/15 text-brand-orange'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {rideType.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.changeDetail ? (
                          <ChangeStatusBadge status={item.changeDetail.status} />
                        ) : (
                          <ChangeStatusBadge status="CONFIRMED" className="bg-slate-100 text-slate-500 border-slate-200">
                            —
                          </ChangeStatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
