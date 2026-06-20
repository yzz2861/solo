export type DepthUnit = 'm' | 'ft'
export type WindUnit = 'beaufort' | 'knots'
export type WaveUnit = 'm' | 'ft'
export type AnchorType = 'danforth' | 'plow' | 'claw' | 'mushroom' | 'grapple'
export type RiskLevel = 'safe' | 'caution' | 'danger' | 'no_anchor'

export interface EstimateInput {
  waterDepth: number
  depthUnit: DepthUnit
  boatLength: number
  anchorType: AnchorType
  windLevel: number
  windUnit: WindUnit
  waveHeight: number
  waveUnit: WaveUnit
  mooringHours: number
  location: string
  isNight: boolean
}

export interface EstimateResult {
  recommendedLength: number
  minLength: number
  maxLength: number
  scopeRatio: number
  minScope: number
  maxScope: number
  riskLevel: RiskLevel
  warnings: string[]
}

export interface EstimateRecord extends EstimateInput, EstimateResult {
  id: string
  timestamp: number
}

export const ANCHOR_LABELS: Record<AnchorType, string> = {
  danforth: 'Danforth/Fluke',
  plow: 'Plow/CQR',
  claw: 'Claw/Bruce',
  mushroom: 'Mushroom',
  grapple: 'Grapple',
}

export const ANCHOR_DESCRIPTIONS: Record<AnchorType, string> = {
  danforth: '沙泥底质适用，轻型船常用',
  plow: '通用型，抓地力强',
  claw: '岩石/海草底质适用',
  mushroom: '永久系泊专用，不适合临时停泊',
  grapple: '临时抓底用，不推荐长时间停泊',
}

export const BEAUFORT_SCALE = [
  { level: 0, minKnots: 0, maxKnots: 1, desc: '无风' },
  { level: 1, minKnots: 1, maxKnots: 3, desc: '软风' },
  { level: 2, minKnots: 4, maxKnots: 6, desc: '轻风' },
  { level: 3, minKnots: 7, maxKnots: 10, desc: '微风' },
  { level: 4, minKnots: 11, maxKnots: 16, desc: '和风' },
  { level: 5, minKnots: 17, maxKnots: 21, desc: '清风' },
  { level: 6, minKnots: 22, maxKnots: 27, desc: '强风' },
  { level: 7, minKnots: 28, maxKnots: 33, desc: '疾风' },
  { level: 8, minKnots: 34, maxKnots: 40, desc: '大风' },
  { level: 9, minKnots: 41, maxKnots: 47, desc: '烈风' },
  { level: 10, minKnots: 48, maxKnots: 55, desc: '狂风' },
  { level: 11, minKnots: 56, maxKnots: 63, desc: '暴风' },
  { level: 12, minKnots: 64, maxKnots: 999, desc: '飓风' },
]
