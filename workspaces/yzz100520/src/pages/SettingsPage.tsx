import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Calendar } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { Building, Holiday } from '@shared/types';

type Tab = 'buildings' | 'holidays';
const fmtDate = (s: string) => s.slice(0, 10);
const inp = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-ocean-400';
const btnSecondary = 'rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50';
const btnPrimary = 'rounded-md bg-ocean-600 px-4 py-2 text-sm text-white hover:bg-ocean-700';

function BuildingModal({ open, onClose, onSubmit, initial }: {
  open: boolean; onClose: () => void; onSubmit: (data: Partial<Building>) => Promise<void>; initial?: Building | null;
}) {
  const [form, setForm] = useState({ code: '', name: '', meterCode: '', floors: '', totalRooms: '' });
  useEffect(() => {
    if (open) setForm({ code: initial?.code ?? '', name: initial?.name ?? '', meterCode: initial?.meterCode ?? '', floors: initial ? String(initial.floors) : '', totalRooms: initial ? String(initial.totalRooms) : '' });
  }, [open, initial]);
  if (!open) return null;
  const submit = async () => {
    if (!form.code || !form.name) return;
    await onSubmit({ code: form.code, name: form.name, meterCode: form.meterCode, floors: Number(form.floors) || 0, totalRooms: Number(form.totalRooms) || 0 });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-card-hover">
        <h3 className="mb-4 text-lg font-semibold text-ocean-700">{initial ? '编辑楼栋' : '新增楼栋'}</h3>
        <div className="space-y-3">
          <div><label className="mb-1 block text-sm text-gray-600">楼栋编号</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inp} /></div>
          <div><label className="mb-1 block text-sm text-gray-600">楼栋名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></div>
          <div><label className="mb-1 block text-sm text-gray-600">水表编号</label><input value={form.meterCode} onChange={(e) => setForm({ ...form, meterCode: e.target.value })} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm text-gray-600">层数</label><input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} className={inp} /></div>
            <div><label className="mb-1 block text-sm text-gray-600">宿舍数</label><input type="number" value={form.totalRooms} onChange={(e) => setForm({ ...form, totalRooms: e.target.value })} className={inp} /></div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className={btnSecondary}>取消</button><button onClick={submit} className={btnPrimary}>保存</button></div>
      </div>
    </div>
  );
}

