import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Maximize, ArrowLeft, Lightbulb, Eye, EyeOff } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getItemById, getEasyMistakeItems } from '@/data/trashItems'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types'
import type { TrashCategory, TrashItem, MistakeRecord } from '@/types'

const BigScreenPage: React.FC = () => {
  const navigate = useNavigate()
  const { mistakes } = useGameStore()

  const mistakeItems: Array<{ record: MistakeRecord; item: TrashItem }> = mistakes
    .map(record => {
      const item = getItemById(record.itemId)
      if (!item) return null
      return { record, item }
    })
    .filter((item): item is { record: MistakeRecord; item: TrashItem } => item !== null)
    .sort((a, b) => b.record.wrongCount - a.record.wrongCount)

  const easyMistakeItems = getEasyMistakeItems()
  
  const displayItems = mistakeItems.length > 0 
    ? mistakeItems.map(m => m.item)
    : easyMistakeItems

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentItem = displayItems[currentIndex]

  const goNext = () => {
    setShowAnswer(false)
    setCurrentIndex(prev => (prev + 1) % displayItems.length)
  }

  const goPrev = () => {
    setShowAnswer(false)
    setCurrentIndex(prev => (prev - 1 + displayItems.length) % displayItems.length)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (!showAnswer) {
          setShowAnswer(true)
        } else {
          goNext()
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'Escape') {
        navigate('/volunteer')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAnswer, currentIndex])

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        暂无数据
      </div>
    )
  }

  const categories: TrashCategory[] = ['recyclable', 'kitchen', 'harmful', 'other']

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-10">
        <button
          onClick={() => navigate('/volunteer')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>

        <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
          <span className="text-gray-400">第 </span>
          <span className="text-2xl font-bold text-yellow-400">{currentIndex + 1}</span>
          <span className="text-gray-400"> / {displayItems.length} 题</span>
        </div>

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition-colors"
        >
          <Maximize className="w-5 h-5" />
          <span>全屏</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="mb-8 text-center animate-pop-in" key={currentItem.id}>
          <div className="text-9xl mb-6">{currentItem.emoji}</div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4">
            {currentItem.name}
          </h1>
          <p className="text-2xl text-gray-400">
            这是什么垃圾？
          </p>
          {currentItem.isEasyToMistake && (
            <div className="mt-4 inline-block px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-xl">
              ⚠️ 易错题
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 w-full max-w-4xl">
          {categories.map(cat => (
            <div
              key={cat}
              className={`
                p-6 sm:p-8 rounded-3xl text-center transition-all duration-500
                ${showAnswer && cat === currentItem.category
                  ? 'ring-4 ring-white scale-105 shadow-2xl'
                  : 'opacity-70 hover:opacity-100'
                }
              `}
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            >
              <div className="text-5xl sm:text-6xl mb-3">
                {cat === 'recyclable' && '♻️'}
                {cat === 'kitchen' && '🥬'}
                {cat === 'harmful' && '☠️'}
                {cat === 'other' && '🗑️'}
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {CATEGORY_LABELS[cat]}
              </div>
              {showAnswer && cat === currentItem.category && (
                <div className="mt-3 text-lg font-bold bg-white/30 rounded-full py-1">
                  ✓ 正确答案
                </div>
              )}
            </div>
          ))}
        </div>

        {showAnswer && (
          <div className="max-w-3xl w-full bg-white/10 backdrop-blur rounded-3xl p-8 animate-slide-up">
            {currentItem.mistakeExplanation && (
              <div className="mb-4">
                <h3 className="text-xl font-bold text-yellow-400 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-6 h-6" />
                  为什么？
                </h3>
                <p className="text-xl leading-relaxed">
                  {currentItem.mistakeExplanation}
                </p>
              </div>
            )}

            {currentItem.lifeExample && (
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-2">
                  💡 生活中的例子
                </h3>
                <p className="text-xl leading-relaxed">
                  {currentItem.lifeExample}
                </p>
              </div>
            )}
          </div>
        )}

        {!showAnswer && (
          <button
            onClick={() => setShowAnswer(true)}
            className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-2xl font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-yellow-500/30 flex items-center gap-3"
          >
            <Eye className="w-7 h-7" />
            查看答案
          </button>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
        <button
          onClick={goPrev}
          className="p-4 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors hover:scale-110"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>

        <button
          onClick={() => {
            if (showAnswer) {
              goNext()
            } else {
              setShowAnswer(true)
            }
          }}
          className="px-8 py-4 bg-white/20 backdrop-blur rounded-2xl hover:bg-white/30 transition-colors text-xl font-medium"
        >
          {showAnswer ? '下一题 →' : '显示答案'}
        </button>

        <button
          onClick={goNext}
          className="p-4 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors hover:scale-110"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>

      <div className="fixed bottom-4 right-4 text-gray-500 text-sm">
        键盘操作：← → 切换题目 · 空格显示答案 · ESC 返回
      </div>
    </div>
  )
}

export default BigScreenPage
