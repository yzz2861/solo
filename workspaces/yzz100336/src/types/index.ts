export type DisplayFace = 'front' | 'back' | 'left' | 'right' | 'top'

export interface Product {
  id: string
  name: string
  category: string
  width: number
  height: number
  depth: number
  weight: number
  displayFace: DisplayFace
  color: string
}

export interface ShelfLayer {
  id: string
  heightFromGround: number
  maxLoad: number
}

export interface ShelfConfig {
  id: string
  name: string
  width: number
  depth: number
  layers: ShelfLayer[]
}

export interface Placement {
  id: string
  productId: string
  shelfLayerId: string
  positionX: number
  positionZ: number
  rotationY: number
}

export interface Scheme {
  id: string
  name: string
  shelf: ShelfConfig
  placements: Placement[]
  createdAt: string
  updatedAt: string
}

export type ViewMode = 'free' | 'adult' | 'child' | 'restock'

export type ValidationType = 'overflow' | 'overlap' | 'weight' | 'faceBlocked' | 'restockHard' | 'childInvisible'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  id: string
  type: ValidationType
  severity: ValidationSeverity
  placementIds: string[]
  message: string
  shelfLayerId: string
  suggestion: string
}

export const VIEW_HEIGHTS = {
  adult: 160,
  child: 110,
  restock: 190,
} as const

export const DEFAULT_SHELF_WIDTH = 120
export const DEFAULT_SHELF_DEPTH = 45
export const DEFAULT_LAYERS: ShelfLayer[] = [
  { id: 'layer-1', heightFromGround: 15, maxLoad: 30 },
  { id: 'layer-2', heightFromGround: 55, maxLoad: 25 },
  { id: 'layer-3', heightFromGround: 95, maxLoad: 20 },
  { id: 'layer-4', heightFromGround: 135, maxLoad: 15 },
  { id: 'layer-5', heightFromGround: 175, maxLoad: 10 },
]

export const CATEGORY_COLORS: Record<string, string> = {
  '饮料': '#3b82f6',
  '零食': '#f59e0b',
  '日用': '#10b981',
  '冷柜': '#8b5cf6',
}
