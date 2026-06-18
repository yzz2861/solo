import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wrench, AlertTriangle, Home, RefreshCw, Droplets, Plus, FileText } from 'lucide-react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { AnomalyLevel, AnomalyPoint, RepairRecord, RepairStatus, WaterReading } from '@shared/types';

const levelStyle: Record<AnomalyLevel, string> = {
  normal: 'bg-ocean-100 text-ocean-700', warning: 'bg-warn-100 text-warn-600', severe: 'bg-danger-500 text-white',
};
const levelLabel: Record<AnomalyLevel, string> = { normal: '正常', warning: '警告', severe: '严重' };
const repairStatusStyle: Record<RepairStatus, string> = {
  pending: 'bg-gray-100 text-gray-600', repairing: 'bg-warn-100 text-warn-600',
  completed: 'bg-ocean-100 text-ocean-700', recheck: 'bg-aqua-400/20 text-aqua-600',
};
const repairStatusLabel: Record<RepairStatus, string> = {
  pending: '待处理', repairing: '维修中', completed: '已完成', recheck: '待复测',
};
const reasonIconMap: Record<string, typeof Wrench> = {
  换表: Wrench, 倒挂: AlertTriangle, 空置: Home, 维修后异常: RefreshCw, 漏水可疑: Droplets,
};
const fmtDate = (s: string) => s.slice(0, 10);
const getReasonIcon = (reason?: string) => {
  if (!reason) return AlertTriangle;
  for (const k of Object.keys(reasonIconMap)) if (reason.includes(k)) return reasonIconMap[k];
  return AlertTriangle;
};

interface ChartDatum { date: string; day: number; night: number; isAnomalyDay: boolean; }

function WaterConsumptionChart({ readings, anomalyPoints }: { readings: WaterReading[]; anomalyPoints: AnomalyPoint[] }) {
  const data = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, ChartDatum>();
    for (const r of readings) {
      const d = fmtDate(r.readingDate);
      const cur = map.get(d) ?? { date: d, day: 0, night: 0, isAnomalyDay: false };
      r.period === 'day' ? (cur.day = r.consumption) : (cur.night = r.consumption);
      map.set(d, cur);
    }
    for (const a of anomalyPoints) {
      const d = fmtDate(a.date);
      const cur = map.get(d);
      if (cur) cur.isAnomalyDay = true;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [readings, anomalyPoints]);

  const reasons = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of anomalyPoints) if (a.reason) m.set(fmtDate(a.date), a.reason);
    return m;
  }, [anomalyPoints]);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ChartDatum;
            return (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-card">
                <div className="mb-1 font-medium text-ocean-700">{d.date}</div>
                <div>日间: <span className="font-medium">{d.day}</span></div>
                <div>夜间: <span className="font-medium">{d.night}</span></div>
                {d.isAnomalyDay && reasons.get(d.date) && <div className="mt-1 text-danger-500">异常: {reasons.get(d.date)}</div>}
              </div>
            );
          }} />
          <Bar dataKey="day" stackId="a" fill="#93c5fd" />
          <Bar dataKey="night" stackId="a" fill="#275a85" radius={[4, 4, 0, 0]} />
          <Scatter dataKey="isAnomalyDay" data={data.filter((d) => d.isAnomalyDay)} fill="#dc2626" shape="circle" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#93c5fd]" /> 日间</div>
        <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-ocean-600" /> 夜间</div>
        <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-danger-500" /> 异常</div>
      </div>
    </div>
  );
}

function AnomalyTimeline({ points }: { points: AnomalyPoint[] }) {
  const filtered = points.filter((p) => p.reason).sort((a, b) => b.date.localeCompare(a.date));
  if (!filtered.length) return <div className="text-sm text-gray-400">暂无异常解释</div>;
  return (
    <ol className="relative border-l border-gray-200">
      {filtered.map((p, i) => {
        const Icon = getReasonIcon(p.reason);
        return (
          <li key={i} className="mb-4 ml-4">
            <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-ocean-200">
              <Icon className="h-3 w-3 text-ocean-600" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{fmtDate(p.date)}</span>
              <span className="text-xs text-gray-500">{p.period === 'day' ? '日间' : '夜间'}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', levelStyle[p.anomalyLevel])}>{levelLabel[p.anomalyLevel]}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{p.reason}</p>
          </li>
        );
      })}
    </ol>
  );
}

