import { useMemo } from 'react'
import { Scale, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Unit, WeightClassOrEmpty, StandardWeight } from '@/types'

const ACCURACY_GRADES: WeightClassOrEmpty[] = ['E1', 'E2', 'F1', 'F2', 'M1', 'M2', 'M3']
const WEIGHT_UNITS: Unit[] = ['mg', 'g', 'kg']

interface StandardWeightCardProps {
  standardWeight: StandardWeight | CalibrationFormStandardWeight
  onChange: (partial: Partial<StandardWeight | CalibrationFormStandardWeight>) => void
}

type CalibrationFormStandardWeight = {
  class: WeightClassOrEmpty
  nominalValue: number
  nominalUnit: Unit
  certNumber: string
  expiryDate: string
  correctionValue_mg: number
}

export default function StandardWeightCard({ standardWeight, onChange }: StandardWeightCardProps) {
  const sw = standardWeight

  const expiryStatus = useMemo(() => {
    if (!sw.expiryDate) return { isExpired: false, isSoon: false, daysLeft: 0 }
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const expiry = new Date(sw.expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diffMs = expiry.getTime() - now.getTime()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return {
      isExpired: daysLeft < 0,
      isSoon: daysLeft >= 0 && daysLeft <= 30,
      daysLeft,
    }
  }, [sw.expiryDate])

  return (
    <div className={cn('bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm')}>
      <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
        <Scale className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold text-base">标准砝码信息</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">准确度等级</label>
            <select
              value={sw.class}
              onChange={(e) => onChange({ class: e.target.value as WeightClassOrEmpty })}
              className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {ACCURACY_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">标称值</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={sw.nominalValue || ''}
                onChange={(e) => onChange({ nominalValue: parseFloat(e.target.value) || 0 })}
                placeholder="数值"
                className="flex-1 h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono text-right"
              />
              <select
                value={sw.nominalUnit}
                onChange={(e) => onChange({ nominalUnit: e.target.value as Unit })}
                className="w-20 h-10 px-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {WEIGHT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">证书编号</label>
            <input
              type="text"
              value={sw.certNumber}
              onChange={(e) => onChange({ certNumber: e.target.value })}
              placeholder="STD-XXX"
              className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              有效期
              {expiryStatus.isExpired && (
                <span className="ml-2 inline-flex items-center text-red-600 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-0.5" />
                  已超期
                </span>
              )}
              {!expiryStatus.isExpired && expiryStatus.isSoon && (
                <span className="ml-2 inline-flex items-center text-amber-600 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mr-0.5" />
                  剩 {expiryStatus.daysLeft} 天
                </span>
              )}
            </label>
            <input
              type="date"
              value={sw.expiryDate}
              onChange={(e) => onChange({ expiryDate: e.target.value })}
              className={cn(
                'w-full h-10 px-3 rounded-md border focus:outline-none focus:ring-2 text-sm',
                expiryStatus.isExpired
                  ? 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50 text-red-700'
                  : expiryStatus.isSoon
                    ? 'border-amber-400 focus:ring-amber-500 focus:border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              证书修正值 <span className="text-gray-400 font-normal">(mg)</span>
            </label>
            <input
              type="number"
              step="0.0001"
              value={sw.correctionValue_mg || ''}
              onChange={(e) => onChange({ correctionValue_mg: parseFloat(e.target.value) || 0 })}
              placeholder="如: +0.0234"
              className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono text-right"
            />
          </div>
          <div className="flex items-end">
            <div className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-md w-full">
              <span className="font-medium text-blue-700">注意：</span>
              请确保标准砝码在有效期内，修正值应与证书一致。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
