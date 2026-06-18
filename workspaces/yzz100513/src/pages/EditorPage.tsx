import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Download, RefreshCw, Tags, AlertTriangle, User, MapPin, Calendar, Clock, Wand2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { ChapterNav } from '@/components/ChapterNav'
import { ParagraphEditor } from '@/components/ParagraphEditor'
import { EntitiesPanel } from '@/components/EntitiesPanel'
import { ConfirmationPanel } from '@/components/ConfirmationPanel'
import type { ChapterType, Paragraph } from '@/types'
import { chapterInfos } from '@/data/keywords'

type RightPanelTab = 'entities' | 'uncertainties'

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentProject,
    loadProject,
    saveCurrentProject,
    moveParagraphToChapter,
    reorderParagraphs,
    reclassifyAll,
    getFilteredParagraphs,
    isSaving,
    autoSaveEnabled,
    setAutoSaveEnabled,
    selectedChapter,
    selectedParagraphId,
    setSelectedParagraphId
  } = useTranscriptStore()

  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('entities')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadProject(id).then(() => setIsLoading(false))
    }
  }, [id, loadProject])

  const paragraphs = getFilteredParagraphs()

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.setData('paragraphIndex', index.toString())
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((targetIndex: number, e: React.DragEvent) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return
    reorderParagraphs(draggedIndex, targetIndex)
    setDraggedIndex(null)
  }, [draggedIndex, reorderParagraphs])

  const handleChapterDrop = useCallback((chapter: ChapterType, e: React.DragEvent) => {
    e.preventDefault()
    const paragraphId = e.dataTransfer.getData('paragraphId')
    if (paragraphId) {
      moveParagraphToChapter(paragraphId, chapter)
    }
  }, [moveParagraphToChapter])

  const handleExport = () => {
    if (currentProject) {
      navigate(`/export/${currentProject.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-600 mb-4">项目不存在或已被删除</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            返回项目列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-paper overflow-hidden">
      <header className="bg-white border-b border-ink-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-ink-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-600" />
          </button>

          <div>
            <h1 className="font-kai text-xl text-ink-800 leading-tight">
              {currentProject.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-ink-500 mt-0.5">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {currentProject.interviewee || '未填写'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentProject.location || '未填写'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {currentProject.interviewDate || '未填写'}
              </span>
              {currentProject.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentProject.duration}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2 text-sm">
            <span className="text-ink-500">自动保存</span>
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className="text-primary-500 hover:text-primary-600"
            >
              {autoSaveEnabled ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <button
            onClick={reclassifyAll}
            className="flex items-center gap-1.5 px-3 py-2 text-ink-600 hover:bg-ink-50 rounded-lg transition-colors text-sm"
          >
            <Wand2 className="w-4 h-4" />
            重新分类
          </button>

          <button
            onClick={saveCurrentProject}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-ink-600 hover:bg-ink-50 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? '保存中...' : '保存'}
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChapterNav
          onDragOver={handleDragOver}
          onDrop={handleChapterDrop}
        />

        <main className="flex-1 overflow-y-auto bg-scroll">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-kai text-lg text-ink-800">
                  {selectedChapter === undefined
                    ? '全部段落'
                    : selectedChapter === null
                    ? '未分类段落'
                    : chapterInfos.find(c => c.id === selectedChapter)?.name}
                </h2>
                <p className="text-sm text-ink-500 mt-0.5">
                  共 {paragraphs.length} 段
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-ink-500">
                <div className="flex items-center gap-1">
                  <Tags className="w-3.5 h-3.5" />
                  <span>{currentProject.entities.length} 个实体</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{currentProject.uncertainties.filter(u => u.status === 'pending').length} 待确认</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {paragraphs.map((paragraph: Paragraph, index: number) => (
                <div
                  key={paragraph.id}
                  id={`paragraph-${paragraph.id}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(index, e)}
                >
                  <ParagraphEditor
                    paragraph={paragraph}
                    index={paragraph.order}
                    isSelected={selectedParagraphId === paragraph.id}
                    onSelect={() => setSelectedParagraphId(paragraph.id)}
                    onDragStart={handleDragStart}
                  />
                </div>
              ))}

              {paragraphs.length === 0 && (
                <div className="text-center py-12 text-ink-400">
                  <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">该章节暂无段落</p>
                  <p className="text-xs mt-1">拖拽其他段落到本章节，或使用重新分类功能</p>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-80 border-l border-ink-100 flex flex-col bg-white flex-shrink-0">
          <div className="flex border-b border-ink-100">
            <button
              onClick={() => setRightPanelTab('entities')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === 'entities'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Tags className="w-4 h-4" />
                实体列表
              </div>
            </button>
            <button
              onClick={() => setRightPanelTab('uncertainties')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                rightPanelTab === 'uncertainties'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                待确认
                {currentProject.uncertainties.filter(u => u.status === 'pending').length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {currentProject.uncertainties.filter(u => u.status === 'pending').length}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanelTab === 'entities' ? (
              <EntitiesPanel />
            ) : (
              <ConfirmationPanel />
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
