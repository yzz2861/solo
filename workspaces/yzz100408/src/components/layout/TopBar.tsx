import { useAnalysisStore } from '@/store';
import { Database, DatabaseZap, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { formatDate } from '@/utils/date';

export default function TopBar() {
  const {
    orders, isUsingMockData, loadMockData, clearAllData, filters, setFilter,
  } = useAnalysisStore();

  useEffect(() => {
    if (orders.length === 0) loadMockData();
  }, [orders.length, loadMockData]);

  const availableDates = Array.from(new Set(orders.map(o => formatDate(o.queueStartTime)))).sort();

  return (
    <header className="h-16 shrink-0 bg-electric-blue/60 backdrop-blur-sm border-b border-white/5 flex items-center px-6 gap-4">
      <div className="flex items-center gap-2">
        {isUsingMockData ? (
          <span className="chip chip-active gap-1.5">
            <DatabaseZap className="w-3 h-3" />
            DEMO 数据
          </span>
        ) : orders.length > 0 ? (
          <span className="chip chip-active gap-1.5">
            <Database className="w-3 h-3" />
            {orders.length} 笔订单
          </span>
        ) : (
          <span className="chip gap-1.5">
            <Database className="w-3 h-3" />
            暂无数据
          </span>
        )}
      </div>

      <div className="flex-1" />

      {availableDates.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-slate-dark">分析日期</span>
          <select
            value={filters.selectedDate}
            onChange={e => setFilter('selectedDate', e.target.value)}
            className="input-field w-auto font-mono text-xs"
          >
            {availableDates.map(d => (
              <option key={d} value={d} className="bg-electric-blue">{d}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={loadMockData}
          className="btn text-xs gap-1.5"
          title="重新加载演示数据"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          演示数据
        </button>
        {orders.length > 0 && !isUsingMockData && (
          <button
            onClick={clearAllData}
            className="btn btn-danger text-xs gap-1.5"
            title="清空所有数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        )}
      </div>
    </header>
  );
}
