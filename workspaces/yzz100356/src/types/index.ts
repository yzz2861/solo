export type TrashCategory = 'recyclable' | 'kitchen' | 'harmful' | 'other'

export interface TrashItem {
  id: string
  name: string
  emoji: string
  category: TrashCategory
  isEasyToMistake: boolean
  mistakeExplanation?: string
  lifeExample?: string
}

export interface MistakeRecord {
  itemId: string
  wrongCategory: TrashCategory
  wrongCount: number
  lastWrongTime: number
}

export interface GameProgress {
  currentLevel: number
  totalScore: number
  streak: number
  maxStreak: number
  itemsAnswered: number
  itemsCorrect: number
  unlockedLevels: number
}

export interface LevelConfig {
  level: number
  itemCount: number
  itemIds: string[]
  passScore: number
}

export type FeedbackType = 'correct' | 'wrong' | null

export interface FeedbackState {
  type: FeedbackType
  item: TrashItem | null
  wrongCategory?: TrashCategory
}

export const CATEGORY_LABELS: Record<TrashCategory, string> = {
  recyclable: '可回收物',
  kitchen: '厨余垃圾',
  harmful: '有害垃圾',
  other: '其他垃圾',
}

export const CATEGORY_COLORS: Record<TrashCategory, string> = {
  recyclable: '#2196F3',
  kitchen: '#4CAF50',
  harmful: '#F44336',
  other: '#9E9E9E',
}

export const CATEGORY_EMOJIS: Record<TrashCategory, string> = {
  recyclable: '♻️',
  kitchen: '🥬',
  harmful: '☠️',
  other: '🗑️',
}
