import { useState } from 'react'
import { VolumeX, Users2, Clock, Check, X, Edit2, MessageSquare } from 'lucide-react'
import type { Uncertainty, UncertaintyType, UncertaintyStatus } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'

const typeConfig: Record<UncertaintyType, {
  icon: React.ReactNode
  name: string
  bgColor: string
  textColor: string
  borderColor: string
}> = {
  unintelligible: {
    icon: <VolumeX className="w-3 h-3" />,
    name: '听不清',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  multiple_names: {
    icon: <Users2 className="w-3 h-3" />,
    name: '多称呼',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  timeline_jump: {
    icon: <Clock className="w-3 h-3" />,
    name: '时间跳跃',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  }
}

const statusConfig: Record<UncertaintyStatus, {
  label: string
  color: string
  icon: React.ReactNode
}> = {
  pending: {
    label: '待确认',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <Clock className="w-3 h-3" />
  },
  confirmed: {
    label: '已确认',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Check className="w-3 h-3" />
  },
  resolved: {
    label: '已解决',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <X className="w-3 h-3" />
  }
}

interface UncertaintyBadgeProps {
  uncertainty: Uncertainty
  showNote?: boolean
  compact?: boolean
}

export function UncertaintyBadge({ uncertainty, showNote = false, compact = false }: UncertaintyBadgeProps) {
  const { updateUncertaintyStatus, updateUncertainty } = useTranscriptStore()
  const [showEditor, setShowEditor] = useState(false)
  const [noteText, setNoteText] = useState(uncertainty.note || '')

  const config = typeConfig[uncertainty.type]
  const status = statusConfig[uncertainty.status]

  const handleStatusChange = (newStatus: UncertaintyStatus) => {
    updateUncertaintyStatus(uncertainty.id, newStatus)
  }

  const handleSaveNote = () => {
    updateUncertainty(uncertainty.id, { note: noteText })
    setShowEditor(false)
  }

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs ${config.bgColor} ${config.textColor} ${config.borderColor} cursor-help`}
        title={`${config.name}: ${uncertainty.text}`}
      >
        {config.icon}
        {uncertainty.text}
      </span>
    )
  }

  return (
    <div className="group relative">
      <div
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${config.bgColor} ${config.borderColor}`}
        onClick={() => setShowEditor(!showEditor)}
      >
        <span className={config.textColor}>{config.icon}</span>
        <span className={`text-sm font-medium ${config.textColor}`}>{config.name}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded border ${status.color}`}>
          {status.icon}
          <span className="ml-1">{status.label}</span>
        </span>
        {uncertainty.note && (
          <MessageSquare className="w-3 h-3 text-ink-400" />
        )}
      </div>

      {showEditor && (
        <div className="absolute z-30 mt-2 w-72 bg-white rounded-lg shadow-ink border border-ink-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={config.textColor}>{config.icon}</span>
              <span className={`font-medium ${config.textColor}`}>{config.name}</span>
            </div>
            <button
              onClick={() => setShowEditor(false)}
              className="p-1 hover:bg-ink-100 rounded"
            >
              <X className="w-3 h-3 text-ink-500" />
            </button>
          </div>

          <div className="mb-3">
            <div className="text-xs text-ink-500 mb-1">原文内容</div>
            <div className="text-sm bg-ink-50 p-2 rounded text-ink-700 break-all">
              {uncertainty.text}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-xs text-ink-500 mb-2">状态</div>
            <div className="flex gap-2">
              {(Object.keys(statusConfig) as UncertaintyStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                    uncertainty.status === s
                      ? statusConfig[s].color
                      : 'bg-ink-50 text-ink-500 border-ink-200 hover:bg-ink-100'
                  }`}
                >
                  {statusConfig[s].icon}
                  {statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-ink-500">备注</label>
              <button
                onClick={() => setShowEditor(!showEditor)}
                className="p-1 hover:bg-ink-100 rounded"
              >
                <Edit2 className="w-3 h-3 text-ink-500" />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="添加备注信息..."
              className="w-full px-2 py-1.5 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveNote}
              className="flex-1 flex items-center justify-center gap-1 bg-primary-500 text-white py-1.5 rounded-lg hover:bg-primary-600 transition-colors text-sm"
            >
              <Check className="w-3 h-3" />
              保存
            </button>
            <button
              onClick={() => {
                setNoteText(uncertainty.note || '')
                setShowEditor(false)
              }}
              className="px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-100 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>

          {showNote && uncertainty.note && (
            <div className="mt-2 pt-2 border-t border-ink-100">
              <div className="text-xs text-ink-500 mb-1">当前备注</div>
              <div className="text-sm text-ink-700">{uncertainty.note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
