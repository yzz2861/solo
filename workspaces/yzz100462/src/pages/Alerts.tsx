import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Package,
  Ban,
  Bell,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import type { FastingPeriod, ConflictAlert } from '@/types';
import { formatDate, todayISO, dateInRange } from '@/utils';

const alertIcon: Record<string, any> = {
  fasting: Ban,
  low_stock: Package,
  keeper_conflict: Bell,
  guide_conflict: Bell,
  time_overlap: AlertTriangle,
  visitor_overlap: AlertTriangle,
};

const alertLabel: Record<string, string> = {
  fasting: '物种禁食',
  low_stock: '库存不足',
  keeper_conflict: '饲养员冲突',
  guide_conflict: '讲解员冲突',
  time_overlap: '水质时段重叠',
  visitor_overlap: '挤占护理时间',
};

export default function Alerts() {
  const species = useAppStore((s) => s.species);
  const feeds = useAppStore((s) => s.feeds);
  const feedStocks = useAppStore((s) => s.feedStocks);
  const fastingPeriods = useAppStore((s) => s.fastingPeriods);
  const getAllConflicts = useAppStore((s) => s.getAllConflicts);
  const addFastingPeriod = useAppStore((s) => s.addFastingPeriod);
  const updateFastingPeriod = useAppStore((s) => s.updateFastingPeriod);
  const deleteFastingPeriod = useAppStore((s) => s.deleteFastingPeriod);
  const updateFeedStock = useAppStore((s) => s.updateFeedStock);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const conflicts = useMemo(() => getAllConflicts(), [getAllConflicts]);
  const spMap = useMemo(() => Object.fromEntries(species.map((s) => [s.id, s])), [species]);

  const lowStock = useMemo(() => {
    return feedStocks
      .map((st) => {
        const feed = feeds.find((f) => f.id === st.feedId);
        if (!feed) return null;
        return { feed, stock: st };
      })
      .filter((x): x is { feed: any; stock: any } => !!x && x.stock.currentStock < x.feed.safetyThreshold);
  }, [feedStocks, feeds]);

  const activeFasting = useMemo(
    () => fastingPeriods.filter((f) => dateInRange(todayISO(), f.startDate, f.endDate)),
    [fastingPeriods],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl text-ocean-900">预警中心</h2>
        <p className="text-sm text-ocean-600 mt-1">统一管理库存、禁食期与所有排班冲突</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-coral-100 text-coral-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="section-title text-base">排班冲突</span>
            </div>
            <span className={`text-xl font-display ${conflicts.length > 0 ? 'text-coral-600' : 'text-aqua-600'}`}>
              {conflicts.length}
            </span>
          </div>
          <div className="text-xs text-ocean-500">
            错误 {conflicts.filter((c) => c.severity === 'error').length} · 警告 {conflicts.filter((c) => c.severity === 'warning').length}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <span className="section-title text-base">库存不足</span>
            </div>
            <span className={`text-xl font-display ${lowStock.length > 0 ? 'text-coral-600' : 'text-aqua-600'}`}>
              {lowStock.length}
            </span>
          </div>
          <div className="text-xs text-ocean-500">低于安全阈值的饲料种类</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-ocean-100 text-ocean-700 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <span className="section-title text-base">禁食中</span>
            </div>
            <span className={`text-xl font-display ${activeFasting.length > 0 ? 'text-coral-600' : 'text-aqua-600'}`}>
              {activeFasting.length}
            </span>
          </div>
          <div className="text-xs text-ocean-500">今日处于禁食期的物种</div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-coral-600" />
            <h3 className="section-title">冲突检测汇总</h3>
          </div>
        </div>
        {conflicts.length === 0 ? (
          <div className="py-10 text-center text-ocean-500 text-sm">
            <span className="text-3xl mb-2 block">🎉</span>
            当前所有排班均无冲突，状态良好
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map((c: ConflictAlert) => {
              const Icon = alertIcon[c.type] || AlertTriangle;
              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    c.severity === 'error'
                      ? 'bg-coral-50 border-coral-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      c.severity === 'error' ? 'bg-coral-500 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-ocean-900">{alertLabel[c.type]}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          c.severity === 'error' ? 'bg-coral-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {c.severity === 'error' ? '错误' : '警告'}
                      </span>
                    </div>
                    <div className="text-sm text-ocean-700 mt-0.5">{c.message}</div>
                  </div>
                  <button
                    className="btn-secondary !py-1 !px-2 text-xs shrink-0"
                    onClick={() => {
                      setViewMode('week');
                    }}
                  >
                    查看排班 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <h3 className="section-title">饲料库存监控</h3>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {feeds.map((f) => {
            const st = feedStocks.find((s) => s.feedId === f.id);
            const current = st?.currentStock ?? 0;
            const low = current < f.safetyThreshold;
            const pct = Math.min(100, Math.round((current / Math.max(f.safetyThreshold * 2, 1)) * 100));
            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border ${
                  low ? 'border-coral-200 bg-coral-50/40' : 'border-ocean-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-ocean-900">{f.name}</div>
                  {low && <span className="badge-warning animate-pulse-slow">库存不足</span>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display text-ocean-900">{current}</span>
                  <span className="text-xs text-ocean-500">{f.unit}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-ocean-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      low ? 'bg-coral-500' : 'bg-aqua-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    className="input !py-1 text-xs flex-1"
                    value={current}
                    onChange={(e) => updateFeedStock(f.id, Number(e.target.value))}
                  />
                  <span className="text-[11px] text-ocean-500">阈值 {f.safetyThreshold}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FastingManager
        species={species}
        spMap={spMap}
        periods={fastingPeriods}
        addPeriod={addFastingPeriod}
        updatePeriod={updateFastingPeriod}
        deletePeriod={deleteFastingPeriod}
      />
    </div>
  );
}

interface FastingProps {
  species: any[];
  spMap: Record<string, any>;
  periods: FastingPeriod[];
  addPeriod: (f: Omit<FastingPeriod, 'id'>) => void;
  updatePeriod: (id: string, f: Partial<FastingPeriod>) => void;
  deletePeriod: (id: string) => void;
}

function FastingManager({ species, spMap, periods, addPeriod, updatePeriod, deletePeriod }: FastingProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<FastingPeriod, 'id'>>({
    speciesId: species[0]?.id || '',
    startDate: todayISO(),
    endDate: todayISO(),
    reason: '',
  });

  const openCreate = () => {
    setCreating(true);
    setEditingId(null);
    setForm({ speciesId: species[0]?.id || '', startDate: todayISO(), endDate: todayISO(), reason: '' });
  };
  const close = () => {
    setCreating(false);
    setEditingId(null);
  };
  const submitCreate = () => {
    addPeriod(form);
    close();
  };
  const startEdit = (p: FastingPeriod) => {
    setEditingId(p.id);
    setCreating(false);
    setForm({ speciesId: p.speciesId, startDate: p.startDate, endDate: p.endDate, reason: p.reason });
  };
  const submitEdit = () => {
    if (!editingId) return;
    updatePeriod(editingId, form);
    close();
  };

  const renderForm = () => (
    <tr className="bg-ocean-50/60">
      <td className="py-2 px-3">
        <select className="input !py-1 text-xs" value={form.speciesId} onChange={(e) => setForm({ ...form, speciesId: e.target.value })}>
          {species.map((s) => (
            <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
          ))}
        </select>
      </td>
      <td className="py-2 px-3">
        <input type="date" className="input !py-1 text-xs" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      </td>
      <td className="py-2 px-3">
        <input type="date" className="input !py-1 text-xs" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
      </td>
      <td className="py-2 px-3">
        <input className="input !py-1 text-xs" placeholder="原因（如体检、产后）" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </td>
      <td className="py-2 px-3 text-right">
        <div className="inline-flex gap-1">
          <button className="btn-primary !py-1 !px-2 text-xs" onClick={editingId ? submitEdit : submitCreate}>
            <Save className="w-3 h-3" /> 保存
          </button>
          <button className="btn-ghost !py-1 !px-2" onClick={close}>
            <X className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-ocean-600" />
          <h3 className="section-title">物种禁食期管理</h3>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4" /> 新增禁食期
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-100 text-left text-xs text-ocean-500 uppercase tracking-wide">
              <th className="py-2.5 px-3 font-medium">物种</th>
              <th className="py-2.5 px-3 font-medium">开始日期</th>
              <th className="py-2.5 px-3 font-medium">结束日期</th>
              <th className="py-2.5 px-3 font-medium">原因</th>
              <th className="py-2.5 px-3 w-24 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {creating && renderForm()}
            {editingId && renderForm()}
            {periods
              .filter((p) => p.id !== editingId)
              .map((p) => {
                const sp = spMap[p.speciesId];
                const active = dateInRange(todayISO(), p.startDate, p.endDate);
                return (
                  <tr key={p.id} className="border-b border-ocean-50 hover:bg-ocean-50/40 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{sp?.emoji}</span>
                        <span className="font-medium text-ocean-900">{sp?.name}</span>
                        {active && <span className="badge-warning">进行中</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-ocean-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-ocean-400" />
                        {formatDate(p.startDate)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-ocean-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-ocean-400" />
                        {formatDate(p.endDate)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-ocean-600">{p.reason || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex gap-1">
                        <button className="btn-ghost !p-1.5" onClick={() => startEdit(p)} title="编辑">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost !p-1.5 hover:text-coral-600"
                          onClick={() => {
                            if (confirm('确认删除此禁食期？')) deletePeriod(p.id);
                          }}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {periods.length === 0 && !creating && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-ocean-500">
                  暂无禁食期，健康投喂状态良好
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
