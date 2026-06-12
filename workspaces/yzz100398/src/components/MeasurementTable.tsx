import { useState, useEffect } from 'react'
import { Plus, Trash2, ClipboardPaste, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parsePastedMeasurements } from '@/utils/units'
import type { Unit, Measurement } from '@/types'

const WEIGHT_UNITS: Unit[] = ['mg', 'g', 'kg']

interface MeasurementTableProps {
  measurements: Measurement[]
  onSetMeasurements: (arr: Measurement[]) => void
  onAddMeasurement: (m: Measurement) => void
  onRemoveMeasurement: (index: number) => void
}

function createEmptyMeasurement(index: number): Measurement {
  return { index, value: 0, unit: 'mg' }
}

export default function MeasurementTable({
  measurements,
  onSetMeasurements,
  onAddMeasurement,
  onRemoveMeasurement,
}: MeasurementTableProps) {
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')

  useEffect(() => {
    if (measurements.length === 0) {
      const initial: Measurement[] = Array.from({ length: 10 }, (_, i) =>
        createEmptyMeasurement(i + 1),
      )
      onSetMeasurements(initial)
    }
  }, [measurements.length, onSetMeasurements])

  const updateMeasurement = (idx: number, field: 'value' | 'unit', val: string) => {
    const updated = measurements.map((m, i) => {
      if (i !== idx) return m
      if (field === 'value') return { ...m, value: parseFloat(val) || 0 }
      return { ...m, unit: val as Unit }
    })
    onSetMeasurements(updated)
  }

  const handleRemove = (idx: number) => {
    if (measurements.length <= 1) return
    onRemoveMeasurement(idx)
  }

  const handleAdd = () => {
    onAddMeasurement({
      index: measurements.length + 1,
      value: 0,
      unit: 'mg',
    })
  }

  const handleParsePasted = () => {
    setParseError('')
    if (!pasteText.trim()) {
      setParseError('请粘贴至少一行数据')
      return
    }

    const parsed = parsePastedMeasurements(pasteText, 'mg')
    if (parsed.length === 0) {
      setParseError('未解析到有效数据，请检查格式')
      return
    }

    const merged = [...measurements]
    parsed.forEach((p, i) => {
      if (i < merged.length) {
        merged[i] = { ...merged[i], value: p.value, unit: p.unit }
      } else {
        merged.push({ ...p, index: i + 1 })
      }
    })
    onSetMeasurements(merged)
    setPasteText('')
  }

  return (
    <div className={cn('bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm')}>
      <div className="bg-blue-600 px-5 py-3 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold text-base">原始测量数据</h3>
          <span className="text-blue-100 text-xs bg-blue-500/50 px-2 py-0.5 rounded">
            共 {measurements.length} 行
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <ClipboardPaste className="w-4 h-4 text-blue-600" />
            粘贴批量导入
            <span className="text-xs font-normal text-gray-400">
              （每行一条，格式：数值 单位，支持空格/逗号/Tab分隔）
            </span>
          </label>
          <div className="flex gap-2">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'例如:\n100.0023 mg\n100.0021 mg\n99.9998 mg'}
              rows={3}
              className="flex-1 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono resize-none"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleParsePasted}
                disabled={!pasteText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                解析导入
              </button>
              <button
                onClick={() => {
                  setPasteText('')
                  setParseError('')
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                清空
              </button>
            </div>
          </div>
          {parseError && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {parseError}
            </p>
          )}
        </div>

        <div className="border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-16 px-3 py-2.5 text-left font-medium text-gray-600">序号</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600">示值</th>
                <th className="w-28 px-3 py-2.5 text-left font-medium text-gray-600">单位</th>
                <th className="w-20 px-3 py-2.5 text-center font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {measurements.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs text-right tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="any"
                      value={row.value || ''}
                      onChange={(e) => updateMeasurement(idx, 'value', e.target.value)}
                      placeholder="0.0000"
                      className="w-full h-9 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.unit}
                      onChange={(e) => updateMeasurement(idx, 'unit', e.target.value)}
                      className="w-full h-9 px-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {WEIGHT_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => handleRemove(idx)}
                      disabled={measurements.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="删除此行"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加一行
        </button>
      </div>
    </div>
  )
}
