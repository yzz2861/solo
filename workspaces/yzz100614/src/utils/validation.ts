import type { DisinfectantType, ConcentrationUnit, VolumeUnit, ValidationResult, UsagePreset } from '@/types'
import { concentrationToPercent, volumeToLiters } from './conversion'

export function validateDilution(
  disinfectantType: DisinfectantType,
  stockConcentration: number,
  stockConcentrationUnit: ConcentrationUnit,
  targetConcentration: number,
  targetConcentrationUnit: ConcentrationUnit,
  containerVolume: number,
  containerVolumeUnit: VolumeUnit,
  usageScenario: string,
  presets: UsagePreset[],
  existingRecords: { usageScenario: string; targetConcentration: number; targetConcentrationUnit: ConcentrationUnit }[],
): ValidationResult[] {
  const results: ValidationResult[] = []

  const stockPercent = concentrationToPercent(stockConcentration, stockConcentrationUnit)
  const targetPercent = concentrationToPercent(targetConcentration, targetConcentrationUnit)
  const containerLiters = volumeToLiters(containerVolume, containerVolumeUnit)

  if (targetPercent > stockPercent) {
    results.push({
      level: 'block',
      message: '目标浓度不能高于原液浓度，请检查输入',
      code: 'CONCENTRATION_OVERFLOW',
    })
  }

  if (disinfectantType === 'alcohol' && targetPercent < 70 && targetPercent > 0) {
    results.push({
      level: 'warn',
      message: '酒精浓度低于70%杀菌效果显著下降，确认是否继续？',
      code: 'ALCOHOL_DILUTION',
    })
  }

  if (stockPercent > 0) {
    const stockAmountL = (targetPercent * containerLiters) / stockPercent
    if (stockAmountL > containerLiters) {
      results.push({
        level: 'block',
        message: '原液用量超过容器体积，请增大容器或降低目标浓度',
        code: 'CONTAINER_TOO_SMALL',
      })
    }
  }

  if (usageScenario && presets.length > 0) {
    const preset = presets.find(p => p.scenarioName === usageScenario)
    if (preset) {
      const presetPercent = concentrationToPercent(preset.recommendedConcentration, preset.concentrationUnit)
      if (presetPercent > 0 && targetPercent > 0) {
        const deviation = Math.abs(targetPercent - presetPercent) / presetPercent
        if (deviation > 0.5) {
          results.push({
            level: 'info',
            message: `当前浓度与「${usageScenario}」推荐浓度差异较大（推荐${preset.concentrationUnit === '%' ? preset.recommendedConcentration + '%' : preset.recommendedConcentration + 'mg/L'}），请确认用途是否正确`,
            code: 'SCENARIO_MISMATCH',
          })
        }
      }
    }
  }

  if (usageScenario && existingRecords.length > 0) {
    const sameScenarioRecords = existingRecords.filter(r => r.usageScenario === usageScenario)
    if (sameScenarioRecords.length > 0) {
      const hasDifferentConcentration = sameScenarioRecords.some(r => {
        const recordPercent = concentrationToPercent(r.targetConcentration, r.targetConcentrationUnit)
        return Math.abs(recordPercent - targetPercent) > 0.0001
      })
      if (hasDifferentConcentration) {
        results.push({
          level: 'warn',
          message: `「${usageScenario}」已有不同浓度的配制记录，不同目标浓度不能混用`,
          code: 'MIXED_CONCENTRATION',
        })
      }
    }
  }

  return results
}
