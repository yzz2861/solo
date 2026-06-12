import { useAnalysisStore } from '@/store';
import { PriceType } from '@/types';
import { getPriceTypeLabel } from '@/utils/format';
import { Filter } from 'lucide-react';

const PRICE_TYPES: PriceType[] = ['peak', 'flat', 'valley', 'promotion'];

export default function MultiDimensionFilter() {
  const { filters, setFilter, resetFilters, orders, gunIds } = useAnalysisStore();
  const vehicleModels = Array.from(new Set(orders.map(o => o.vehicleModel))).sort();

  const toggleInArray = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="section-title">
          <Filter className="w-4 h-4" />
          维度筛选
        </div>
        <button onClick={resetFilters} className="text-xs text-neutral-slate-dark hover:text-electric-green transition-colors">
          重置
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-neutral-slate-dark mb-2 font-mono">枪位</div>
          <div className="flex flex-wrap gap-1.5">
            {gunIds.map(g => (
              <button
                key={g}
                onClick={() => setFilter('selectedGuns', toggleInArray(filters.selectedGuns, g))}
                className={`chip ${filters.selectedGuns.length === 0 || filters.selectedGuns.includes(g) ? 'chip-active' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div>
          <div className="text-xs text-neutral-slate-dark mb-2 font-mono">电价时段</div>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_TYPES.map(p => (
              <button
                key={p}
                onClick={() => setFilter('selectedPriceTypes', toggleInArray(filters.selectedPriceTypes, p))}
                className={`chip ${filters.selectedPriceTypes.length === 0 || filters.selectedPriceTypes.includes(p) ? 'chip-active' : ''}`}
              >
                {getPriceTypeLabel(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div>
          <div className="text-xs text-neutral-slate-dark mb-2 font-mono">车型</div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
            {vehicleModels.map(m => (
              <button
                key={m}
                onClick={() => setFilter('selectedVehicleModels', toggleInArray(filters.selectedVehicleModels, m))}
                className={`chip text-[10px] ${filters.selectedVehicleModels.includes(m) ? 'chip-active' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div>
          <div className="text-xs text-neutral-slate-dark mb-2 font-mono">
            时段范围: {filters.hourRange[0].toString().padStart(2, '0')}:00 — {filters.hourRange[1].toString().padStart(2, '0')}:00
          </div>
          <div className="flex items-center gap-3 px-1">
            <input
              type="range" min={0} max={24} value={filters.hourRange[0]}
              onChange={e => setFilter('hourRange', [Math.min(Number(e.target.value), filters.hourRange[1]), filters.hourRange[1]])}
              className="flex-1 accent-electric-green"
            />
            <input
              type="range" min={0} max={24} value={filters.hourRange[1]}
              onChange={e => setFilter('hourRange', [filters.hourRange[0], Math.max(Number(e.target.value), filters.hourRange[0])])}
              className="flex-1 accent-electric-green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
