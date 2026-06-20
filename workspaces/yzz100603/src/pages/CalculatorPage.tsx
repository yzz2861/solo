import { useState, useMemo } from 'react';
import { Calculator, Save, RotateCcw } from 'lucide-react';
import { ParamsForm } from '@/components/ParamsForm';
import { ResultPanel } from '@/components/ResultPanel';
import { WarningBanner } from '@/components/WarningBanner';
import { SaveRecordModal } from '@/components/SaveRecordModal';
import { useAppStore } from '@/store/useAppStore';
import { calculateDose } from '@/utils/calculator';
import { useNavigate } from 'react-router-dom';

export default function CalculatorPage() {
  const { currentParams, chemicals, resetParams, currentUser } = useAppStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const navigate = useNavigate();

  const selectedChemical = chemicals.find((c) => c.id === currentParams.chemicalId);

  const result = useMemo(() => {
    if (!selectedChemical) return null;
    return calculateDose(currentParams, selectedChemical);
  }, [currentParams, selectedChemical]);

  const canSave = result && result.steps.length > 0 && currentUser;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-sky-600" />
            加药量计算
          </h1>
          <p className="text-gray-500 mt-1">输入水质参数，系统自动计算建议加药量</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetParams}
            className="flex items-center gap-1 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存到交班记录
          </button>
        </div>
      </div>

      {result && result.warnings.length > 0 && (
        <WarningBanner warnings={result.warnings} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <ParamsForm />
        </div>
        <div className="lg:col-span-2">
          <ResultPanel result={result} />
        </div>
      </div>

      <SaveRecordModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          navigate('/records');
        }}
        result={result}
      />
    </div>
  );
}
