import { ViewMode } from '@/types/calculation';
import { useCalculatorStore } from '@/stores/calculatorStore';
import { ShoppingCart, Warehouse } from 'lucide-react';

export function ViewSwitcher() {
  const { viewMode, setViewMode } = useCalculatorStore();

  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      <button
        onClick={() => setViewMode('procurement')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'procurement'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <ShoppingCart size={16} />
        采购版
      </button>
      <button
        onClick={() => setViewMode('warehouse')}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'warehouse'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Warehouse size={16} />
        仓库版
      </button>
    </div>
  );
}
