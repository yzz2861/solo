import { useState, useCallback, useMemo } from 'react';
import type { CalculationInput, DoseUnit, ConcentrationUnit, TimeUnit } from '@/types';
import { calculate } from '@/utils/calculation';
import ResultPanel from '@/components/ResultPanel';
import { useRecordStore } from '@/store/recordStore';
import { Droplets, Save, RotateCcw, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const DOSE_UNITS: DoseUnit[] = ['mg/kg/min', 'μg/kg/h', 'mg/h', 'μg/h', 'mg', 'μg', 'g'];
const CONC_UNITS: ConcentrationUnit[] = ['mg/mL', 'μg/mL', 'g/mL', 'mg/50mL', 'mg/100mL', 'mg/250mL', 'mg/500mL'];
const TIME_UNITS: TimeUnit[] = ['h', 'min'];

const defaultInput: CalculationInput = {
  drugName: '',
  doseValue: 0,
  doseUnit: 'mg/kg/min',
  concentration: 0,
  concentrationUnit: 'mg/mL',
  totalVolume: 0,
  volumeUnit: 'mL',
  weight: 0,
  weightUnit: 'kg',
  plannedTime: 0,
  timeUnit: 'h',
};

export default function Calculator() {
  const [input, setInput] = useState<CalculationInput>(defaultInput);
  const [confirmedBy, setConfirmedBy] = useState('');
  const [saved, setSaved] = useState(false);
  const addRecord = useRecordStore((s) => s.addRecord);

  const result = useMemo(() => calculate(input), [input]);

  const update = useCallback(
    <K extends keyof CalculationInput>(key: K, value: CalculationInput[K]) => {
      setInput((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    []
  );

  const handleReset = useCallback(() => {
    setInput(defaultInput);
    setConfirmedBy('');
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!confirmedBy.trim()) return;
    addRecord({
      id: crypto.randomUUID(),
      input: { ...input },
      result,
      confirmedBy: confirmedBy.trim(),
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  }, [input, result, confirmedBy, addRecord]);

  const canSave = confirmedBy.trim().length > 0 && !saved;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">输液泵剂量核对器</h1>
              <p className="text-xs text-slate-400">Infusion Pump Dosage Checker</p>
            </div>
          </div>
          <Link
            to="/records"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            核对记录
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-600 mb-4 tracking-wide uppercase">
                参数输入
              </h2>
              <div className="space-y-4">
                <FieldGroup label="药品名称">
                  <input
                    type="text"
                    value={input.drugName}
                    onChange={(e) => update('drugName', e.target.value)}
                    placeholder="如：多巴胺"
                    className="input-field"
                  />
                </FieldGroup>

                <FieldGroup label="医嘱剂量">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={input.doseValue || ''}
                      onChange={(e) => update('doseValue', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="input-field flex-1"
                    />
                    <select
                      value={input.doseUnit}
                      onChange={(e) => update('doseUnit', e.target.value as DoseUnit)}
                      className="input-field w-32"
                    >
                      {DOSE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </FieldGroup>

                <FieldGroup label="药液浓度">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={input.concentration || ''}
                      onChange={(e) => update('concentration', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`input-field flex-1 ${input.concentration === 0 ? 'ring-2 ring-red-300' : ''}`}
                    />
                    <select
                      value={input.concentrationUnit}
                      onChange={(e) => update('concentrationUnit', e.target.value as ConcentrationUnit)}
                      className="input-field w-32"
                    >
                      {CONC_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </FieldGroup>

                <FieldGroup label="药液总量">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={input.totalVolume || ''}
                      onChange={(e) => update('totalVolume', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="input-field flex-1"
                    />
                    <span className="input-field w-16 text-center text-slate-500 pointer-events-none">mL</span>
                  </div>
                </FieldGroup>

                <FieldGroup label="患者体重">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={input.weight || ''}
                      onChange={(e) => update('weight', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`input-field flex-1 ${input.weight === 0 ? 'ring-2 ring-amber-300' : ''}`}
                    />
                    <span className="input-field w-16 text-center text-slate-500 pointer-events-none">kg</span>
                  </div>
                </FieldGroup>

                <FieldGroup label="计划时间">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={input.plannedTime || ''}
                      onChange={(e) => update('plannedTime', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="input-field flex-1"
                    />
                    <select
                      value={input.timeUnit}
                      onChange={(e) => update('timeUnit', e.target.value as TimeUnit)}
                      className="input-field w-20"
                    >
                      {TIME_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </FieldGroup>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-600 mb-4 tracking-wide uppercase">
                复核确认
              </h2>
              <div className="space-y-3">
                <FieldGroup label="确认人签名">
                  <input
                    type="text"
                    value={confirmedBy}
                    onChange={(e) => setConfirmedBy(e.target.value)}
                    placeholder="输入姓名"
                    className="input-field"
                  />
                </FieldGroup>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saved ? '已保存' : '确认并保存'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-slate-600 mb-4 tracking-wide uppercase">
                计算结果
              </h2>
              <ResultPanel result={result} input={input} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
