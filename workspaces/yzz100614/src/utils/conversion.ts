import type { ConcentrationUnit, VolumeUnit } from '@/types'

export function concentrationToPercent(value: number, unit: ConcentrationUnit): number {
  if (unit === '%') return value
  return value / 10000
}

export function concentrationToMgL(value: number, unit: ConcentrationUnit): number {
  if (unit === 'mg/L') return value
  return value * 10000
}

export function volumeToLiters(value: number, unit: VolumeUnit): number {
  if (unit === 'L') return value
  return value / 1000
}

export function volumeToML(value: number, unit: VolumeUnit): number {
  if (unit === 'mL') return value
  return value * 1000
}

export function formatVolume(liters: number): { value: number; unit: VolumeUnit } {
  const ml = liters * 1000
  if (ml < 1000) {
    return { value: Math.round(ml * 10) / 10, unit: 'mL' }
  }
  return { value: Math.round(liters * 100) / 100, unit: 'L' }
}

export function formatConcentration(percent: number): { value: number; unit: ConcentrationUnit } {
  const mgL = percent * 10000
  if (percent >= 1) {
    return { value: Math.round(percent * 100) / 100, unit: '%' }
  }
  if (mgL >= 1) {
    return { value: Math.round(mgL), unit: 'mg/L' }
  }
  return { value: Math.round(percent * 10000) / 10000, unit: '%' }
}
