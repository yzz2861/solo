import { create } from 'zustand'
import type { GameProgress, MistakeRecord, TrashItem, TrashCategory, FeedbackState } from '@/types'
import { getProgress, saveProgress, getMistakes, saveMistakes, addMistake, removeMistake } from '@/utils/storage'
import { getLevelById, getTotalLevels } from '@/data/levels'
import { getItemById } from '@/data/trashItems'

interface GameState {
  progress: GameProgress
  mistakes: MistakeRecord[]
  currentLevelItems: TrashItem[]
  currentItemIndex: number
  levelCorrectCount: number
  isPlaying: boolean
  feedback: FeedbackState
  showLevelComplete: boolean
  
  initGame: () => void
  startLevel: (level: number) => void
  submitAnswer: (itemId: string, selectedCategory: TrashCategory) => void
  nextItem: () => void
  closeFeedback: () => void
  closeLevelComplete: () => void
  removeMistakeItem: (itemId: string) => void
  resetGame: () => void
  shuffleArray: <T>(array: T[]) => T[]
}

export const useGameStore = create<GameState>((set, get) => ({
  progress: getProgress(),
  mistakes: getMistakes(),
  currentLevelItems: [],
  currentItemIndex: 0,
  levelCorrectCount: 0,
  isPlaying: false,
  feedback: { type: null, item: null },
  showLevelComplete: false,

  initGame: () => {
    const progress = getProgress()
    const mistakes = getMistakes()
    set({ progress, mistakes })
  },

  shuffleArray: <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  },

  startLevel: (level: number) => {
    const levelConfig = getLevelById(level)
    if (!levelConfig) return

    const { shuffleArray } = get()
    const items = levelConfig.itemIds
      .map(id => getItemById(id))
      .filter((item): item is TrashItem => item !== undefined)
    
    const shuffledItems = shuffleArray(items)

    set(state => ({
      currentLevelItems: shuffledItems,
      currentItemIndex: 0,
      levelCorrectCount: 0,
      isPlaying: true,
      showLevelComplete: false,
      feedback: { type: null, item: null },
      progress: {
        ...state.progress,
        currentLevel: level,
        streak: 0,
      },
    }))
  },

  submitAnswer: (itemId: string, selectedCategory: TrashCategory) => {
    const item = getItemById(itemId)
    if (!item) return

    const isCorrect = item.category === selectedCategory

    set(state => {
      const newProgress = { ...state.progress }
      newProgress.itemsAnswered += 1

      const newLevelCorrect = isCorrect ? state.levelCorrectCount + 1 : state.levelCorrectCount

      if (isCorrect) {
        newProgress.totalScore += 1
        newProgress.itemsCorrect += 1
        newProgress.streak += 1
        if (newProgress.streak > newProgress.maxStreak) {
          newProgress.maxStreak = newProgress.streak
        }
      } else {
        newProgress.streak = 0
        addMistake(itemId, selectedCategory)
      }

      const nextIndex = state.currentItemIndex + 1
      const isLastItem = nextIndex >= state.currentLevelItems.length

      if (isLastItem) {
        const levelConfig = getLevelById(newProgress.currentLevel)
        const passed = levelConfig ? newLevelCorrect >= levelConfig.passScore : false
        
        if (passed && newProgress.currentLevel >= newProgress.unlockedLevels && newProgress.currentLevel < getTotalLevels()) {
          newProgress.unlockedLevels = newProgress.currentLevel + 1
        }
      }

      saveProgress(newProgress)

      return {
        progress: newProgress,
        levelCorrectCount: newLevelCorrect,
        feedback: {
          type: isCorrect ? 'correct' : 'wrong',
          item,
          wrongCategory: isCorrect ? undefined : selectedCategory,
        },
        mistakes: getMistakes(),
        showLevelComplete: isLastItem,
      }
    })
  },

  nextItem: () => {
    set(state => {
      const nextIndex = state.currentItemIndex + 1
      if (nextIndex >= state.currentLevelItems.length) {
        return {
          isPlaying: false,
        }
      }
      return {
        currentItemIndex: nextIndex,
        feedback: { type: null, item: null },
      }
    })
  },

  closeFeedback: () => {
    set({ feedback: { type: null, item: null } })
  },

  closeLevelComplete: () => {
    set({ showLevelComplete: false, isPlaying: false })
  },

  removeMistakeItem: (itemId: string) => {
    removeMistake(itemId)
    set({ mistakes: getMistakes() })
  },

  resetGame: () => {
    const defaultProgress = {
      currentLevel: 1,
      totalScore: 0,
      streak: 0,
      maxStreak: 0,
      itemsAnswered: 0,
      itemsCorrect: 0,
      unlockedLevels: 1,
    }
    saveProgress(defaultProgress)
    saveMistakes([])
    set({
      progress: defaultProgress,
      mistakes: [],
      currentLevelItems: [],
      currentItemIndex: 0,
      isPlaying: false,
      feedback: { type: null, item: null },
      showLevelComplete: false,
    })
  },
}))
