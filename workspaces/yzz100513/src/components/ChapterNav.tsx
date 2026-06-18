import { useState } from 'react'
import { Home, Wrench, Users, Hammer, TrendingUp, Archive, GripVertical } from 'lucide-react'
import type { ChapterType, ChapterInfo } from '@/types'
import { chapterInfos } from '@/data/keywords'
import { useTranscriptStore } from '@/store/useTranscriptStore'

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  Wrench: <Wrench className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Hammer: <Hammer className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Archive: <Archive className="w-4 h-4" />
}

interface ChapterNavProps {
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (chapter: ChapterType, e: React.DragEvent) => void
}

export function ChapterNav({ onDragOver, onDrop }: ChapterNavProps) {
  const { selectedChapter, setSelectedChapter, getChapterStats } = useTranscriptStore()
  const [draggedChapter, setDraggedChapter] = useState<ChapterType>(null)
  const stats = getChapterStats()

  const getCount = (info: ChapterInfo) => {
    if (info.id === null) {
      return stats.unclassified || 0
    }
    return stats[info.id] || 0
  }

  const handleDragStart = (e: React.DragEvent, chapter: ChapterType) => {
    setDraggedChapter(chapter)
    e.dataTransfer.setData('chapter', chapter || 'null')
  }

  const handleDragEnd = () => {
    setDraggedChapter(null)
  }

  return (
    <nav className="w-64 bg-scroll border-r border-ink-100 flex flex-col h-full">
      <div className="p-4 border-b border-ink-100">
        <h2 className="text-lg font-kai text-ink-800">章节导航</h2>
        <p className="text-xs text-ink-500 mt-1">点击切换，拖拽段落到章节</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => setSelectedChapter(undefined as unknown as ChapterType)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
            selectedChapter === undefined
              ? 'bg-primary-100 text-primary-800'
              : 'hover:bg-ink-50 text-ink-700'
          }`}
        >
          <span className="w-8 h-8 flex items-center justify-center bg-primary-50 rounded-lg">
            <Users className="w-4 h-4 text-primary-600" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">全部段落</div>
          </div>
          <span className="text-xs bg-ink-100 px-2 py-0.5 rounded-full">
            {Object.values(stats).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        {chapterInfos.map((info) => {
          const count = getCount(info)
          const isSelected = selectedChapter === info.id
          const isDragged = draggedChapter === info.id

          return (
            <div
              key={info.id || 'unclassified'}
              draggable
              onDragStart={(e) => handleDragStart(e, info.id)}
              onDragEnd={handleDragEnd}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop?.(info.id, e)}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary-50 ring-2 ring-primary-200'
                  : 'hover:bg-ink-50'
              } ${isDragged ? 'opacity-50' : ''}`}
            >
              <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-ink-400" />
              </div>

              <button
                onClick={() => setSelectedChapter(info.id)}
                className={`flex-1 flex items-center gap-3 text-left min-w-0`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${info.color.split(' ')[0]}`}>
                  {iconMap[info.icon]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-sm ${info.color.split(' ')[1]}`}>
                    {info.name}
                  </div>
                  <div className="text-xs text-ink-500 truncate">
                    {info.description}
                  </div>
                </div>
              </button>

              <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
