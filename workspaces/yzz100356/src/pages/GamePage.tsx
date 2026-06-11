import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GameHeader from '@/components/GameHeader'
import TrashBin from '@/components/TrashBin'
import DraggableItem from '@/components/DraggableItem'
import FeedbackModal from '@/components/FeedbackModal'
import LevelCompleteModal from '@/components/LevelCompleteModal'
import { useGameStore } from '@/store/useGameStore'
import type { TrashCategory } from '@/types'

const GamePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const levelParam = searchParams.get('level')

  const {
    progress,
    currentLevelItems,
    currentItemIndex,
    levelCorrectCount,
    isPlaying,
    feedback,
    showLevelComplete,
    startLevel,
    submitAnswer,
    nextItem,
    closeFeedback,
    closeLevelComplete,
  } = useGameStore()

  const [highlightedBin, setHighlightedBin] = useState<TrashCategory | null>(null)
  const [binFeedback, setBinFeedback] = useState<Record<TrashCategory, boolean | null>>({
    recyclable: null,
    kitchen: null,
    harmful: null,
    other: null,
  })
  const [itemPosition, setItemPosition] = useState({ x: 0, visible: true })

  const currentItem = currentLevelItems[currentItemIndex]
  const startLevelNum = levelParam ? parseInt(levelParam) : progress.currentLevel

  useEffect(() => {
    if (!isPlaying || currentLevelItems.length === 0) {
      const level = startLevelNum > 0 ? startLevelNum : 1
      startLevel(level)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, category: TrashCategory) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setHighlightedBin(category)
  }, [])

  const handleDragLeave = useCallback(() => {
    setHighlightedBin(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, category: TrashCategory) => {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId || !currentItem) return

    setHighlightedBin(null)

    const isCorrect = currentItem.category === category
    setBinFeedback(prev => ({ ...prev, [category]: isCorrect }))

    submitAnswer(itemId, category)

    setTimeout(() => {
      setBinFeedback({ recyclable: null, kitchen: null, harmful: null, other: null })
    }, 500)
  }, [currentItem, submitAnswer])

  const handleBinClick = useCallback((category: TrashCategory) => {
    if (!currentItem || feedback.type) return

    const isCorrect = currentItem.category === category
    setBinFeedback(prev => ({ ...prev, [category]: isCorrect }))

    submitAnswer(currentItem.id, category)

    setTimeout(() => {
      setBinFeedback({ recyclable: null, kitchen: null, harmful: null, other: null })
    }, 500)
  }, [currentItem, submitAnswer, feedback.type])

  const handleFeedbackClose = () => {
    closeFeedback()
    if (showLevelComplete) {
      closeLevelComplete()
    } else {
      nextItem()
    }
  }

  const handleNextLevel = () => {
    const nextLevel = progress.currentLevel + 1
    closeLevelComplete()
    startLevel(nextLevel)
  }

  const handleRetry = () => {
    closeLevelComplete()
    startLevel(progress.currentLevel)
  }

  const handleHome = () => {
    closeLevelComplete()
    navigate('/')
  }

  const categories: TrashCategory[] = ['recyclable', 'kitchen', 'harmful', 'other']

  if (!currentItem && !showLevelComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-xl text-gray-500">加载中...</div>
      </div>
    )
  }

  const levelCorrect = levelCorrectCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col p-4 sm:p-6">
      <GameHeader
        level={progress.currentLevel}
        score={progress.totalScore}
        streak={progress.streak}
        totalItems={currentLevelItems.length}
        currentIndex={currentItemIndex}
      />

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          <div className="bg-white/60 backdrop-blur rounded-3xl p-6 sm:p-8 mb-8 shadow-lg min-h-[180px] sm:min-h-[200px] flex items-center justify-center">
            {currentItem && !feedback.type && (
              <div className="flex flex-col items-center animate-pop-in" key={currentItem.id}>
                <p className="text-gray-500 mb-4 text-lg">把这个扔到正确的垃圾桶吧～</p>
                <DraggableItem item={currentItem} />
              </div>
            )}

            {feedback.type && feedback.item && (
              <div className={`text-5xl sm:text-6xl ${feedback.type === 'correct' ? 'animate-bounce' : 'animate-wiggle'}`}>
                {feedback.type === 'correct' ? '✨' : '🤔'}
              </div>
            )}
          </div>

          <p className="text-center text-gray-400 text-sm mb-4">
            👆 拖拽物品到垃圾桶，或直接点击垃圾桶选择
          </p>

          <div className="flex justify-center gap-3 sm:gap-6 flex-wrap">
            {categories.map(category => (
              <div key={category} onClick={() => handleBinClick(category)}>
                <TrashBin
                  category={category}
                  isHighlighted={highlightedBin === category}
                  isCorrect={binFeedback[category]}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDrop={(e) => handleDrop(e, category)}
                  onDragLeave={handleDragLeave}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <FeedbackModal feedback={feedback} onClose={handleFeedbackClose} />

      {showLevelComplete && (
        <LevelCompleteModal
          level={progress.currentLevel}
          score={progress.totalScore}
          totalItems={currentLevelItems.length}
          correctCount={levelCorrect}
          onNextLevel={handleNextLevel}
          onRetry={handleRetry}
          onHome={handleHome}
        />
      )}
    </div>
  )
}

export default GamePage
