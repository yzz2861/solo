import { useState, useMemo } from 'react'
import type { DisinfectantType, ConcentrationUnit, VolumeUnit, ValidationResult } from '@/types'
import { DISINFECTANT_LABELS } from '@/types'
import { calculateDilution } from '@/utils/calculation'
import { validateDilution } from '@/utils/validation'
import { useDilutionStore } from '@/store/useDilutionStore'

import { AlertTriangle, AlertCircle, Info, Printer, Archive, CheckCircle2 } from 'lucide-react'

const TYPE_ICONS: Record<DisinfectantType, string> = {
  '84': '🧴',
  quaternary_ammonium: '🧪',
  alcohol: '💧',
}

const BANNER_STYLES: Record<ValidationResult['level'], string> = {
  block: 'bg-red-50 border-red-300 text-red-800',
  warn: 'bg-orange-50 border-orange-300 text-orange-800',
  info: 'bg-yellow-50 border-yellow-300 text-yellow-800',
}

const BANNER_ICONS: Record<ValidationResult['level'], typeof AlertCircle> = {
  block: AlertCircle,
  warn: AlertTriangle,
  info: Info,
}

export default function Calculator() {
  const { presets, records, addRecord } = useDilutionStore()
  const scenarioNames = [...new Set(presets.map(p => p.scenarioName))]

  const [disinfectantType, setDisinfectantType] = useState<DisinfectantType>('84')
  const [stockConcentration, setStockConcentration] = useState<number>(0)
  const [stockConcentrationUnit, setStockConcentrationUnit] = useState<ConcentrationUnit>('%')
  const [containerVolume, setContainerVolume] = useState<number>(0)
  const [containerVolumeUnit, setContainerVolumeUnit] = useState<VolumeUnit>('mL')
  const [usageScenario, setUsageScenario] = useState('')
  const [targetConcentration, setTargetConcentration] = useState<number>(0)
  const [targetConcentrationUnit, setTargetConcentrationUnit] = useState<ConcentrationUnit>('mg/L')
  const [operatorName, setOperatorName] = useState('')

  const hasBlock = (v: number) => v <= 0 || isNaN(v)
  const allInputsValid = !hasBlock(stockConcentration) && !hasBlock(targetConcentration) && !hasBlock(containerVolume)

  const validations = useMemo(() => {
    if (!allInputsValid) return []
    return validateDilution(
      disinfectantType, stockConcentration, stockConcentrationUnit,
      targetConcentration, targetConcentrationUnit,
      containerVolume, containerVolumeUnit,
      usageScenario, presets, records,
    )
  }, [disinfectantType, stockConcentration, stockConcentrationUnit, targetConcentration, targetConcentrationUnit, containerVolume, containerVolumeUnit, usageScenario, presets, records, allInputsValid])

  const hasBlockLevel = validations.some(v => v.level === 'block')

  const calculation = useMemo(() => {
    if (!allInputsValid || hasBlockLevel) return null
    return calculateDilution(
      stockConcentration, stockConcentrationUnit,
      targetConcentration, targetConcentrationUnit,
      containerVolume, containerVolumeUnit,
    )
  }, [stockConcentration, stockConcentrationUnit, targetConcentration, targetConcentrationUnit, containerVolume, containerVolumeUnit, allInputsValid, hasBlockLevel])

  const hasWarnings = validations.some(v => v.level === 'warn')

  function handleScenarioSelect(name: string) {
    if (name === '自定义') {
      setUsageScenario('')
      return
    }
    setUsageScenario(name)
    const preset = presets.find(p => p.scenarioName === name)
    if (preset) {
      setTargetConcentration(preset.recommendedConcentration)
      setTargetConcentrationUnit(preset.concentrationUnit)
      if (preset.recommendedType !== disinfectantType) {
        setDisinfectantType(preset.recommendedType)
      }
    }
  }

  function saveRecord(recordType: 'print' | 'archive') {
    if (!calculation) return
    addRecord({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      disinfectantType,
      stockConcentration,
      stockConcentrationUnit,
      targetConcentration,
      targetConcentrationUnit,
      containerVolume,
      containerVolumeUnit,
      stockAmount: calculation.stockAmount,
      stockAmountUnit: calculation.stockAmountUnit,
      waterAmount: calculation.waterAmount,
      waterAmountUnit: calculation.waterAmountUnit,
      usageScenario,
      operatorName,
      recordType,
      warnings: validations.map(v => v.message),
    })
  }

  function handlePrint() {
    saveRecord('print')
    window.print()
  }

  function handleArchive() {
    saveRecord('archive')
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 pb-28">
      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">原液信息</h2>
        <div className="grid grid-cols-3 gap-3">
          {(['84', 'quaternary_ammonium', 'alcohol'] as DisinfectantType[]).map(t => {
            const active = disinfectantType === t
            return (
              <button key={t} onClick={() => setDisinfectantType(t)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${active ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-gray-200 bg-white text-gray-600 hover:border-sky-300'}`}>
                <span className="text-2xl">{TYPE_ICONS[t]}</span>
                <span className="text-sm font-medium">{DISINFECTANT_LABELS[t]}</span>
              </button>
            )
          })}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">原液浓度</label>
            <div className="flex gap-2">
              <input type="number" min="0" value={stockConcentration || ''} onChange={e => setStockConcentration(Number(e.target.value))}
                className="flex-1 text-2xl font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                {(['%', 'mg/L'] as ConcentrationUnit[]).map(u => (
                  <button key={u} onClick={() => setStockConcentrationUnit(u)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${stockConcentrationUnit === u ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">容器体积</label>
            <div className="flex gap-2">
              <input type="number" min="0" value={containerVolume || ''} onChange={e => setContainerVolume(Number(e.target.value))}
                className="flex-1 text-2xl font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                {(['mL', 'L'] as VolumeUnit[]).map(u => (
                  <button key={u} onClick={() => setContainerVolumeUnit(u)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${containerVolumeUnit === u ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{u}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">目标参数</h2>
        <div className="flex flex-wrap gap-2">
          {scenarioNames.map(name => (
            <button key={name} onClick={() => handleScenarioSelect(name)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${usageScenario === name ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{name}</button>
          ))}
          <button onClick={() => handleScenarioSelect('自定义')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!usageScenario ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>自定义</button>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">目标浓度</label>
          <div className="flex gap-2">
            <input type="number" min="0" value={targetConcentration || ''} onChange={e => setTargetConcentration(Number(e.target.value))}
              className="flex-1 text-2xl font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none" />
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              {(['%', 'mg/L'] as ConcentrationUnit[]).map(u => (
                <button key={u} onClick={() => setTargetConcentrationUnit(u)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${targetConcentrationUnit === u ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{u}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {calculation && (
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">计算结果</h2>
            <span className={`flex items-center gap-1.5 text-sm font-medium ${hasWarnings ? 'text-orange-600' : 'text-emerald-600'}`}>
              {hasWarnings ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {hasWarnings ? '有警告' : '安全'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-sky-50 rounded-xl p-4 text-center">
              <div className="text-sm text-sky-700 mb-1">原液用量</div>
              <div className="text-3xl font-mono font-bold text-sky-600">{calculation.stockAmount}</div>
              <div className="text-sm text-sky-600 mt-0.5">{calculation.stockAmountUnit}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-sm text-blue-700 mb-1">加水量</div>
              <div className="text-3xl font-mono font-bold text-blue-600">{calculation.waterAmount}</div>
              <div className="text-sm text-blue-600 mt-0.5">{calculation.waterAmountUnit}</div>
            </div>
          </div>
        </section>
      )}

      {validations.length > 0 && (
        <section className="space-y-2">
          {validations.map((v, i) => {
            const Icon = BANNER_ICONS[v.level]
            return (
              <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${BANNER_STYLES[v.level]}`}>
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm">{v.message}</span>
              </div>
            )
          })}
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 print:hidden">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="操作人"
            className="w-24 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
          <button onClick={handlePrint} disabled={!calculation}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Printer className="w-4 h-4" />打印版
          </button>
          <button onClick={handleArchive} disabled={!calculation}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Archive className="w-4 h-4" />留档版
          </button>
        </div>
      </div>
    </div>
  )
}
