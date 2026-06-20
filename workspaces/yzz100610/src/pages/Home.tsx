import { useEffect } from 'react';
import { useCalculatorStore } from '@/stores/calculatorStore';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { ProcurementForm } from '@/components/ProcurementForm';
import { ProcurementResult } from '@/components/ProcurementResult';
import { WarehouseForm } from '@/components/WarehouseForm';
import { WarehouseResult } from '@/components/WarehouseResult';
import { WarningList } from '@/components/WarningList';
import { Box, Calculator } from 'lucide-react';

export default function Home() {
  const { viewMode, result, calculate } = useCalculatorStore();

  useEffect(() => {
    calculate();
  }, [calculate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Box size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">纸箱堆码抗压估算</h1>
                <p className="text-xs text-slate-500">专业包装工程计算工具</p>
              </div>
            </div>
            <ViewSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 sticky top-24">
              <div className="flex items-center gap-2 mb-5">
              <Calculator size={18} className="text-blue-500" />
              <h2 className="font-semibold text-slate-800">
                {viewMode === 'procurement' ? '参数设置' : '快速输入'}
              </h2>
            </div>
            {viewMode === 'procurement' ? <ProcurementForm /> : <WarehouseForm />}
          </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {result && result.warnings.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">提示与警告</h3>
                <WarningList warnings={result.warnings} />
              </div>
            )}

            {viewMode === 'procurement' ? <ProcurementResult /> : <WarehouseResult />}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>本工具仅供参考，实际堆码请结合现场情况判断 | 建议安全系数 ≥ 2.5</p>
        </div>
      </main>
    </div>
  );
}
