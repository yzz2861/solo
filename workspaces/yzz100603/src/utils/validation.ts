import type { CalculationParams, Warning } from '@/types';
import {
  CHLORINE_NORMAL_MIN,
  CHLORINE_NORMAL_MAX,
  PH_NORMAL_MIN,
  PH_NORMAL_MAX,
} from './unitConversion';

export function validateParams(params: CalculationParams): Warning[] {
  const warnings: Warning[] = [];

  if (params.poolVolume === null || params.poolVolume === undefined || params.poolVolume <= 0) {
    warnings.push({
      type: 'danger',
      message: '池体体积缺失或无效，无法准确计算加药量！请填写正确的池体体积。',
      code: 'POOL_VOLUME_MISSING',
    });
  }

  if (
    params.currentChlorine !== null &&
    params.targetChlorine !== null &&
    params.targetChlorine < params.currentChlorine
  ) {
    warnings.push({
      type: 'danger',
      message: '目标余氯低于当前余氯，不建议投加含氯药剂！请确认是否需要降低余氯。',
      code: 'TARGET_BELOW_CURRENT',
    });
  }

  if (
    params.ph !== null &&
    (params.ph < PH_NORMAL_MIN || params.ph > PH_NORMAL_MAX)
  ) {
    warnings.push({
      type: 'warning',
      message: `pH 值 ${params.ph.toFixed(1)} 超出正常范围 (${PH_NORMAL_MIN}-${PH_NORMAL_MAX})，建议先调节 pH 再进行加药。`,
      code: 'PH_OUT_OF_RANGE',
    });
  }

  if (
    params.currentChlorine !== null &&
    (params.currentChlorine < CHLORINE_NORMAL_MIN || params.currentChlorine > CHLORINE_NORMAL_MAX)
  ) {
    warnings.push({
      type: 'warning',
      message: `当前余氯 ${params.currentChlorine.toFixed(2)} mg/L 超出正常范围 (${CHLORINE_NORMAL_MIN}-${CHLORINE_NORMAL_MAX} mg/L)，请注意安全。`,
      code: 'CURRENT_CHLORINE_OUT_OF_RANGE',
    });
  }

  if (
    params.targetChlorine !== null &&
    (params.targetChlorine < CHLORINE_NORMAL_MIN || params.targetChlorine > CHLORINE_NORMAL_MAX)
  ) {
    warnings.push({
      type: 'warning',
      message: `目标余氯 ${params.targetChlorine.toFixed(2)} mg/L 超出正常范围 (${CHLORINE_NORMAL_MIN}-${CHLORINE_NORMAL_MAX} mg/L)，请确认目标值是否合理。`,
      code: 'TARGET_CHLORINE_OUT_OF_RANGE',
    });
  }

  if (
    params.chemicalConcentration === null ||
    params.chemicalConcentration === undefined ||
    params.chemicalConcentration <= 0
  ) {
    warnings.push({
      type: 'danger',
      message: '药剂浓度缺失或无效，无法准确计算加药量！',
      code: 'CHEMICAL_CONCENTRATION_MISSING',
    });
  }

  if (
    params.poolVolume &&
    params.currentChlorine !== null &&
    params.targetChlorine !== null &&
    params.chemicalConcentration &&
    params.targetChlorine > params.currentChlorine
  ) {
    const chlorineDiff = params.targetChlorine - params.currentChlorine;
    if (chlorineDiff > 3) {
      warnings.push({
        type: 'warning',
        message: `余氯提升幅度过大 (${chlorineDiff.toFixed(2)} mg/L)，建议分多次投加，避免单次投加量过大。`,
        code: 'LARGE_CHLORINE_INCREASE',
      });
    }
  }

  return warnings;
}

export function hasDangerWarning(warnings: Warning[]): boolean {
  return warnings.some((w) => w.type === 'danger');
}

export function getBoundaryViolationReason(warnings: Warning[]): string | undefined {
  const dangerWarnings = warnings.filter((w) => w.type === 'danger');
  if (dangerWarnings.length === 0) return undefined;
  return dangerWarnings.map((w) => w.message).join('；');
}
