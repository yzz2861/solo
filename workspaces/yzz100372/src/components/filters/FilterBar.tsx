import { Search, Filter, X } from 'lucide-react';
import { useRecordsStore, useUniqueBatches } from '@/store/useRecordsStore';

const FilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters } = useRecordsStore();
  const batches = useUniqueBatches();

  const hasActiveFilters =
    filters.batch !== '' ||
    filters.onSale !== 'all' ||
    filters.retest !== 'all' ||
    filters.search !== '';

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-paper p-4 border border-coffee-100">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-coffee-600" />
        <span className="font-medium text-coffee-800">筛选</span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-xs text-coffee-500 hover:text-coffee-700 transition-colors"
          >
            <X className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
            <input
              type="text"
              placeholder="搜索产区、批次、杯测人..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-coffee-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        <div className="min-w-[150px]">
          <select
            value={filters.batch}
            onChange={(e) => setFilters({ batch: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-coffee-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white appearance-none cursor-pointer"
          >
            <option value="">全部批次</option>
            {batches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <select
            value={filters.onSale}
            onChange={(e) =>
              setFilters({
                onSale: e.target.value as 'all' | 'yes' | 'no',
              })
            }
            className="w-full px-3 py-2 text-sm border border-coffee-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white appearance-none cursor-pointer"
          >
            <option value="all">全部上架状态</option>
            <option value="yes">已上架</option>
            <option value="no">未上架</option>
          </select>
        </div>

        <div className="min-w-[120px]">
          <select
            value={filters.retest}
            onChange={(e) =>
              setFilters({
                retest: e.target.value as 'all' | 'yes' | 'no',
              })
            }
            className="w-full px-3 py-2 text-sm border border-coffee-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent bg-white appearance-none cursor-pointer"
          >
            <option value="all">全部复测状态</option>
            <option value="yes">需复测</option>
            <option value="no">无需复测</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-coffee-100">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-coffee-100 text-coffee-700 rounded-full">
              搜索: {filters.search}
              <button
                onClick={() => setFilters({ search: '' })}
                className="hover:text-coffee-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.batch && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-coffee-100 text-coffee-700 rounded-full">
              批次: {filters.batch}
              <button
                onClick={() => setFilters({ batch: '' })}
                className="hover:text-coffee-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.onSale !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {filters.onSale === 'yes' ? '已上架' : '未上架'}
              <button
                onClick={() => setFilters({ onSale: 'all' })}
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.retest !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              {filters.retest === 'yes' ? '需复测' : '无需复测'}
              <button
                onClick={() => setFilters({ retest: 'all' })}
                className="hover:text-amber-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
