import type { AnchorType, EstimateInput, EstimateResult, RiskLevel } from '@/types'
import { toMeters, toBeaufort } from './units'

const ANCHOR_SCOPE_FACTOR: Record<AnchorType, number> = {
  danforth: 1.0,
  plow: 0.9,
  claw: 0.95,
  mushroom: 1.2,
  grapple: 1.3,
}

const UNSUITABLE_CONDITIONS: Record<AnchorType, (beaufort: number) => boolean> = {
  danforth: (b) => b >= 7,
  plow: () => false,
  claw: () => false,
  mushroom: (b) => b >= 5,
  grapple: (b) => b >= 5,
}

function getScopeRange(beaufort: number): { min: number; max: number } | null {
  if (beaufort <= 3) return { min: 3, max: 5 }
  if (beaufort <= 5) return { min: 5, max: 7 }
  if (beaufort <= 7) return { min: 7, max: 10 }
  return null
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const warnings: string[] = []
  const depthM = toMeters(input.waterDepth, input.depthUnit)
  const waveM = toMeters(input.waveHeight, input.waveUnit)
  const beaufort = toBeaufort(input.windLevel, input.windUnit)

  if (depthM <= 0) {
    warnings.push('水深为零或负值，无法计算锚链长度，请确认水深数据')
  }

  if (depthM < 1 && depthM > 0) {
    warnings.push('水深极浅（<1m），锚链可能无法有效展开，请特别注意船底间隙')
  }

  if (beaufort >= 8) {
    warnings.push('⚠ 风力达到蒲福8级或以上，强烈建议不要停泊，应寻找避风港湾')
  }

  if (waveM > 2) {
    warnings.push('浪高超过2m，停泊风险极大，强烈建议不要停泊')
  } else if (waveM > 1 && beaufort >= 6) {
    warnings.push('风大浪高组合条件下，停泊风险较高，建议考虑避风')
  }

  if (UNSUITABLE_CONDITIONS[input.anchorType](beaufort)) {
    const anchorNames: Record<AnchorType, string> = {
      danforth: 'Danforth/Fluke',
      plow: 'Plow/CQR',
      claw: 'Claw/Bruce',
      mushroom: 'Mushroom',
      grapple: 'Grapple',
    }
    warnings.push(`${anchorNames[input.anchorType]}锚型在当前风力条件下不适合，建议更换锚型`)
  }

  if (input.anchorType === 'mushroom' && input.mooringHours < 24) {
    warnings.push('Mushroom锚专为永久系泊设计，不适合短期临时停泊')
  }

  if (input.anchorType === 'grapple' && input.mooringHours > 4) {
    warnings.push('Grapple锚仅适合短时抓底，不推荐超过4小时停泊')
  }

  if (input.isNight) {
    warnings.push('🌙 夜间停泊：可视范围受限，建议增加1倍Scope比率，保持甲板照明，安排值班监视')
  }

  if (input.mooringHours > 24) {
    warnings.push('停泊时间超过24小时，潮汐变化可能导致水深显著变化，建议重新评估')
  }

  if (beaufort >= 8 || (waveM > 2)) {
    const recLen = depthM > 0 ? Math.round(depthM * 10 * 1.3 * 10) / 10 : 0
    return {
      recommendedLength: recLen,
      minLength: recLen,
      maxLength: recLen,
      scopeRatio: 0,
      minScope: 0,
      maxScope: 0,
      riskLevel: 'no_anchor',
      warnings,
    }
  }

  if (depthM <= 0) {
    return {
      recommendedLength: 0,
      minLength: 0,
      maxLength: 0,
      scopeRatio: 0,
      minScope: 0,
      maxScope: 0,
      riskLevel: 'danger',
      warnings,
    }
  }

  const baseScope = getScopeRange(beaufort)!
  let minScope = baseScope.min
  let maxScope = baseScope.max

  if (waveM > 1) {
    minScope += 0.5
    maxScope += 0.5
  }
  if (waveM > 2) {
    minScope += 0.5
    maxScope += 0.5
  }

  if (input.isNight) {
    minScope += 1.0
    maxScope += 1.0
  }

  if (input.mooringHours > 12) {
    minScope += 0.5
    maxScope += 0.5
  }
  if (input.mooringHours > 24) {
    minScope += 0.5
    maxScope += 0.5
  }

  if (input.boatLength > 12) {
    minScope += 0.5
    maxScope += 0.5
  }

  const anchorFactor = ANCHOR_SCOPE_FACTOR[input.anchorType]
  minScope = Math.round(minScope * anchorFactor * 10) / 10
  maxScope = Math.round(maxScope * anchorFactor * 10) / 10

  const recommendedScope = Math.round(((minScope + maxScope) / 2) * 10) / 10
  const recommendedLength = Math.round(depthM * recommendedScope * 10) / 10
  const minLength = Math.round(depthM * minScope * 10) / 10
  const maxLength = Math.round(depthM * maxScope * 10) / 10

  let riskLevel: RiskLevel = 'safe'
  if (beaufort >= 6 || waveM > 1.5) {
    riskLevel = 'danger'
  } else if (beaufort >= 4 || waveM > 0.5 || input.isNight || input.anchorType === 'grapple' || input.anchorType === 'mushroom') {
    riskLevel = 'caution'
  }

  return {
    recommendedLength,
    minLength,
    maxLength,
    scopeRatio: recommendedScope,
    minScope,
    maxScope,
    riskLevel,
    warnings,
  }
}
