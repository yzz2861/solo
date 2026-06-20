import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, RotateCcw, Save, Wrench, Home } from 'lucide-react';
import { DimensionInput } from '@/components/form/DimensionInput';
import { SlopeInput } from '@/components/form/SlopeInput';
import { RainfallInput } from '@/components/form/RainfallInput';
import { DrainInput } from '@/components/form/DrainInput';
import { RiskIndicator, WarningList } from '@/components/display/RiskIndicator';
import { ResultSummary } from '@/components/display/ResultSummary';
import { useDrainageCalculation } from '@/hooks/useDrainageCalculation';
import { useCalculationStore } from '@/store/useCalculationStore';
import { generateContractorReport, generateOwnerReport } from '@/utils/reportGenerator';
import { cn } from '@/lib/utils';

export default function Calculator() {
  const navigate = useNavigate();
  const { result } = useDrainageCalculation();
  const saveRecord = useCalculationStore((state) => state.saveRecord);
  const resetInput = useCalculationStore((state) => state.resetInput);
  const projectName = useCalculationStore((state) => state.projectName);
  const setProjectName = useCalculationStore((state) => state.setProjectName);
  const currentRecordId = useCalculationStore((state) => state.currentRecordId);
  const exportDisclosure = useCalculationStore((state) => state.exportDisclosure);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = () => {
    const record = saveRecord();
    if (record) {
      setSaveMessage('记录已保存');
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有输入吗？')) {
      resetInput();
    }
  };

  const handleViewContractorReport = () => {
    if (result) {
      navigate('/report/contractor');
    }
  };

  const handleViewOwnerReport = () => {
    if (result) {
      navigate('/report/owner');
    }
  };

  const handleExportDisclosure = () => {
    if (currentRecordId) {
      exportDisclosure(currentRecordId);
    } else {
      const record = saveRecord();
      if (record) {
        exportDisclosure(record.id);
      }
    }
  };

  const contractorReport = result ? generateContractorReport(useCalculationStore.getState().input, result) : null;
  const ownerReport = result && currentRecordId
    ? generateOwnerReport(useCalculationStore.getState().input, result, currentRecordId)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-800 mb-2">排水坡度核算</h2>
        <p className="text-zinc-500">输入雨棚参数，系统自动计算排水能力和积水风险</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-600 mb-1">
          项目名称（可选）
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="例如：XX商铺雨棚改造工程"
          className="w-full h-10 px-3 text-sm border-2 border-zinc-300 focus:outline-none focus:border-blue-700 transition-colors"
        />
      </div>

      {result && result.warnings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-zinc-700 mb-2">智能提示</h3>
          <WarningList warnings={result.warnings} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <DimensionInput />
          <SlopeInput />
        </div>
        <div className="space-y-4">
          <RainfallInput />
          <DrainInput />
        </div>
      </div>

      {result && (
        <>
          <div className="mb-6">
            <RiskIndicator
              riskLevel={result.riskLevel}
              积水系数={result.积水系数}
            />
          </div>

          <div className="mb-6">
            <ResultSummary result={result} />
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={handleViewContractorReport}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-all',
                'bg-blue-700 text-white border-blue-700 hover:bg-blue-800 hover:shadow-lg'
              )}
            >
              <Wrench className="w-4 h-4" />
              查看施工队报告
            </button>

            <button
              onClick={handleViewOwnerReport}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-all',
                'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
              )}
            >
              <Home className="w-4 h-4" />
              查看业主报告
            </button>

            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-all',
                'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800 hover:shadow-lg'
              )}
            >
              <Save className="w-4 h-4" />
              保存记录
              {saveMessage && (
                <span className="text-emerald-200 ml-1">✓</span>
              )}
            </button>

            <button
              onClick={handleExportDisclosure}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-all',
                'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:shadow-lg'
              )}
            >
              <Download className="w-4 h-4" />
              导出交底单
            </button>

            <button
              onClick={handleReset}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 transition-all',
                'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
              )}
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>

          {contractorReport && (
            <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">评估结论摘要</span>
              </div>
              <p className="text-sm text-zinc-600">{contractorReport.summary}</p>
            </div>
          )}

          {ownerReport && (
            <div className="p-4 bg-zinc-50 border border-zinc-200">
              <p className="text-sm text-zinc-700">{ownerReport.summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
