import { useState } from 'react'
import { AlertTriangle, VolumeX, Users2, Clock, Check, X, MessageSquare, ChevronRight, Filter } from 'lucide-react'
import type { Uncertainty, UncertaintyType, UncertaintyStatus } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'

const typeConfig: Record<UncertaintyType, {
  icon: React.ReactNode
  name: string
  color: string
}> = {
  unintelligible: {
    icon: <VolumeX className="w-4 h-4" />,
    name: '听不清',
    color: 'text-orange-600'
  },
  multiple_names: {
    icon: <Users2 className="w-4 h-4" />,
    name: '多称呼',
    color: 'text-blue-600'
  },
  timeline_jump: {
    icon: <Clock className="w-4 h-4" />,
    name: '时间跳跃',
    color: 'text-purple-600'
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

export function ConfirmationPanel() {
  const { currentProject, updateUncertaintyStatus, updateUncertainty, setSelectedParagraphId } = useTranscriptStore()
  const [activeType, setActiveType] = useState<UncertaintyType | 'all'>('all')
  const [activeStatus, setActiveStatus] = useState<UncertaintyStatus | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')

  const uncertainties = currentProject?.uncertainties || []

  const filteredUncertainties = uncertainties.filter((u) => {
    const matchesType = activeType === 'all' || u.type === activeType
    const matchesStatus = activeStatus === 'all' || u.status === activeStatus
    return matchesType && matchesStatus
  })

  const groupedByType = filteredUncertainties.reduce((acc, u) => {
    if (!acc[u.type]) {
      acc[u.type] = []
    }
    acc[u.type].push(u)
    return acc
  }, {} as Record<UncertaintyType, Uncertainty[]>)

  const handleStartEdit = (uncertainty: Uncertainty) => {
    setEditingId(uncertainty.id)
    setEditNote(uncertainty.note || '')
  }

  const handleSaveNote = (id: string) => {
    updateUncertainty(id, { note: editNote })
    setEditingId(null)
    setEditNote('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditNote('')
  }

  const handleJumpToParagraph = (paragraphId: string) => {
    setSelectedParagraphId(paragraphId)
    const element = document.getElementById(`paragraph-${paragraphId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const getStats = () => {
    const total = uncertainties.length
    const pending = uncertainties.filter(u => u.status === 'pending').length
    const confirmed = uncertainties.filter(u => u.status === 'confirmed').length
    const resolved = uncertainties.filter(u => u.status === 'resolved').length
    return { total, pending, confirmed, resolved }
  }

  const stats = getStats()

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-ink-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-600" />
            <h3 className="font-kai text-lg text-ink-800">待确认列表</h3>
          </div>
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-0.5 bg-ink-100 rounded-full text-ink-600">
              共 {stats.total}
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 rounded-full text-yellow-700">
              待处理 {stats.pending}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-xs text-ink-500">类型筛选</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveType('all')}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                activeType === 'all'
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              全部
            </button>
            {(Object.keys(typeConfig) as UncertaintyType[]).map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  activeType === type
                    ? 'bg-ink-100 text-ink-700 font-medium'
                    : 'text-ink-500 hover:bg-ink-50'
                }`}
              >
                {typeConfig[type].name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex gap-1">
            {(Object.keys(statusConfig) as UncertaintyStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(activeStatus === status ? 'all' : status)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  activeStatus === status
                    ? statusConfig[status].color
                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                }`}
              >
                {statusConfig[status].icon}
                {statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(Object.keys(groupedByType) as UncertaintyType[]).map((type) => {
          const items = groupedByType[type]
          if (items.length === 0) return null

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={typeConfig[type].color}>
                  {typeConfig[type].icon}
                </span>
                <span className={`text-sm font-medium ${typeConfig[type].color}`}>
                  {typeConfig[type].name} ({items.length})
                </span>
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  const paragraph = currentProject?.paragraphs.find(p => p.id === item.paragraphId)

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-all ${
                        item.status === 'pending'
                          ? 'border-yellow-200 bg-yellow-50/40'
                          : item.status === 'confirmed'
                          ? 'border-green-200 bg-green-50/40'
                          : 'border-gray-200 bg-gray-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${statusConfig[item.status].color}`}>
                            {statusConfig[item.status].icon}
                            <span className="ml-1">{statusConfig[item.status].label}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {(Object.keys(statusConfig) as UncertaintyStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => updateUncertaintyStatus(item.id, status)}
                              className={`p-1 rounded transition-colors ${
                                item.status === status
                                  ? statusConfig[status].color
                                  : 'text-ink-400 hover:bg-white'
                              }`}
                              title={statusConfig[status].label}
                            >
                              {statusConfig[status].icon}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm text-ink-800 mb-2 bg-white/60 p-2 rounded">
                        "{item.text}"
                      </div>

                      {paragraph && (
                        <div className="text-xs text-ink-500 mb-2 line-clamp-2">
                          上下文: {paragraph.content.substring(0, 60)}...
                        </div>
                      )}

                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="添加备注..."
                            className="w-full px-2 py-1.5 text-sm border border-ink-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveNote(item.id)}
                              className="flex-1 flex items-center justify-center gap-1 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600"
                            >
                              <Check className="w-3 h-3" />
                              保存
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 flex items-center justify-center gap-1 py-1 bg-ink-100 text-ink-600 text-xs rounded hover:bg-ink-200"
                            >
                              <X className="w-3 h-3" />
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.note && (
                            <div className="flex items-start gap-1.5 mb-2 text-xs">
                              <MessageSquare className="w-3.5 h-3.5 text-ink-400 mt-0.5" />
                              <span className="text-ink-600">{item.note}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="flex items-center gap-1 text-xs text-ink-500 hover:text-primary-600"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {item.note ? '编辑备注' : '添加备注'}
                            </button>

                            {paragraph && (
                              <button
                                onClick={() => handleJumpToParagraph(item.paragraphId)}
                                className="flex items-center gap-0.5 text-xs text-primary-600 hover:text-primary-700"
                              >
                                跳转段落
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {filteredUncertainties.length === 0 && (
          <div className="text-center py-8 text-ink-400">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无待确认内容</p>
          </div>
        )}
      </div>
    </div>
  )
}