function HolidayModal({ open, onClose, onSubmit, buildings }: {
  open: boolean; onClose: () => void; onSubmit: (data: Partial<Holiday>) => Promise<Holiday | void>; buildings: Building[];
}) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', buildingIds: [] as number[] });
  useEffect(() => { if (open) setForm({ name: '', startDate: '', endDate: '', buildingIds: [] }); }, [open]);
  if (!open) return null;
  const toggle = (id: number) => setForm((f) => ({ ...f, buildingIds: f.buildingIds.includes(id) ? f.buildingIds.filter((x) => x !== id) : [...f.buildingIds, id] }));
  const submit = async () => { if (!form.name || !form.startDate || !form.endDate) return; await onSubmit(form); onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-card-hover">
        <h3 className="mb-4 text-lg font-semibold text-ocean-700">新增假期</h3>
        <div className="space-y-3">
          <div><label className="mb-1 block text-sm text-gray-600">假期名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如: 寒假" className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-sm text-gray-600">开始日期</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inp} /></div>
            <div><label className="mb-1 block text-sm text-gray-600">结束日期</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={inp} /></div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">关联楼栋</label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 p-2">
              {buildings.length === 0 && <div className="text-xs text-gray-400">暂无楼栋</div>}
              {buildings.map((b) => (
                <label key={b.id} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" checked={form.buildingIds.includes(b.id)} onChange={() => toggle(b.id)} className="h-4 w-4 rounded border-gray-300 text-ocean-600" />
                  <span>{b.name} (#{b.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className={btnSecondary}>取消</button><button onClick={submit} className={btnPrimary}>保存</button></div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('buildings');
  const buildings = useAppStore((s) => s.buildings);
  const holidays = useAppStore((s) => s.holidays);
  const fetchBuildings = useAppStore((s) => s.fetchBuildings);
  const fetchHolidays = useAppStore((s) => s.fetchHolidays);
  const createBuilding = useAppStore((s) => s.createBuilding);
  const updateBuilding = useAppStore((s) => s.updateBuilding);
  const createHoliday = useAppStore((s) => s.createHoliday);
  const deleteHoliday = useAppStore((s) => s.deleteHoliday);
  const [bModal, setBModal] = useState<{ open: boolean; edit: Building | null }>({ open: false, edit: null });
  const [hModal, setHModal] = useState(false);
  useEffect(() => { fetchBuildings(); fetchHolidays(); }, [fetchBuildings, fetchHolidays]);

  const th = 'px-3 py-2 text-left text-xs text-gray-500';
  const td = 'px-3 py-2 border-t border-gray-100';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4"><h1 className="text-lg font-semibold text-ocean-700">数据管理</h1></div>
      </header>
      <main className="mx-auto max-w-4xl p-4">
        <div className="mb-4 flex rounded-lg bg-white p-1 shadow-card">
          <button onClick={() => setTab('buildings')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition', tab === 'buildings' ? 'bg-ocean-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            <Building2 className="h-4 w-4" /> 楼栋信息
          </button>
          <button onClick={() => setTab('holidays')} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition', tab === 'holidays' ? 'bg-ocean-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
            <Calendar className="h-4 w-4" /> 假期日历
          </button>
        </div>

        {tab === 'buildings' && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 p-3">
              <h2 className="text-sm font-semibold text-ocean-700">楼栋列表</h2>
              <button onClick={() => setBModal({ open: true, edit: null })} className="flex items-center gap-1 rounded-md bg-ocean-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-ocean-700">
                <Plus className="h-3.5 w-3.5" /> 新增
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className={th}>编号</th><th className={th}>名称</th><th className={th}>水表编号</th><th className={th}>层数</th><th className={th}>宿舍数</th><th className="px-3 py-2 text-right text-xs text-gray-500">操作</th></tr></thead>
                <tbody>
                  {buildings.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">暂无楼栋数据</td></tr>}
                  {buildings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60">
                      <td className={cn(td, 'font-mono text-xs')}>{b.code}</td>
                      <td className={cn(td, 'font-medium')}>{b.name}</td>
                      <td className={cn(td, 'text-gray-600')}>{b.meterCode}</td>
                      <td className={td}>{b.floors}</td>
                      <td className={td}>{b.totalRooms}</td>
                      <td className={cn(td, 'text-right')}>
                        <button onClick={() => setBModal({ open: true, edit: b })} className="rounded p-1 text-gray-500 hover:bg-ocean-50 hover:text-ocean-600"><Pencil className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'holidays' && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-gray-100 p-3">
              <h2 className="text-sm font-semibold text-ocean-700">假期列表</h2>
              <button onClick={() => setHModal(true)} className="flex items-center gap-1 rounded-md bg-ocean-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-ocean-700">
                <Plus className="h-3.5 w-3.5" /> 新增
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className={th}>名称</th><th className={th}>开始</th><th className={th}>结束</th><th className={th}>关联楼栋</th><th className="px-3 py-2 text-right text-xs text-gray-500">操作</th></tr></thead>
                <tbody>
                  {holidays.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">暂无假期数据</td></tr>}
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50/60">
                      <td className={cn(td, 'font-medium')}>{h.name}</td>
                      <td className={cn(td, 'text-gray-600')}>{fmtDate(h.startDate)}</td>
                      <td className={cn(td, 'text-gray-600')}>{fmtDate(h.endDate)}</td>
                      <td className={td}><span className="rounded-full bg-ocean-100 px-2 py-0.5 text-xs text-ocean-700">{h.buildingIds.length} 栋</span></td>
                      <td className={cn(td, 'text-right')}>
                        <button onClick={() => deleteHoliday(h.id)} className="rounded p-1 text-gray-500 hover:bg-danger-500/10 hover:text-danger-500"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <BuildingModal open={bModal.open} onClose={() => setBModal({ open: false, edit: null })} onSubmit={async (d) => { bModal.edit ? await updateBuilding(bModal.edit.id, d) : await createBuilding(d); }} initial={bModal.edit} />
      <HolidayModal open={hModal} onClose={() => setHModal(false)} onSubmit={createHoliday} buildings={buildings} />
    </div>
  );
}
