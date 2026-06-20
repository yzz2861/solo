import { useEffect } from 'react';
import { Calculator as CalcIcon, History, Save, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import EcInput from '@/components/EcInput';
import VolumeInput from '@/components/VolumeInput';
import CropStageSelect from '@/components/CropStageSelect';
import ResultCard from '@/components/ResultCard';
import WarningList from '@/components/WarningList';
import ModeSwitch from '@/components/ModeSwitch';
import StepGuide from '@/components/StepGuide';
import CalculationProcess from '@/components/CalculationProcess';

export default function Calculator() {
  const { mode, input, result, setMode, updateInput, calculate, saveToHistory, loadHistory } =
    useCalculatorStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    calculate();
  }, [input]);

  const handleSave = () => {
    saveToHistory();
    alert('已保存到历史记录');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
              <Leaf className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">EC营养液稀释计算器</h1>
              <p className="text-xs text-gray-500">水培种植好帮手</p>
            </div>
          </div>
          <Link
            to="/history"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <History size={20} />
            <span className="hidden sm:inline">历史记录</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-6">
          <ModeSwitch mode={mode} onChange={setMode} />
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <CalcIcon size={22} className="text-green-600" />
                输入参数
              </h2>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <EcInput
                    label="当前EC值"
                    value={input.currentEc}
                    unit={input.currentEcUnit}
                    onChange={(v) => updateInput('currentEc', v)}
                    onUnitChange={(u) => updateInput('currentEcUnit', u)}
                  />
                  <EcInput
                    label="目标EC值"
                    value={input.targetEc}
                    unit={input.targetEcUnit}
                    onChange={(v) => updateInput('targetEc', v)}
                    onUnitChange={(u) => updateInput('targetEcUnit', u)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <VolumeInput
                    label="水箱现有体积"
                    value={input.tankVolume}
                    unit={input.tankVolumeUnit}
                    onChange={(v) => updateInput('tankVolume', v)}
                    onUnitChange={(u) => updateInput('tankVolumeUnit', u)}
                  />
                  <VolumeInput
                    label="已补水量"
                    value={input.waterVolume}
                    unit={input.waterVolumeUnit}
                    onChange={(v) => updateInput('waterVolume', v)}
                    onUnitChange={(u) => updateInput('waterVolumeUnit', u)}
                  />
                </div>

                <EcInput
                  label="母液EC浓度"
                  value={input.stockEc}
                  unit={input.stockEcUnit}
                  onChange={(v) => updateInput('stockEc', v)}
                  onUnitChange={(u) => updateInput('stockEcUnit', u)}
                />

                <CropStageSelect
                  value={input.cropStage}
                  onChange={(v) => updateInput('cropStage', v)}
                />
              </div>

              {result && result.warnings.length > 0 && (
                <div className="mt-6">
                  <WarningList warnings={result.warnings} />
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!result || result.actionType === 'no_action'}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                <Save size={20} />
                保存本次记录
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {result && <ResultCard result={result} />}

            {result && mode === 'farmer' && <StepGuide result={result} />}

            {result && mode === 'technician' && <CalculationProcess result={result} />}

            {!result && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CalcIcon size={40} className="text-green-500" />
                </div>
                <p className="text-gray-500">输入参数后自动计算结果</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 text-center text-sm text-gray-400">
        <p>水培营养液EC稀释计算器 · 让种植更简单</p>
      </footer>
    </div>
  );
}
