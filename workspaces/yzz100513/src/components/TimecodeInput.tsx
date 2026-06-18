import { useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

interface TimecodeInputProps {
  startTimecode?: string
  endTimecode?: string
  onStartTimecodeChange: (value: string) => void
  onEndTimecodeChange: (value: string) => void
}

const TIMECODE_REGEX = /^([0-9]{2}):([0-9]{2}):([0-9]{2})$/

function validateTimecode(value: string): boolean {
  if (!value) return true
  if (!TIMECODE_REGEX.test(value)) return false

  const [, hours, minutes, seconds] = value.match(TIMECODE_REGEX) || []
  const h = parseInt(hours, 10)
  const m = parseInt(minutes, 10)
  const s = parseInt(seconds, 10)

  return h >= 0 && h <= 99 && m >= 0 && m <= 59 && s >= 0 && s <= 59
}

function formatTimecode(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, '')
  const padded = cleaned.padEnd(6, '0').slice(0, 6)
  const h = padded.slice(0, 2)
  const m = padded.slice(2, 4)
  const s = padded.slice(4, 6)
  return `${h}:${m}:${s}`
}

export function TimecodeInput({
  startTimecode,
  endTimecode,
  onStartTimecodeChange,
  onEndTimecodeChange
}: TimecodeInputProps) {
  const [startError, setStartError] = useState<string | null>(null)
  const [endError, setEndError] = useState<string | null>(null)

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length === 0) {
      onStartTimecodeChange('')
      setStartError(null)
      return
    }

    if (value.length <= 8) {
      const formatted = formatTimecode(value)
      if (validateTimecode(formatted)) {
        onStartTimecodeChange(formatted)
        setStartError(null)
      } else {
        setStartError('时间码格式无效')
      }
    }
  }

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length === 0) {
      onEndTimecodeChange('')
      setEndError(null)
      return
    }

    if (value.length <= 8) {
      const formatted = formatTimecode(value)
      if (validateTimecode(formatted)) {
        if (startTimecode && formatted < startTimecode) {
          setEndError('结束时间不能早于开始时间')
        } else {
          onEndTimecodeChange(formatted)
          setEndError(null)
        }
      } else {
        setEndError('时间码格式无效')
      }
    }
  }

  const handleStartBlur = () => {
    if (startTimecode && !validateTimecode(startTimecode)) {
      setStartError('请输入有效的时间码 (HH:MM:SS)')
    }
  }

  const handleEndBlur = () => {
    if (endTimecode && !validateTimecode(endTimecode)) {
      setEndError('请输入有效的时间码 (HH:MM:SS)')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-ink-600">
        <Clock className="w-4 h-4" />
        <span>时间码</span>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-ink-500 mb-1">开始</label>
          <div className="relative">
            <input
              type="text"
              value={startTimecode || ''}
              onChange={handleStartChange}
              onBlur={handleStartBlur}
              placeholder="00:00:00"
              maxLength={8}
              className={`w-full px-3 py-1.5 text-sm border rounded-lg font-mono transition-colors ${
                startError
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-ink-200 focus:ring-primary-200 focus:border-primary-400'
              } focus:outline-none focus:ring-2`}
            />
            {startError && (
              <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {startError}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs text-ink-500 mb-1">结束</label>
          <div className="relative">
            <input
              type="text"
              value={endTimecode || ''}
              onChange={handleEndChange}
              onBlur={handleEndBlur}
              placeholder="00:00:00"
              maxLength={8}
              className={`w-full px-3 py-1.5 text-sm border rounded-lg font-mono transition-colors ${
                endError
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-ink-200 focus:ring-primary-200 focus:border-primary-400'
              } focus:outline-none focus:ring-2`}
            />
            {endError && (
              <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" />
                {endError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-ink-400 mt-2">
        格式: HH:MM:SS (时:分:秒)，如 01:23:45
      </div>
    </div>
  )
}