function RepairList({ repairs, buildingId }: { repairs: RepairRecord[]; buildingId: number }) {
  const createRepair = useAppStore((s) => s.createRepair);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reportDate: new Date().toISOString().slice(0, 10), repairType: '', description: '', status: 'pending' as RepairStatus });
  const inp = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400';

  const submit = async () => {
    if (!form.repairType || !form.description) return;
    await createRepair({ buildingId, ...form });
    setOpen(false);
    setForm({ reportDate: new Date().toISOString().slice(0, 10), repairType: '', description: '', status: 'pending' });
  };

  return (
    <div>
      <div className="space-y-3">
        {repairs.length === 0 && <div className="text-sm text-gray-400">暂无维修记录</div>}
        {repairs.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.repairType}</div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', repairStatusStyle[r.status])}>{repairStatusLabel[r.status]}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">报修日期: {fmtDate(r.reportDate)}</div>
            <p className="mt-1 text-sm text-gray-700">{r.description}</p>
            {r.result && <p className="mt-1 text-xs text-ocean-700">处理结果: {r.result}</p>}
            {r.recheckReading != null && (
              <div className="mt-2 rounded-md bg-ocean-50 px-2 py-1.5 text-xs">
                <div>复测读数: {r.recheckReading}</div>
                {r.recheckDate && <div>复测日期: {fmtDate(r.recheckDate)}</div>}
                {r.recheckNote && <div>备注: {r.recheckNote}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setOpen(true)} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ocean-300 bg-ocean-50/50 py-2 text-sm font-medium text-ocean-600 hover:bg-ocean-50">
        <Plus className="h-4 w-4" /> 新增维修记录
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-card-hover">
            <h3 className="mb-4 text-lg font-semibold text-ocean-700">新增维修记录</h3>
            <div className="space-y-3">
              <div><label className="mb-1 block text-sm text-gray-600">报修日期</label><input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} className={inp} /></div>
              <div><label className="mb-1 block text-sm text-gray-600">维修类型</label><input value={form.repairType} onChange={(e) => setForm({ ...form, repairType: e.target.value })} className={inp} /></div>
              <div><label className="mb-1 block text-sm text-gray-600">描述</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inp} /></div>
              <div><label className="mb-1 block text-sm text-gray-600">状态</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RepairStatus })} className={inp}>
                  <option value="pending">待处理</option><option value="repairing">维修中</option><option value="completed">已完成</option><option value="recheck">待复测</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={submit} className="rounded-md bg-ocean-600 px-4 py-2 text-sm text-white hover:bg-ocean-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuildingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useAppStore((s) => s.selectedBuildingDetail);
  const loading = useAppStore((s) => s.loading.detail);
  const fetchBuildingDetail = useAppStore((s) => s.fetchBuildingDetail);

  useEffect(() => { if (id) fetchBuildingDetail(Number(id)); }, [id, fetchBuildingDetail]);
  if (!detail || loading) return <div className="p-6 text-sm text-gray-500">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-md p-1.5 hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-700" /></button>
          <div className="flex-1"><h1 className="text-base font-semibold text-ocean-700">{detail.buildingName} <span className="text-sm font-normal text-gray-500">#{detail.buildingCode}</span></h1></div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', levelStyle[detail.anomalyLevel])}>{levelLabel[detail.anomalyLevel]}</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 p-4 pb-24">
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card"><h2 className="mb-3 text-sm font-semibold text-ocean-700">用水曲线</h2><WaterConsumptionChart readings={detail.readings} anomalyPoints={detail.anomalyPoints} /></section>
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card"><h2 className="mb-3 text-sm font-semibold text-ocean-700">异常解释</h2><AnomalyTimeline points={detail.anomalyPoints} /></section>
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-card"><h2 className="mb-3 text-sm font-semibold text-ocean-700">关联维修记录</h2><RepairList repairs={detail.repairs} buildingId={detail.buildingId} /></section>
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-3">
        <div className="mx-auto max-w-4xl">
          <button onClick={() => navigate(`/report/${detail.buildingId}`)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-600 py-3 text-sm font-medium text-white hover:bg-ocean-700">
            <FileText className="h-4 w-4" /> 查看维修报告
          </button>
        </div>
      </div>
    </div>
  );
}
