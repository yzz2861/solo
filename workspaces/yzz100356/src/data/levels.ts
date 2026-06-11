import type { LevelConfig } from '@/types'

const level1Items = [
  'plastic-bottle', 'paper', 'kitchen-leftover', 'fruit-peel',
  'battery', 'egg-shell', 'can', 'tea-leaf', 'glass-jar', 'cigarette-butt',
]

const level2Items = [
  'wet-wipe', 'takeout-box', 'old-clothes', 'big-bone', 'fish-bone',
  'vegetable', 'bread', 'disposable-cup', 'plastic-bag', 'light-bulb',
  'oily-paper-box', 'expired-medicine',
]

const level3Items = [
  'shellfish-shell', 'flower-soil', 'thermometer', 'toothbrush', 'diaper',
  'nut-shell', 'hair', 'ceramic', 'cd', 'paint-can',
  'nail-polish', 'insecticide', 'clothes-hanger', 'sticker',
]

const level4Items = [
  'medicine-bottle', 'toilet-paper', 'popsicle-stick', 'chopsticks',
  'mobile-phone', 'tea-cup', 'plastic-bottle', 'paper', 'kitchen-leftover',
  'wet-wipe', 'takeout-box', 'expired-medicine', 'big-bone', 'shellfish-shell',
  'flower-soil', 'old-clothes', 'disposable-cup', 'cigarette-butt',
]

const level5Items = [
  'plastic-bottle', 'paper', 'kitchen-leftover', 'fruit-peel',
  'battery', 'egg-shell', 'can', 'tea-leaf', 'glass-jar', 'cigarette-butt',
  'wet-wipe', 'takeout-box', 'old-clothes', 'big-bone', 'fish-bone',
  'vegetable', 'bread', 'disposable-cup', 'plastic-bag', 'light-bulb',
]

export const levels: LevelConfig[] = [
  {
    level: 1,
    itemCount: 10,
    itemIds: level1Items,
    passScore: 6,
  },
  {
    level: 2,
    itemCount: 12,
    itemIds: level2Items,
    passScore: 8,
  },
  {
    level: 3,
    itemCount: 14,
    itemIds: level3Items,
    passScore: 9,
  },
  {
    level: 4,
    itemCount: 18,
    itemIds: level4Items,
    passScore: 12,
  },
  {
    level: 5,
    itemCount: 20,
    itemIds: level5Items,
    passScore: 15,
  },
]

export const getLevelById = (level: number): LevelConfig | undefined => {
  return levels.find(l => l.level === level)
}

export const getTotalLevels = (): number => {
  return levels.length
}
