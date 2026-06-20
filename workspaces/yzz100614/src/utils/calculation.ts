import type { ConcentrationUnit, VolumeUnit, DisinfectantType } from '@/types'
import { concentrationToPercent, volumeToLiters, formatVolume } from './conversion'

export interface CalculationResult {
  stockAmount: number
  stockAmountUnit: VolumeUnit
  waterAmount: number
  waterAmountUnit: VolumeUnit
}

export function calculateDilution(
  stockConcentration: number,
  stockConcentrationUnit: ConcentrationUnit,
  targetConcentration: number,
  targetConcentrationUnit: ConcentrationUnit,
  containerVolume: number,
  containerVolumeUnit: VolumeUnit,
): CalculationResult {
  const stockPercent = concentrationToPercent(stockConcentration, stockConcentrationUnit)
  const targetPercent = concentrationToPercent(targetConcentration, targetConcentrationUnit)
  const containerLiters = volumeToLiters(containerVolume, containerVolumeUnit)

  const stockAmountL = (targetPercent * containerLiters) / stockPercent
  const waterAmountL = containerLiters - stockAmountL

  const stock = formatVolume(stockAmountL)
  const water = formatVolume(waterAmountL)

  return {
    stockAmount: stock.value,
    stockAmountUnit: stock.unit,
    waterAmount: water.value,
    waterAmountUnit: water.unit,
  }
}

export function getStockAmountLiters(
  stockConcentration: number,
  stockConcentrationUnit: ConcentrationUnit,
  targetConcentration: number,
  targetConcentrationUnit: ConcentrationUnit,
  containerVolume: number,
  containerVolumeUnit: VolumeUnit,
): number {
  const stockPercent = concentrationToPercent(stockConcentration, stockConcentrationUnit)
  const targetPercent = concentrationToPercent(targetConcentration, targetConcentrationUnit)
  const containerLiters = volumeToLiters(containerVolume, containerVolumeUnit)
  return (targetPercent * containerLiters) / stockPercent
}

export function getDisinfectantIcon(type: DisinfectantType): string {
  switch (type) {
    case '84': return '🧴'
    case 'quaternary_ammonium': return '🧪'
    case 'alcohol': return '💧'
  }
}
