import InputCard from '@/components/InputCard';
import ResultCard from '@/components/ResultCard';
import RecordForm from '@/components/RecordForm';
import WarningList from '@/components/WarningList';
import { useDryingStore } from '@/store/useDryingStore';
import { hasErrors } from '@/utils/validation';
import { Calculator as CalcIcon, AlertTriangle } from 'lucide-react';

export default function Calculator() {
  const { warnings, params } = useDryingStore();

  const showWarnings = warnings.length > 0;
  const hasError = hasErrors(warnings);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-warm mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <CalcIcon className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-warm-800">烘干房排湿估算器</h1>
              <p className="text-sm text-warm-500">红薯片 · 果干 · 农产品烘干参数计算</p>
            </div>
          </div>
        </header>

        {showWarnings && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle
                className={`w-5 h-5 ${hasError ? 'text-red-500' : 'text-amber-500'}`}
              />
              <span
                className={`text-sm font-medium ${hasError ? 'text-red-600' : 'text-amber-600'}`}
              >
                {hasError ? '存在错误，请修正后继续' : '温馨提示'}
              </span>
            </div>
            <WarningList warnings={warnings} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <InputCard />
          </div>

          <div className="lg:col-span-3">
            <ResultCard />
            <RecordForm />
          </div>
        </div>

        <footer className="text-center mt-12 text-sm text-warm-400">
          <p>提示：估算结果仅供参考，实际烘干时间受物料厚度、摆放方式、烘房密封性等因素影响</p>
          <p className="mt-1">建议记录实际数据到经验库，逐步优化估算精度</p>
        </footer>
      </div>
    </div>
  );
}
