import { useState } from 'react'
import { GripVertical, ChevronDown, ChevronUp, Edit3, Save, X, Tag } from 'lucide-react'
import type { Paragraph, ChapterType } from '@/types'
import { chapterInfos } from '@/data/keywords'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { EntityMarker } from '@/components/EntityMarker'
import { UncertaintyBadge } from '@/components/UncertaintyBadge'
import { TimecodeInput } from '@/components/TimecodeInput'

interface ParagraphEditorProps {
  paragraph: Paragraph
  index: number
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent, index: number) => void
}

export function ParagraphEditor({
  paragraph,
  index,
  isSelected,
  onSelect,
  onDragStart
}: ParagraphEditorProps) {
  const { updateParagraph, updateParagraphChapter } = useTranscriptStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [editContent, setEditContent] = useState(paragraph.content)
  const [showChapterDropdown, setShowChapterDropdown] = useState(false)

  const chapterInfo = chapterInfos.find(c => c.id === paragraph.chapter)

  const handleSave = () => {
    updateParagraph(paragraph.id, { content: editContent })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditContent(paragraph.content)
    setIsEditing(false)
  }

  const handleChapterChange = (chapter: ChapterType) => {
    updateParagraphChapter(paragraph.id, chapter)
    setShowChapterDropdown(false)
  }

  const handleTimecodeChange = (field: 'startTimecode' | 'endTimecode', value: string) => {
    updateParagraph(paragraph.id, { [field]: value })
  }

  return (
    <div
      className={`group bg-white rounded-xl border transition-all ${
        isSelected
          ? 'border-primary-300 ring-2 ring-primary-100 shadow-scroll'
          : 'border-ink-100 hover:border-ink-200 shadow-sm hover:shadow-md'
      }`}
      onClick={onSelect}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="cursor-grab active:cursor-grabbing pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-ink-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-ink-400">#{index + 1}</span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowChapterDropdown(!showChapterDropdown)
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors ${
                  chapterInfo ? chapterInfo.color : 'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                <Tag className="w-3 h-3" />
                {chapterInfo?.name || '未分类'}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showChapterDropdown && (
                <div
                  className="absolute z-10 mt-1 w-40 bg-white rounded-lg shadow-ink border border-ink-200 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {chapterInfos.map((info) => (
                    <button
                      key={info.id || 'null'}
                      onClick={() => handleChapterChange(info.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-ink-50 ${
                        paragraph.chapter === info.id ? 'bg-ink-50' : ''
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${info.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-400')}`} />
                      {info.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {paragraph.startTimecode && (
              <span className="text-xs font-mono text-ink-500 bg-ink-50 px-2 py-0.5 rounded">
                {paragraph.startTimecode}
              </span>
            )}

            <div className="flex-1" />

            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="p-1 hover:bg-ink-100 rounded"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-ink-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-ink-500" />
              )}
            </button>
          </div>

          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none text-ink-800"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
                >
                  <Save className="w-3 h-3" />
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-3 py-1.5 bg-ink-100 text-ink-600 rounded-lg hover:bg-ink-200 text-sm"
                >
                  <X className="w-3 h-3" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="text-ink-800 leading-relaxed">
                <EntityMarker paragraph={paragraph} content={paragraph.content} />
              </div>

              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                  className="absolute top-0 right-0 p-1 bg-white rounded opacity-0 group-hover:opacity-100 hover:bg-ink-100 transition-opacity"
                >
                  <Edit3 className="w-3 h-3 text-ink-500" />
                </button>
              )}
            </div>
          )}

          {isExpanded && !isEditing && (
            <div className="mt-3 pt-3 border-t border-ink-100 space-y-3">
              {paragraph.uncertainties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {paragraph.uncertainties.map((unc) => (
                    <UncertaintyBadge
                      key={unc.id}
                      uncertainty={unc}
                      compact
                    />
                  ))}
                </div>
              )}

              <div onClick={(e) => e.stopPropagation()}>
                <TimecodeInput
                  startTimecode={paragraph.startTimecode}
                  endTimecode={paragraph.endTimecode}
                  onStartTimecodeChange={(v) => handleTimecodeChange('startTimecode', v)}
                  onEndTimecodeChange={(v) => handleTimecodeChange('endTimecode', v)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
