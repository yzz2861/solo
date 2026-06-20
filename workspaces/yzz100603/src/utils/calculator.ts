import type {
  CalculationParams,
  CalculationResult,
  CalculationStep,
  Chemical,
} from '@/types';
import {
  chlorineToMgL,
  concentrationToPercent,
  convertDoseToBestUnit,
  formatNumber,
  formatChlorineUnit,
  formatConcentrationUnit,
} from './unitConversion';
import { validateParams, hasDangerWarning, getBoundaryViolationReason } from './validation';

export function calculateDose(
  params: CalculationParams,
  chemical: Chemical
): CalculationResult | null {
  const warnings = validateParams(params);

  if (
    !params.poolVolume ||
    params.currentChlorine === null ||
    params.targetChlorine === null ||
    !params.chemicalConcentration
  ) {
    return {
      dose: 0,
      doseUnit: chemical.type === 'tablet' ? 'g' : 'mL',
      steps: [],
      warnings,
      hasBoundaryViolation: hasDangerWarning(warnings),
      violationReason: getBoundaryViolationReason(warnings),
    };
  }

  const steps: CalculationStep[] = [];

  const currentClMgL = chlorineToMgL(params.currentChlorine, params.chlorineUnit);
  const targetClMgL = chlorineToMgL(params.targetChlorine, params.chlorineUnit);

  steps.push({
    stepOrder: 1,
    description: '确认水质参数',
    formula: `当前余氯: ${formatNumber(params.currentChlorine)} ${formatChlorineUnit(params.chlorineUnit)} = ${formatNumber(currentClMgL)} mg/L\n目标余氯: ${formatNumber(params.targetChlorine)} ${formatChlorineUnit(params.chlorineUnit)} = ${formatNumber(targetClMgL)} mg/L\n池体体积: ${formatNumber(params.poolVolume)} m³`,
    result: `余氯差值: ${formatNumber(targetClMgL - currentClMgL)} mg/L`,
  });

  const poolLiters = params.poolVolume * 1000;
  steps.push({
    stepOrder: 2,
    description: '计算池水总容积（升）',
    formula: `${formatNumber(params.poolVolume)} m³ × 1000 = ${formatNumber(poolLiters)} L`,
    result: `${formatNumber(poolLiters)} 升`,
  });

  const chlorineDiff = Math.max(0, targetClMgL - currentClMgL);
  const requiredChlorineMg = poolLiters * chlorineDiff;
  const requiredChlorineG = requiredChlorineMg / 1000;

  steps.push({
    stepOrder: 3,
    description: '计算所需有效氯总量',
    formula: `${formatNumber(poolLiters)} L × ${formatNumber(chlorineDiff)} mg/L = ${formatNumber(requiredChlorineMg)} mg = ${formatNumber(requiredChlorineG)} g`,
    result: `${formatNumber(requiredChlorineG)} 克有效氯`,
  });

  const concentrationPercent = concentrationToPercent(
    params.chemicalConcentration,
    params.concentrationUnit
  );
  const concentrationDecimal = concentrationPercent / 100;

  steps.push({
    stepOrder: 4,
    description: '换算药剂有效氯浓度',
    formula: `${formatNumber(params.chemicalConcentration)} ${formatConcentrationUnit(params.concentrationUnit)} = ${formatNumber(concentrationPercent)}% = ${formatNumber(concentrationDecimal, 4)} (小数)`,
    result: `有效浓度: ${formatNumber(concentrationPercent)}%`,
  });

  const rawDoseG = requiredChlorineG / concentrationDecimal;

  steps.push({
    stepOrder: 5,
    description: '计算药剂投加量',
    formula: `${formatNumber(requiredChlorineG)} g ÷ ${formatNumber(concentrationDecimal, 4)} = ${formatNumber(rawDoseG)} g`,
    result: `${formatNumber(rawDoseG)} 克药剂`,
  });

  const { dose, unit } = convertDoseToBestUnit(rawDoseG, chemical.type);

  steps.push({
    stepOrder: 6,
    description: '选择合适的计量单位',
    formula: `${formatNumber(rawDoseG)} g → ${formatNumber(dose)} ${unit === 'kg' ? 'kg' : 'g'}`,
    result: `建议投加: ${formatNumber(dose)} ${unit === 'kg' ? '千克' : '克'}`,
  });

  if (params.dosingMethod === 'diluted') {
    steps.push({
      stepOrder: 7,
      description: '稀释投加建议',
      formula: `将 ${formatNumber(dose)} ${unit === 'kg' ? 'kg' : 'g'} 药剂溶解于适量清水后均匀泼洒`,
      result: '稀释后均匀投加，效果更佳',
    });
  } else if (params.dosingMethod === 'feeder') {
    steps.push({
      stepOrder: 7,
      description: '投药器投加建议',
      formula: `将 ${formatNumber(dose)} ${unit === 'kg' ? 'kg' : 'g'} 药剂加入投药器，按正常流速投加`,
      result: '通过投药器自动投加',
    });
  }

  return {
    dose,
    doseUnit: unit,
    steps,
    warnings,
    hasBoundaryViolation: hasDangerWarning(warnings),
    violationReason: getBoundaryViolationReason(warnings),
  };
}
