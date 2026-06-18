import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { RepairRecord, SuspectedLeakWindow, WaterReading } from '@shared/types';

const probStyle: Record<SuspectedLeakWindow['probability'], string> = {
  high: 'bg-danger-500 text-white',
  medium: 'bg-warn-500 text-white',
  low: 'bg-gray-400 text-white',
};

const probLabel: Record<SuspectedLeakWindow['probability'], string> = {
  high: '高概率',
  medium: '中概率',
  low: '低概率',
};

function formatDate(s: string) {
  return s.slice(0, 10);
}

function SuspectedLeakList({ leaks }: { leaks: SuspectedLeakWindow[] }) {
  if (!leaks.length) return <div className="text-sm text-gray-400">暂无疑似漏点</div>;
  return (
    <div className="space-y-3">
      {leaks.map((l, i) => (
        <div key={i} className="rounded-lg border border-gray-100 bg-white p-3 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-ocean-700">
              {formatDate(l.startDate)} ~ {formatDate(l.endDate)}
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', probStyle[l.probability])}>
              {probLabel[l.probability]}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>持续天数: <span className="text-gray-700">{l.daysCount}</span></div>
            <div>平均夜间用水量: <span className="text-gray-700">{l.avgNightConsumption}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RepairComparisonChart({ repairs, readings }: { repairs: RepairRecord[]; readings: WaterReading[] }) {
  const recent = useMemo(() => {
    return [...repairs]
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      .slice(0, 3);
  }, [repairs]);

  const data = useMemo(() => {
    if (!recent.length) return [];
    const nightMap = new Map<string, number>();
    for (const r of readings) {
      if (r.period === 'night') nightMap.set(formatDate(r.readingDate), r.consumption);
    }
    const days: Record<string, number | null>[] = [];
    for (let i = -7; i <= 14; i++) {
      const row: Record<string, number | null> = { day: i };
      recent.forEach((rep, idx) => {
        const base = new Date(rep.reportDate);
        base.setDate(base.getDate() + i);
        const key = base.toISOString().slice(0, 10);
        row[`维修${idx + 1}`] = nightMap.get(key) ?? null;
      });
      days.push(row);
    }
    return days;
  }, [recent, readings]);

  if (!recent.length) return <div className="text-sm text-gray-400">暂无维修对比数据</div>;

  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">横轴为维修前后天数（-7 ~ +14）</div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {recent.map((_, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`维修${i + 1}`}
                stroke={['#275a85', '#f59e0b', '#14b8a6'][i]}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RecheckForm({ repairs }: { repairs: RepairRecord[] }) {
  const updateRepair = useAppStore((s) => s.updateRepair);
  const [repairId, setRepairId] = useState<number | ''>('');
  const [recheckDate, setRecheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [recheckReading, setRecheckReading] = useState('');
  const [recheckNote, setRecheckNote] = useState('');
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (repairId === '' || !recheckReading) return;
    await updateRepair(Number(repairId), {
      recheckReading: Number(recheckReading),
      recheckDate,
      recheckNote,
      status: 'completed',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setRepairId('');
    setRecheckReading('');
    setRecheckNote('');
    setRecheckDate(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm text-gray-600">维修记录</label>
        <select
          value={repairId}
          onChange={(e) => setRepairId(e.target.value ? Number(e.target.value) : '')}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400"
        >
          <option value="">请选择维修记录</option>
          {repairs.map((r) => (
            <option key={r.id} value={r.id}>
              {formatDate(r.reportDate)} - {r.repairType}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">复测日期</label>
        <input
          type="date"
          value={recheckDate}
          onChange={(e) => setRecheckDate(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">复测读数</label>
        <input
          type="number"
          step="0.01"
          value={recheckReading}
          onChange={(e) => setRecheckReading(e.target.value)}
          placeholder="请输入水表读数"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-gray-600">复测备注</label>
        <textarea
          value={recheckNote}
          onChange={(e) => setRecheckNote(e.target.value)}
          rows={3}
          placeholder="记录复测情况"
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400"
        />
      </div>
      <div className="flex items-center justify-between">
        {saved && <span className="text-xs text-aqua-600">保存成功</span>}
        <div className="ml-auto">
          <button
            onClick={submit}
            className="rounded-md bg-ocean-600 px-4 py-2 text-sm text-white hover:bg-ocean-700 disabled:opacity-50"
            disabled={repairId === '' || !recheckReading}
          >
            提交复测
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RepairReportPage() {
  const { id } = useParams();
  const detail = useAppStore((s) => s.selectedBuildingDetail);
  const loading = useAppStore((s) => s.loading.detail);
  const fetchBuildingDetail = useAppStore((s) => s.fetchBuildingDetail);

  useEffect(() => {
    if (id) fetchBuildingDetail(Number(id));
  }, [id, fetchBuildingDetail]);

  if (!detail || loading) {
    return <div className="p-6 text-sm text-gray-500">加载中...</div>;
  }

  const suggestedWindow = detail.suspectedLeaks.find((l) => l.probability === 'high') ||
    detail.suspectedLeaks.find((l) => l.probability === 'medium');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to={`/building/${detail.buildingId}`} className="rounded-md p-1.5 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-semibold text-ocean-700">
            {detail.buildingName} <span className="text-sm font-normal text-gray-500">#{detail.buildingCode}</span>
            <span className="ml-2 text-sm font-normal text-gray-400">维修报告</span>
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 p-4 pb-12">
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ocean-700">疑似漏点时间窗口</h2>
          <SuspectedLeakList leaks={detail.suspectedLeaks} />
        </section>
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ocean-700">历史维修对比</h2>
          <RepairComparisonChart repairs={detail.repairs} readings={detail.readings} />
        </section>
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-ocean-700">复测记录</h2>
          <RecheckForm repairs={detail.repairs} />
        </section>
        <section className="rounded-xl border border-ocean-200 bg-ocean-50/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-ocean-700">建议排查时段</h2>
          {suggestedWindow ? (
            <p className="text-sm text-ocean-800">
              根据数据分析，建议优先排查 <span className="font-medium">{formatDate(suggestedWindow.startDate)}</span> 至
              <span className="font-medium"> {formatDate(suggestedWindow.endDate)}</span> 期间的管网情况。
              此时间段平均夜间用水量为 {suggestedWindow.avgNightConsumption}，持续 {suggestedWindow.daysCount} 天。
            </p>
          ) : (
            <p className="text-sm text-ocean-700">当前暂无高风险时段，建议定期巡检。</p>
          )}
        </section>
      </main>
    </div>
  );
}
