import { useComplaintStore } from '@/store/useComplaintStore';
import { Filter, X } from 'lucide-react';
import type { ComplaintSource } from '@/types';

export default function FilterPanel() {
  const {
    filters,
    setFilters,
    getUniqueCommunities,
    getUniqueBuildings,
    getUniqueProblemTypes,
    getUniqueStaff,
  } = useComplaintStore();

  const communities = getUniqueCommunities();
  const buildings = getUniqueBuildings();
  const problemTypes = getUniqueProblemTypes();
  const staffList = getUniqueStaff();
  const sources: ComplaintSource[] = ['电话', '业主群', '工单系统', '其他'];

  const toggleItem = <T,>(_list: T[], value: T, field: keyof typeof filters) => {
    const current = filters[field] as T[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ [field]: next } as Partial<typeof filters>);
  };

  const clearAll = () => {
    setFilters({
      communities: [],
      buildings: [],
      problemTypes: [],
      sources: [],
      staffIds: [],
      dateRange: [null, null],
    });
  };

  const hasFilters = 
    filters.communities.length > 0 ||
    filters.buildings.length > 0 ||
    filters.problemTypes.length > 0 ||
    filters.sources.length > 0 ||
    filters.staffIds.length > 0;

  return (
    <aside className="card p-5 h-fit sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold text-warm-800">筛选条件</h3>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-warm-500 hover:text-accent-500 transition-colors"
          >
            <X className="w-3 h-3" />
            清除
          </button>
        )}
      </div>

      <div className="space-y-5">
        <FilterGroup
          label="小区"
          items={communities}
          selected={filters.communities}
          onToggle={(v) => toggleItem(communities, v, 'communities')}
        />
        <FilterGroup
          label="楼栋"
          items={buildings}
          selected={filters.buildings}
          onToggle={(v) => toggleItem(buildings, v, 'buildings')}
        />
        <FilterGroup
          label="问题类型"
          items={problemTypes}
          selected={filters.problemTypes}
          onToggle={(v) => toggleItem(problemTypes, v, 'problemTypes')}
        />
        <FilterGroup
          label="来源"
          items={sources}
          selected={filters.sources}
          onToggle={(v) => toggleItem(sources, v, 'sources')}
        />
        <FilterGroup
          label="负责管家"
          items={staffList.map(s => s.name)}
          selected={staffList.filter(s => filters.staffIds.includes(s.id)).map(s => s.name)}
          onToggle={(name) => {
            const staff = staffList.find(s => s.name === name);
            if (staff) {
              const current = filters.staffIds;
              const next = current.includes(staff.id)
                ? current.filter(v => v !== staff.id)
                : [...current, staff.id];
              setFilters({ staffIds: next });
            }
          }}
        />
      </div>
    </aside>
  );
}

interface FilterGroupProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

function FilterGroup({ label, items, selected, onToggle }: FilterGroupProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 12).map((item) => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                ${isSelected 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'}
              `}
            >
              {item}
            </button>
          );
        })}
        {items.length > 12 && (
          <span className="px-2.5 py-1 text-xs text-warm-400">+{items.length - 12} 更多</span>
        )}
      </div>
    </div>
  );
}
