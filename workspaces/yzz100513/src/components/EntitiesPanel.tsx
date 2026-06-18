import { useState } from 'react'
import { Search, User, MapPin, Wrench, Quote, Check, X, ChevronRight } from 'lucide-react'
import type { Entity, EntityType } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'

const typeConfig: Record<EntityType, {
  icon: React.ReactNode
  name: string
  bgColor: string
  textColor: string
}> = {
  person: {
    icon: <User className="w-4 h-4" />,
    name: '人物',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  place: {
    icon: <MapPin className="w-4 h-4" />,
    name: '地名',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  technique: {
    icon: <Wrench className="w-4 h-4" />,
    name: '技法',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  quote: {
    icon: <Quote className="w-4 h-4" />,
    name: '原话',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700'
  }
}

export function EntitiesPanel() {
  const { currentProject, toggleEntityConfirmed, updateEntity, setSelectedParagraphId } = useTranscriptStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<EntityType | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const entities = currentProject?.entities || []

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entity.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesType = activeType === 'all' || entity.type === activeType
    return matchesSearch && matchesType
  })

  const groupedEntities = filteredEntities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = []
    }
    acc[entity.type].push(entity)
    return acc
  }, {} as Record<EntityType, Entity[]>)

  const handleStartEdit = (entity: Entity) => {
    setEditingId(entity.id)
    setEditName(entity.name)
    setEditDescription(entity.description || '')
  }

  const handleSaveEdit = (id: string) => {
    updateEntity(id, { name: editName, description: editDescription })
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const handleJumpToParagraph = (paragraphId: string) => {
    setSelectedParagraphId(paragraphId)
    const element = document.getElementById(`paragraph-${paragraphId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const getStats = () => {
    const total = entities.length
    const confirmed = entities.filter(e => e.confirmed).length
    const unconfirmed = total - confirmed
    return { total, confirmed, unconfirmed }
  }

  const stats = getStats()

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-ink-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-kai text-lg text-ink-800">实体列表</h3>
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-0.5 bg-ink-100 rounded-full text-ink-600">
              共 {stats.total}
            </span>
            <span className="px-2 py-0.5 bg-green-100 rounded-full text-green-700">
              已确认 {stats.confirmed}
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 rounded-full text-yellow-700">
              待确认 {stats.unconfirmed}
            </span>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="搜索实体..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
          />
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
          {(Object.keys(typeConfig) as EntityType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                activeType === type
                  ? typeConfig[type].bgColor + ' ' + typeConfig[type].textColor + ' font-medium'
                  : 'text-ink-500 hover:bg-ink-50'
              }`}
            >
              {typeConfig[type].name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {(Object.keys(groupedEntities) as EntityType[]).map((type) => {
          const typeEntities = groupedEntities[type]
          if (typeEntities.length === 0) return null

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2 px-1">
                {typeConfig[type].icon}
                <span className={`text-sm font-medium ${typeConfig[type].textColor}`}>
                  {typeConfig[type].name} ({typeEntities.length})
                </span>
              </div>

              <div className="space-y-1">
                {typeEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className={`group p-2 rounded-lg border transition-all ${
                      entity.confirmed
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-ink-100 bg-white hover:border-ink-200'
                    }`}
                  >
                    {editingId === entity.id ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-ink-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-200"
                          placeholder="实体名称"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-ink-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                          placeholder="添加描述..."
                          rows={2}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(entity.id)}
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${typeConfig[entity.type].textColor}`}>
                                {entity.name}
                              </span>
                              {entity.confirmed && (
                                <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                  <Check className="w-3 h-3" />
                                  已确认
                                </span>
                              )}
                            </div>
                            {entity.description && (
                              <p className="text-xs text-ink-500 mt-1">{entity.description}</p>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs text-ink-400">
                                出现 {entity.paragraphIds.length} 次
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleEntityConfirmed(entity.id)}
                              className={`p-1 rounded transition-colors ${
                                entity.confirmed
                                  ? 'text-green-600 hover:bg-green-100'
                                  : 'text-ink-400 hover:bg-ink-100'
                              }`}
                              title={entity.confirmed ? '取消确认' : '确认实体'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(entity)}
                              className="p-1 text-ink-400 hover:bg-ink-100 rounded"
                              title="编辑"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {entity.paragraphIds.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-ink-100">
                            <div className="text-xs text-ink-500 mb-1">跳转至段落：</div>
                            <div className="flex flex-wrap gap-1">
                              {entity.paragraphIds.slice(0, 5).map((pid) => {
                                const paragraph = currentProject?.paragraphs.find(p => p.id === pid)
                                if (!paragraph) return null
                                return (
                                  <button
                                    key={pid}
                                    onClick={() => handleJumpToParagraph(pid)}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-ink-50 text-ink-600 rounded hover:bg-ink-100"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                    第 {paragraph.originalIndex + 1} 段
                                  </button>
                                )
                              })}
                              {entity.paragraphIds.length > 5 && (
                                <span className="px-1.5 py-0.5 text-xs text-ink-400">
                                  +{entity.paragraphIds.length - 5} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredEntities.length === 0 && (
          <div className="text-center py-8 text-ink-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">没有找到匹配的实体</p>
          </div>
        )}
      </div>
    </div>
  )
}
