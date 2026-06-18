import { useState, useRef, useEffect } from 'react'
import { User, MapPin, Wrench, Quote, Check, X, Plus } from 'lucide-react'
import type { Entity, EntityType, Paragraph } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { generateId } from '@/utils/parser'

const entityColors: Record<EntityType, string> = {
  person: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  place: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  technique: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  quote: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
}

const entityIcons: Record<EntityType, React.ReactNode> = {
  person: <User className="w-3 h-3" />,
  place: <MapPin className="w-3 h-3" />,
  technique: <Wrench className="w-3 h-3" />,
  quote: <Quote className="w-3 h-3" />
}

const typeLabels: Record<EntityType, string> = {
  person: '人物',
  place: '地名',
  technique: '技法',
  quote: '原话'
}

interface EntityMarkerProps {
  paragraph: Paragraph
  content: string
}

export function EntityMarker({ paragraph, content }: EntityMarkerProps) {
  const { addEntity } = useTranscriptStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectedType, setSelectedType] = useState<EntityType>('person')
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowAddDialog(false)
      return
    }

    const text = selection.toString().trim()
    if (text.length > 1 && text.length < 50) {
      setSelectedText(text)
      setShowAddDialog(true)
    }
  }

  const handleAddEntity = () => {
    if (!selectedText) return

    const newEntity: Entity = {
      id: generateId(),
      type: selectedType,
      name: selectedText,
      confirmed: false,
      paragraphIds: [paragraph.id]
    }

    addEntity(paragraph.id, newEntity)
    setShowAddDialog(false)
    setSelectedText('')
    window.getSelection()?.removeAllRanges()
  }

  const renderContent = () => {
    if (paragraph.entities.length === 0) {
      return <span>{content}</span>
    }

    const parts: { text: string; entity?: Entity }[] = []
    let lastIndex = 0

    const sortedEntities = [...paragraph.entities].sort(
      (a, b) =>
        (a.metadata?.startIndex ? parseInt(a.metadata.startIndex) : 0) -
        (b.metadata?.startIndex ? parseInt(b.metadata.startIndex) : 0)
    )

    sortedEntities.forEach((entity) => {
      const entityStart = content.indexOf(entity.name, lastIndex)
      if (entityStart >= 0) {
        if (entityStart > lastIndex) {
          parts.push({ text: content.slice(lastIndex, entityStart) })
        }
        parts.push({ text: entity.name, entity })
        lastIndex = entityStart + entity.name.length
      }
    })

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex) })
    }

    if (parts.length === 0) {
      return <span>{content}</span>
    }

    return parts.map((part, index) => {
      if (part.entity) {
        return (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${entityColors[part.entity.type]}`}
            onMouseEnter={() => setHoveredEntity(part.entity!)}
            onMouseLeave={() => setHoveredEntity(null)}
          >
            {entityIcons[part.entity.type]}
            <span>{part.text}</span>
            {part.entity.confirmed && <Check className="w-3 h-3 opacity-60" />}
          </span>
        )
      }
      return <span key={index}>{part.text}</span>
    })
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAddDialog && !(e.target as HTMLElement).closest('.entity-add-dialog')) {
        setShowAddDialog(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddDialog])

  return (
    <div className="relative">
      <div
        ref={textRef}
        onMouseUp={handleTextSelection}
        className="select-text cursor-text leading-relaxed"
      >
        {renderContent()}
      </div>

      {showAddDialog && (
        <div className="entity-add-dialog absolute z-20 mt-2 bg-white rounded-lg shadow-ink p-3 border border-ink-200 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink-800">添加实体标记</span>
            <button
              onClick={() => setShowAddDialog(false)}
              className="p-1 hover:bg-ink-100 rounded"
            >
              <X className="w-3 h-3 text-ink-500" />
            </button>
          </div>

          <div className="mb-3">
            <div className="text-xs text-ink-500 mb-1">选中内容</div>
            <div className="text-sm bg-ink-50 p-2 rounded text-ink-700 break-all">
              {selectedText}
            </div>
          </div>

          <div className="mb-3">
            <div className="text-xs text-ink-500 mb-2">实体类型</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(typeLabels) as EntityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedType === type
                      ? entityColors[type] + ' border'
                      : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {entityIcons[type]}
                  {typeLabels[type]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddEntity}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            添加标记
          </button>
        </div>
      )}

      {hoveredEntity && (
        <div className="absolute z-10 mt-1 bg-white rounded-lg shadow-ink p-2 border border-ink-200 min-w-48">
          <div className="flex items-center gap-2 mb-1">
            {entityIcons[hoveredEntity.type]}
            <span className={`text-xs font-medium ${entityColors[hoveredEntity.type].split(' ')[1]}`}>
              {typeLabels[hoveredEntity.type]}
            </span>
            {hoveredEntity.confirmed && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                已确认
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-ink-800">{hoveredEntity.name}</div>
          {hoveredEntity.description && (
            <div className="text-xs text-ink-500 mt-1">{hoveredEntity.description}</div>
          )}
          <div className="text-xs text-ink-400 mt-1">
            出现在 {hoveredEntity.paragraphIds.length} 个段落中
          </div>
        </div>
      )}
    </div>
  )
}
