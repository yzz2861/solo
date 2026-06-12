import React from 'react'
import { AlertCircle } from 'lucide-react'

interface InputWithValidationProps {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
  unit?: string
  min?: number
  max?: number
  step?: number
}

/**
 * 带错误提示的数字输入框 - 工业科技感风格
 *
 * @param label - 输入框标签
 * @param value - 输入值
 * @param onChange - 值变化回调
 * @param error - 错误信息
 * @param unit - 单位
 * @param min - 最小值
 * @param max - 最大值
 * @param step - 步长
 */
export const InputWithValidation: React.FC<InputWithValidationProps> = ({
  label,
  value,
  onChange,
  error,
  unit,
  min,
  max,
  step = 0.1,
}) => {
  const hasError = Boolean(error)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val)) {
      let num = val
      if (min !== undefined) num = Math.max(min, num)
      if (max !== undefined) num = Math.min(max, num)
      onChange(num)
    }
  }

  return (
    <div className="mb-3 last:mb-0">
      {/* 标签行 */}
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-slate-400 tracking-wide">
          {label}
        </label>
        {unit && (
          <span className="text-xs text-slate-500 font-mono">{unit}</span>
        )}
      </div>

      {/* 输入框容器 */}
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          className={`
            w-full h-10 px-3 pr-10 rounded-md
            bg-slate-800/80 backdrop-blur-sm
            border text-slate-100 text-sm font-mono
            placeholder-slate-500
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${hasError
              ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-600/50 focus:border-cyan-500 focus:ring-cyan-500/20 hover:border-slate-500'
            }
          `}
        />

        {/* 错误图标 */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={16} />
          </div>
        )}

        {/* 工业风边框装饰 */}
        <div
          className={`
            absolute top-0 left-0 right-0 h-px
            ${hasError
              ? 'bg-gradient-to-r from-transparent via-red-500/40 to-transparent'
              : 'bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent'
            }
          `}
        />
      </div>

      {/* 错误提示 */}
      {hasError && (
        <div className="mt-1 flex items-start gap-1">
          <AlertCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-red-400 leading-tight">{error}</span>
        </div>
      )}
    </div>
  )
}
