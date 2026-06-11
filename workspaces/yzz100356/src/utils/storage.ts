import type { GameProgress, MistakeRecord } from '@/types'

const PROGRESS_KEY = 'trash_game_progress'
const MISTAKES_KEY = 'trash_game_mistakes'
const VOLUNTEER_KEY = 'trash_game_volunteer'

const defaultProgress: GameProgress = {
  currentLevel: 1,
  totalScore: 0,
  streak: 0,
  maxStreak: 0,
  itemsAnswered: 0,
  itemsCorrect: 0,
  unlockedLevels: 1,
}

export const getProgress = (): GameProgress => {
  try {
    const data = localStorage.getItem(PROGRESS_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load progress:', e)
  }
  return { ...defaultProgress }
}

export const saveProgress = (progress: GameProgress): void => {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch (e) {
    console.error('Failed to save progress:', e)
  }
}

export const resetProgress = (): void => {
  localStorage.removeItem(PROGRESS_KEY)
}

export const getMistakes = (): MistakeRecord[] => {
  try {
    const data = localStorage.getItem(MISTAKES_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Failed to load mistakes:', e)
  }
  return []
}

export const saveMistakes = (mistakes: MistakeRecord[]): void => {
  try {
    localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes))
  } catch (e) {
    console.error('Failed to save mistakes:', e)
  }
}

export const addMistake = (itemId: string, wrongCategory: string): void => {
  const mistakes = getMistakes()
  const existing = mistakes.find(m => m.itemId === itemId)
  
  if (existing) {
    existing.wrongCount += 1
    existing.lastWrongTime = Date.now()
    existing.wrongCategory = wrongCategory as any
  } else {
    mistakes.push({
      itemId,
      wrongCategory: wrongCategory as any,
      wrongCount: 1,
      lastWrongTime: Date.now(),
    })
  }
  
  saveMistakes(mistakes)
}

export const removeMistake = (itemId: string): void => {
  const mistakes = getMistakes()
  const filtered = mistakes.filter(m => m.itemId !== itemId)
  saveMistakes(filtered)
}

export const clearMistakes = (): void => {
  localStorage.removeItem(MISTAKES_KEY)
}

export const getVolunteerMode = (): boolean => {
  try {
    return localStorage.getItem(VOLUNTEER_KEY) === 'true'
  } catch (e) {
    return false
  }
}

export const setVolunteerMode = (value: boolean): void => {
  try {
    localStorage.setItem(VOLUNTEER_KEY, String(value))
  } catch (e) {
    console.error('Failed to save volunteer mode:', e)
  }
}
