import React, { useEffect } from 'react';
import {
  BarChart3, PieChart, FileDown, AlertCircle, CheckCircle2,
  HelpCircle, TrendingUp, Calendar, XCircle,
} from 'lucide-react';
import { useStatsStore } from '@/stores/useStatsStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS: Record<string, string> = {
  manual: '#3b82f6',
  pest: '#f59e0b',
  notice: '#6D4C41',
  experience: '#2E7D32',
};

export default function StatisticsPage() {
  const {
    data, isLoading, selectedYear, selectedMonth,
    loadData, exportReport, setYearMonth,
  } = useStatsStore();

  useEffect(() => { void loadData(); }, [loadData, selectedYear, selectedMonth]);

  const now = new Date();
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const adoptionRate = data?.adoptionRate ?? 0;

  const kpis = [
    { v: data?.totalQA ?? 0, l: '本月问答总量', I: BarChart3, bg: 'leaf', tc: 'leaf' },
    { v: `${(adoptionRate * 100).toFixed(0)}%`, l: '回答采纳率', I: CheckCircle2, bg: 'green', tc: 'green' },
    { v: data?.manualJudgmentCount ?? 0, l: '需人工判断次数', I: AlertCircle, bg: 'red', tc: 'red' },
    { v: data?.topQuestions?.[0]?.count ?? 0, l: '最高频问题次数', I: TrendingUp, bg: 'harvest', tc: 'harvest' },
  ];

  const uncovered = [...(data?.uncoveredQuestions ?? [])].sort((a, b) => b.count - a.count);

  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={cn('animate-pulse', className)} />
  );

  return (
    <div className="animate-fade-in-up">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold text-leaf-800">统计与导出</h1>
          <p className="text-sm text-leaf-500 mt-1">月度问答数据分析、高频问题和资料缺口清单</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <select className="w-28 select" value={selectedYear}
              onChange={(e) => setYearMonth(parseInt(e.target.value, 10), selectedMonth)}>
              {years.map((y) => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select className="w-24 select" value={selectedMonth}
              onChange={(e) => setYearMonth(selectedYear, parseInt(e.target.value, 10))}>
              {months.map((m) => <option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" disabled={isLoading}
            onClick={() => void exportReport()}>
            <FileDown className="w-4 h-4" /><span>导出院报</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-stagger">
        {kpis.map(({ v, l, I: Ic, bg, tc }) => {
          const bgMap: Record<string, string> = { leaf: 'bg-leaf-100', green: 'bg-green-100', red: 'bg-red-100', harvest: 'bg-harvest-100' };
          const tcMap: Record<string, string> = { leaf: 'text-leaf-600', green: 'text-green-600', red: 'text-red-600', harvest: 'text-harvest-600' };
          return (
            <div key={l} className="card-hover p-5">
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-8 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgMap[bg])}>
                    <Ic className={cn('w-6 h-6', tcMap[tc])} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-leaf-800">{v}</p>
                    <p className="text-sm text-leaf-500">{l}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card p-5">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />TOP 10 高频问题
          </h4>
          <p className="text-xs text-leaf-500 mb-4">本月被问到次数最多的问题</p>
          {isLoading ? (
            <Skeleton className="w-full h-72 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={data?.topQuestions ?? []} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="question" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2E7D32" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <PieChart className="w-5 h-5" />问题来源分布
          </h4>
          <p className="text-xs text-leaf-500 mb-4">回答来自各类资料的比例</p>
          {isLoading ? (
            <Skeleton className="w-full h-72 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <RPieChart>
                <Pie
                  data={data?.categoryDistribution ?? []}
                  dataKey="count" nameKey="category" cx="50%" cy="50%"
                  outerRadius={80} innerRadius={40}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(data?.categoryDistribution ?? []).map((entry, idx) => (
                    <Cell key={idx} fill={COLORS[entry.category] ?? '#888'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </RPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />待补充资料清单
        </h4>
        <p className="text-xs text-leaf-500 mb-4">需要人工判断或未被采纳的问题，建议纳入资料编制计划</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : uncovered.length === 0 ? (
          <p className="text-sm text-leaf-400 py-8 text-center">本月暂无待补充问题</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-leaf-100 text-leaf-600">
                  <th className="text-left py-3 px-4 font-medium w-12">排名</th>
                  <th className="text-left py-3 px-4 font-medium">问题</th>
                  <th className="text-left py-3 px-4 font-medium w-24 text-center">次数</th>
                  <th className="text-left py-3 px-4 font-medium">备注（采纳反馈）</th>
                </tr>
              </thead>
              <tbody>
                {uncovered.map((q, idx) => (
                  <tr key={idx} className="border-b border-leaf-50 hover:bg-leaf-50/50 transition">
                    <td className="py-3 px-4 text-leaf-400 font-medium">#{idx + 1}</td>
                    <td className="py-3 px-4 text-leaf-800">{q.question}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="chip-harvest">{q.count}次</span>
                    </td>
                    <td className="py-3 px-4 text-leaf-500 text-xs">{q.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="hidden">{HelpCircle.name}{XCircle.name}</div>
    </div>
  );
}
