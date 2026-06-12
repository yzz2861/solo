import { useMemo } from 'react'
import { ThermometerSun, Droplets, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Environment } from '@/types'

const TEMP_RANGE = { min: 18, max: 23 }
const HUMID_RANGE = { min: 30, max: 60 }

interface EnvironmentCardProps {
  environment: Environment
  onChange: (partial: Partial<Environment>) => void
}

export default function EnvironmentCard({ environment, onChange }: EnvironmentCardProps) {
  const env = environment

  const tempOutOfRange = useMemo(() => {
    return env.temperature_C < TEMP_RANGE.min || env.temperature_C > TEMP_RANGE.max
  }, [env.temperature_C])

  const humidOutOfRange = useMemo(() => {
    return env.humidity_RH < HUMID_RANGE.min || env.humidity_RH > HUMID_RANGE.max
  }, [env.humidity_RH])

  return (
    <div className={cn('bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm')}>
      <div className="bg-blue-600 px-5 py-3 flex items-center gap-2">
        <ThermometerSun className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold text-base">环境条件</h3>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ThermometerSun className="w-4 h-4 text-orange-500" />
              温度 <span className="text-gray-400 font-normal">(℃)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={env.temperature_C || ''}
                onChange={(e) => onChange({ temperature_C: parseFloat(e.target.value) || 0 })}
                placeholder="如: 20.0"
                className={cn(
                  'flex-1 h-10 px-3 rounded-md border focus:outline-none focus:ring-2 text-sm font-mono text-right',
                  tempOutOfRange
                    ? 'border-amber-400 bg-amber-50 text-amber-800 focus:ring-amber-500 focus:border-amber-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
                )}
              />
              <div className="flex flex-col justify-center text-xs leading-tight">
                <span
                  className={cn(
                    'font-medium',
                    tempOutOfRange ? 'text-amber-700' : 'text-gray-500',
                  )}
                >
                  {TEMP_RANGE.min}~{TEMP_RANGE.max}
                </span>
                <span className="text-gray-400">正常</span>
              </div>
            </div>
            {tempOutOfRange && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ 当前温度超出校准推荐范围
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-500" />
              湿度 <span className="text-gray-400 font-normal">(%RH)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="1"
                value={env.humidity_RH || ''}
                onChange={(e) => onChange({ humidity_RH: parseFloat(e.target.value) || 0 })}
                placeholder="如: 50"
                className={cn(
                  'flex-1 h-10 px-3 rounded-md border focus:outline-none focus:ring-2 text-sm font-mono text-right',
                  humidOutOfRange
                    ? 'border-amber-400 bg-amber-50 text-amber-800 focus:ring-amber-500 focus:border-amber-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
                )}
              />
              <div className="flex flex-col justify-center text-xs leading-tight">
                <span
                  className={cn(
                    'font-medium',
                    humidOutOfRange ? 'text-amber-700' : 'text-gray-500',
                  )}
                >
                  {HUMID_RANGE.min}~{HUMID_RANGE.max}
                </span>
                <span className="text-gray-400">正常</span>
              </div>
            </div>
            {humidOutOfRange && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ 当前湿度超出校准推荐范围
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-500" />
              录入时间
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="datetime-local"
                value={env.recordedAt ? env.recordedAt.slice(0, 16) : ''}
                onChange={(e) => onChange({ recordedAt: e.target.value })}
                className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-200 bg-purple-50 text-purple-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">自动填充，可修改</p>
          </div>
        </div>
      </div>
    </div>
  )
}
