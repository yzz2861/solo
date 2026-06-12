import { CheckCircle, XCircle, Calculator, Save, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMg } from '@/utils/units'
import type { CalibrationResults, CalibrationForm } from '@/types'

const CONTRIBUTION_COLORS: Record<string, string> = {
  repeatability: 'bg-blue-500',
  standard: 'bg-emerald-500',
  resolution: 'bg-violet-500',
  temperature: 'bg-amber-500',
  humidity: 'bg-pink-500',
}

interface ResultsPanelProps {
  results: CalibrationResults | null
  form: CalibrationForm
  onSave: () => void
  onPreview: () => void
}

export default function ResultsPanel({ results, form, onSave, onPreview }: ResultsPanelProps) {
  if (!results) {
    return (
      <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">实时计算结果</h3>
        </div>
        <div className="p-8 text-center text-gray-400">
          <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">请录入数据后计算</p>
        </div>
      </div>
    )
  }

  const correction = formatMg(results.correction_mg)
  const uc = formatMg(results.u_combined_mg)
  const U = formatMg(results.U_expanded_mg)
  const tolerance = formatMg(results.tolerance_mg)
  const contributions = results.contributions
  const maxPercent = contributions.length > 0 ? Math.max(...contributions.map((c) => c.percent)) : 0

  const mpeCheckValue = Math.abs(results.correction_mg) + results.U_expanded_mg
  const mpeCheckPassed = mpeCheckValue <= results.tolerance_mg

  return (
    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-800">实时计算结果</h3>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">修正值</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900 font-mono tabular-nums">
                {correction.value}
              </span>
              <span className="text-lg font-medium text-gray-500">{correction.unit}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                合成 u<sub>c</sub>
              </p>
              <span className="text-2xl font-bold text-gray-800 font-mono tabular-nums">
                {uc.value}
              </span>
              <span className="text-sm text-gray-500 ml-1">{uc.unit}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                扩展 U(k={results.k_factor})
              </p>
              <span className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
                {U.value}
              </span>
              <span className="text-sm text-gray-500 ml-1">{U.unit}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-xl border-2 p-4',
            results.isPass === true && 'border-green-200 bg-green-50',
            results.isPass === false && 'border-red-200 bg-red-50',
            results.isPass === null && 'border-gray-200 bg-gray-50',
          )}
        >
          <div className="flex items-center gap-3">
            {results.isPass === true && <CheckCircle className="w-12 h-12 flex-shrink-0 text-green-600" />}
            {results.isPass === false && <XCircle className="w-12 h-12 flex-shrink-0 text-red-600" />}
            {results.isPass === null && <Calculator className="w-12 h-12 flex-shrink-0 text-gray-400" />}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-2xl font-bold',
                  results.isPass === true && 'text-green-700',
                  results.isPass === false && 'text-red-700',
                  results.isPass === null && 'text-gray-500',
                )}
              >
                {results.isPass === true ? '合格' : results.isPass === false ? '不合格' : '待计算'}
              </p>
              {results.isPass !== null && (
                <p className="mt-1 text-sm font-mono tabular-nums">
                  |修正值| + U = {formatMg(mpeCheckValue).value} {formatMg(mpeCheckValue).unit}{' '}
                  {mpeCheckPassed ? '≤' : '>'} MPE {tolerance.value} {tolerance.unit}
                  {mpeCheckPassed ? ' ✓' : ' ✗'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">不确定度贡献度</p>
          </div>
          <div className="space-y-3">
            {contributions.map((c) => {
              const barWidth = maxPercent > 0 ? (c.percent / maxPercent) * 100 : 0
              const color = CONTRIBUTION_COLORS[c.key] || 'bg-gray-400'
              return (
                <div key={c.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-600 w-28 flex-shrink-0 truncate">
                      {c.source}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-gray-700 w-16 text-right tabular-nums">
                        {formatMg(c.u_mg).value} {formatMg(c.u_mg).unit}
                      </span>
                      <span
                        className={cn(
                          'font-mono font-medium w-12 text-right tabular-nums',
                          c.percent > 40
                            ? 'text-red-600'
                            : c.percent > 25
                              ? 'text-amber-600'
                              : 'text-gray-600',
                        )}
                      >
                        {c.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', color)}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-gray-100 space-y-2 bg-gray-50">
        <button
          onClick={onSave}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          保存到档案
        </button>
        <button
          onClick={onPreview}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          <FileText className="w-4 h-4" />
          预览报告
        </button>
      </div>
    </div>
  )
}
