import { useState, useMemo } from 'react'
import { useDilutionStore } from '@/store/useDilutionStore'
import type { DilutionRecord } from '@/types'
import { DISINFECTANT_LABELS, SCENARIO_COLORS } from '@/types'
import { concentrationToPercent } from '@/utils/conversion'
import { ClipboardList, Trash2, AlertTriangle, Download, Filter } from 'lucide-react'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}年${mm}月${dd}日 ${hh}:${mi}`
}

function getScenarioColor(scenario: string): string {
  return SCENARIO_COLORS[scenario] ?? 'bg-gray-100 text-gray-800'
}

function getMixedConcentrationWarnings(records: DilutionRecord[]): string[] {
  const grouped: Record<string, number[]> = {}
  for (const r of records) {
    if (!r.usageScenario) continue
    const pct = concentrationToPercent(r.targetConcentration, r.targetConcentrationUnit)
    if (!grouped[r.usageScenario]) grouped[r.usageScenario] = []
    grouped[r.usageScenario].push(pct)
  }
  const warnings: string[] = []
  for (const [scenario, pcts] of Object.entries(grouped)) {
    const unique = [...new Set(pcts.map(p => Math.round(p * 10000) / 10000))]
    if (unique.length > 1) {
      warnings.push(scenario)
    }
  }
  return warnings
}

export default function Records() {
  const records = useDilutionStore((s) => s.records)
  const deleteRecord = useDilutionStore((s) => s.deleteRecord)

  const [activeFilter, setActiveFilter] = useState<string>('全部')

  const scenarios = useMemo(() => {
    const set = new Set(records.map((r) => r.usageScenario).filter(Boolean))
    return ['全部', ...Array.from(set)]
  }, [records])

  const filtered = useMemo(() => {
    if (activeFilter === '全部') return records
    return records.filter((r) => r.usageScenario === activeFilter)
  }, [records, activeFilter])

  const mixedWarnings = useMemo(() => getMixedConcentrationWarnings(records), [records])

  function handleDelete(id: string) {
    if (window.confirm('确定要删除这条配制记录吗？')) {
      deleteRecord(id)
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    a.href = url
    a.download = `配液记录_${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (records.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <ClipboardList className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无配制记录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配制记录</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>

      {scenarios.length > 2 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {scenarios.map((s) => (
            <button
              key={s}
              onClick={() => setActiveFilter(s)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeFilter === s
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {mixedWarnings.length > 0 && (
        <div className="space-y-2">
          {mixedWarnings.map((scenario) => (
            <div
              key={scenario}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">
                「{scenario}」存在不同目标浓度的配制记录，不同浓度不可混用！
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white border rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{formatDate(r.createdAt)}</span>
              <div className="flex items-center gap-2">
                {r.warnings.length > 0 && (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {r.usageScenario && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScenarioColor(r.usageScenario)}`}>
                  {r.usageScenario}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                {DISINFECTANT_LABELS[r.disinfectantType]}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                r.recordType === 'print'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-teal-100 text-teal-700'
              }`}>
                {r.recordType === 'print' ? '打印版' : '留档版'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">目标浓度：</span>
                <span className="font-medium">{r.targetConcentration} {r.targetConcentrationUnit}</span>
              </div>
              <div>
                <span className="text-gray-500">原液浓度：</span>
                <span className="font-medium">{r.stockConcentration} {r.stockConcentrationUnit}</span>
              </div>
              <div>
                <span className="text-gray-500">原液用量：</span>
                <span className="font-medium">{r.stockAmount} {r.stockAmountUnit}</span>
              </div>
              <div>
                <span className="text-gray-500">加水量：</span>
                <span className="font-medium">{r.waterAmount} {r.waterAmountUnit}</span>
              </div>
            </div>

            {r.operatorName && (
              <div className="text-sm text-gray-500">
                操作人：{r.operatorName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
