'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Printer, Bus, Loader2 } from 'lucide-react';
import { todayStr } from '@/lib/utils';

interface RouteInfo {
  id: string;
  name: string;
  plateNo: string;
}

interface StopInfo {
  id: string;
  name: string;
}

interface StudentInfo {
  id: string;
  name: string;
}

interface ChangeItem {
  id: string;
  student: StudentInfo;
  originalRouteId: string;
  originalStop: StopInfo;
  newRouteId: string;
  newStop: StopInfo;
  reason: string | null;
  initiatorName: string;
}

export default function PrintRoutePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const routeId = params.routeId as string;
  const date = searchParams.get('date') || todayStr();

  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [routesRes, changesRes] = await Promise.all([
          fetch('/api/routes', { credentials: 'include' }),
          fetch(`/api/changes?date=${date}&status=CONFIRMED`, { credentials: 'include' }),
        ]);
        const routes: RouteInfo[] = await routesRes.json();
        const allChanges: ChangeItem[] = await changesRes.json();

        const currentRoute = routes.find((r) => r.id === routeId);
        setRoute(currentRoute || null);

        const filtered = allChanges.filter(
          (c) => c.newRouteId === routeId || c.originalRouteId === routeId
        );
        setChanges(filtered);
      } catch (e) {
        console.error('加载数据失败', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [routeId, date]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A5;
            margin: 12mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-orange flex items-center justify-center">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-navy">打印预览</h1>
            <p className="text-xs text-slate-500">A5纸张格式</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-orange-dark transition-colors shadow-card"
        >
          <Printer className="w-5 h-5" />
          一键打印
        </button>
      </div>

      <div className="max-w-[148mm] mx-auto px-8 py-10 print:px-0 print:py-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-navy mb-2">
            {route?.name || '线路'}临时变更小抄
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-brand-orange" />
              车牌：{route?.plateNo || '—'}
            </span>
            <span>|</span>
            <span>日期：{date}</span>
          </div>
        </div>

        {changes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">当日无临时变更</p>
            <p className="text-sm mt-2">所有学生按默认站点乘车</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-brand-navy">
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy w-10">
                    序
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy">
                    学生姓名
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy">
                    原站点
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy">
                    新站点
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy">
                    家长联系
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-bold text-brand-navy">
                    备注
                  </th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change, index) => (
                  <tr
                    key={change.id}
                    className={cn(
                      'border-b border-slate-200',
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    )}
                  >
                    <td className="py-2.5 px-2 text-sm text-slate-500 w-10">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-2 text-sm font-semibold text-brand-navy">
                      {change.student.name}
                    </td>
                    <td className="py-2.5 px-2 text-sm text-slate-600">
                      {change.originalStop.name}
                    </td>
                    <td className="py-2.5 px-2 text-sm font-medium text-brand-orange">
                      {change.newStop.name}
                    </td>
                    <td className="py-2.5 px-2 text-sm text-slate-400">
                      —
                    </td>
                    <td className="py-2.5 px-2 text-sm text-slate-500 max-w-[120px] truncate">
                      {change.reason || `由 ${change.initiatorName} 申请`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-slate-200 flex justify-between items-end print:mt-8">
          <div className="text-sm text-slate-500">
            <p>打印时间：{new Date().toLocaleString('zh-CN')}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>司机签字：____________</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: (string | false | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}
