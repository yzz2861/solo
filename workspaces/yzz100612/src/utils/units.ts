import { BEAUFORT_SCALE, type DepthUnit, type WaveUnit, type WindUnit } from '@/types'

export function ftToM(ft: number): number {
  return ft * 0.3048
}

export function mToFt(m: number): number {
  return m * 3.2808
}

export function toMeters(value: number, unit: DepthUnit | WaveUnit): number {
  return unit === 'ft' ? ftToM(value) : value
}

export function toFeet(value: number): number {
  return mToFt(value)
}

export function knotsToBeaufort(knots: number): number {
  for (let i = BEAUFORT_SCALE.length - 1; i >= 0; i--) {
    if (knots >= BEAUFORT_SCALE[i].minKnots) {
      return BEAUFORT_SCALE[i].level
    }
  }
  return 0
}

export function beaufortToKnots(level: number): number {
  const entry = BEAUFORT_SCALE.find((e) => e.level === level)
  return entry ? Math.round((entry.minKnots + entry.maxKnots) / 2) : 0
}

export function toBeaufort(value: number, unit: WindUnit): number {
  return unit === 'knots' ? knotsToBeaufort(value) : value
}

export function formatLength(meters: number, showBoth: boolean = true): string {
  if (!showBoth) return `${meters.toFixed(1)} m`
  return `${meters.toFixed(1)} m / ${mToFt(meters).toFixed(1)} ft`
}

export function getWindDesc(beaufort: number): string {
  const entry = BEAUFORT_SCALE.find((e) => e.level === beaufort)
  return entry ? `${entry.level}级 ${entry.desc} (${entry.minKnots}-${entry.maxKnots}节)` : ''
}
