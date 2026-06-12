import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Boxes, Calendar, Wrench, Droplets } from 'lucide-react';
import { useRentalStore } from '@/store/rentalStore';
import {
  categoryEmoji,
  categoryLabel,
  cleaningLabel,
  cleaningColor,
  statusColor,
  statusLabel,
  formatDateTime,
  currency,
} from '@/components/ui/helpers';
import type { EquipmentCategory, EquipmentStatus } from '../../shared/types.js';

export default function EquipmentPage() {
  const { equipment, loadEquipment, loadRentals } = useRentalStore();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all');

  useEffect(() => {
    void loadEquipment();
    void loadRentals();
  }, [loadEquipment, loadRentals]);

  const filtered = useMemo(() => {
    return equipment.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (
          !e.name.toLowerCase().includes(q) &&
          !e.model.toLowerCase().includes(q) &&
          !String(e.id).includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [equipment, query, statusFilter, categoryFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: equipment.length };
    for (const e of equipment) c[e.status] = (c[e.status] || 0) + 1;
    return c;
  }, [equipment]);

  return (
    <div className="space-y-5">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bark-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索装备名称、型号或编号..."
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white focus:outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-100 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-bark-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as EquipmentCategory | 'all')}
              className="px-3 py-2.5 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-forest-400"
            >
              <option value="all">全部类别</option>
              {(Object.keys(categoryLabel) as EquipmentCategory[]).map((c) => (
                <option key={c} value={c}>
                  {categoryEmoji[c]} {categoryLabel[c]}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'available', 'rented', 'cleaning', 'repairing'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    statusFilter === s
                      ? 'bg-forest-800 text-white shadow-soft'
                      : 'bg-cream-100 text-bark-600 hover:bg-cream-200'
                  }`}
                >
                  {s === 'all' ? '全部' : statusLabel[s]}
                  <span className="ml-1.5 opacity-75">{counts[s] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white/70 rounded-2xl border border-cream-200 p-16 text-center text-bark-400">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">没有匹配的装备</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((eq, idx) => (
            <div
              key={eq.id}
              className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-cream-200 shadow-soft overflow-hidden hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div
                className={`h-24 relative flex items-center justify-center text-6xl ${
                  eq.status === 'available'
                    ? 'bg-gradient-to-br from-forest-50 to-forest-100'
                    : eq.status === 'rented'
                    ? 'bg-gradient-to-br from-ember-50 to-ember-100'
                    : eq.status === 'cleaning'
                    ? 'bg-gradient-to-br from-amber-50 to-amber-100'
                    : 'bg-gradient-to-br from-rose-50 to-rose-100'
                }`}
              >
                <span className="opacity-70">{categoryEmoji[eq.category]}</span>
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                      statusColor[eq.status]
                    }`}
                  >
                    {statusLabel[eq.status]}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 text-[11px] text-bark-500 font-medium">
                  #{eq.id}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="font-semibold text-bark-800 leading-tight">{eq.name}</div>
                  <div className="text-xs text-bark-400 mt-0.5">
                    {categoryLabel[eq.category]} · {eq.model}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bark-500">押金</span>
                  <span className="font-semibold text-bark-800">{currency(eq.deposit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-bark-500">日租</span>
                  <span className="font-semibold text-forest-700">{currency(eq.dailyRate)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-bark-500">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  上次清洁：{formatDateTime(eq.lastCleanedAt)}
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-bark-500 mb-1.5">配件清单</div>
                  <div className="flex flex-wrap gap-1">
                    {eq.accessories.map((a) => (
                      <span
                        key={a}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-cream-100 text-bark-600"
                      >
                        {a}
                      </span>
                    ))}
                    {eq.accessories.length === 0 && (
                      <span className="text-[11px] text-bark-400">无配件</span>
                    )}
                  </div>
                </div>

                {eq.status === 'cleaning' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                    <Droplets className="w-3.5 h-3.5 shrink-0" />
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${cleaningColor.pending}`}>
                      {cleaningLabel.pending}
                    </span>
                    清洁完成后才能再次出租
                  </div>
                )}
                {eq.status === 'repairing' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700">
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    维修中
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
