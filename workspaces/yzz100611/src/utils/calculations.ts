import type { CalculationInput, CalculationResult, Warning, CalculationStep, ActionType } from '@/types';
import { ecToMs, volumeToL, formatNumber, convertVolume, convertEc } from './unitConverter';

function validateInput(input: CalculationInput): Warning[] {
  const warnings: Warning[] = [];

  if (input.currentEc <= 0 || input.targetEc <= 0 || input.tankVolume <= 0 || input.stockEc <= 0) {
    warnings.push({
      type: 'input_invalid',
      message: '请输入有效的数值，所有数值必须大于0',
    });
    return warnings;
  }

  const currentEcMs = ecToMs(input.currentEc, input.currentEcUnit);
  const targetEcMs = ecToMs(input.targetEc, input.targetEcUnit);
  const stockEcMs = ecToMs(input.stockEc, input.stockEcUnit);
  const tankVolumeL = volumeToL(input.tankVolume, input.tankVolumeUnit);
  const waterVolumeL = volumeToL(input.waterVolume, input.waterVolumeUnit);

  if (targetEcMs < currentEcMs) {
    warnings.push({
      type: 'target_lower',
      message: '目标EC低于当前EC，需要加清水稀释',
    });
  }

  if (targetEcMs > currentEcMs && stockEcMs <= targetEcMs) {
    warnings.push({
      type: 'stock_insufficient',
      message: '母液浓度不足，母液EC必须高于目标EC才能提高浓度',
    });
  }

  const totalVolume = tankVolumeL + waterVolumeL;

  if (targetEcMs > currentEcMs && stockEcMs > targetEcMs) {
    const stockNeeded = ((targetEcMs - currentEcMs) * totalVolume) / (stockEcMs - targetEcMs);
    if (stockNeeded > totalVolume * 2) {
      warnings.push({
        type: 'tank_insufficient',
        message: '所需母液量过大，请检查参数是否正确',
      });
    }
  }

  if (targetEcMs < currentEcMs) {
    const waterNeeded = ((currentEcMs - targetEcMs) * totalVolume) / targetEcMs;
    if (waterNeeded > totalVolume * 5) {
      warnings.push({
        type: 'tank_insufficient',
        message: '所需清水量过大，请检查参数是否正确',
      });
    }
  }

  return warnings;
}

function buildCalculationSteps(
  input: CalculationInput,
  stockAmountL: number,
  waterAmountL: number,
  actionType: ActionType,
  finalEcMs: number,
): CalculationStep[] {
  const steps: CalculationStep[] = [];

  const currentEcMs = ecToMs(input.currentEc, input.currentEcUnit);
  const targetEcMs = ecToMs(input.targetEc, input.targetEcUnit);
  const stockEcMs = ecToMs(input.stockEc, input.stockEcUnit);
  const tankVolumeL = volumeToL(input.tankVolume, input.tankVolumeUnit);
  const waterVolumeL = volumeToL(input.waterVolume, input.waterVolumeUnit);
  const totalVolumeL = tankVolumeL + waterVolumeL;

  steps.push({
    description: '步骤1：统一单位为 mS/cm 和 升(L)',
    formula: `当前EC: ${input.currentEc} ${input.currentEcUnit} = ${formatNumber(currentEcMs)} mS/cm\n目标EC: ${input.targetEc} ${input.targetEcUnit} = ${formatNumber(targetEcMs)} mS/cm\n母液EC: ${input.stockEc} ${input.stockEcUnit} = ${formatNumber(stockEcMs)} mS/cm\n水箱体积: ${input.tankVolume} ${input.tankVolumeUnit} = ${formatNumber(tankVolumeL)} L\n补水量: ${input.waterVolume} ${input.waterVolumeUnit} = ${formatNumber(waterVolumeL)} L`,
    result: `现有溶液总量: ${formatNumber(totalVolumeL)} L`,
  });

  if (actionType === 'add_stock') {
    steps.push({
      description: '步骤2：计算需要添加的母液量',
      formula: `V母液 = (EC目标 - EC当前) × V总液 / (EC母液 - EC目标)\nV母液 = (${formatNumber(targetEcMs)} - ${formatNumber(currentEcMs)}) × ${formatNumber(totalVolumeL)} / (${formatNumber(stockEcMs)} - ${formatNumber(targetEcMs)})`,
      result: `需加母液: ${formatNumber(stockAmountL)} L (${formatNumber(stockAmountL * 1000)} mL)`,
    });

    steps.push({
      description: '步骤3：验证最终EC值',
      formula: `EC最终 = (EC当前 × V总液 + EC母液 × V母液) / (V总液 + V母液)\nEC最终 = (${formatNumber(currentEcMs)} × ${formatNumber(totalVolumeL)} + ${formatNumber(stockEcMs)} × ${formatNumber(stockAmountL)}) / (${formatNumber(totalVolumeL)} + ${formatNumber(stockAmountL)})`,
      result: `最终EC: ${formatNumber(finalEcMs)} mS/cm`,
    });
  } else if (actionType === 'add_water') {
    steps.push({
      description: '步骤2：计算需要添加的清水量',
      formula: `V清水 = (EC当前 - EC目标) × V总液 / EC目标\nV清水 = (${formatNumber(currentEcMs)} - ${formatNumber(targetEcMs)}) × ${formatNumber(totalVolumeL)} / ${formatNumber(targetEcMs)}`,
      result: `需加清水: ${formatNumber(waterAmountL)} L (${formatNumber(waterAmountL * 1000)} mL)`,
    });

    steps.push({
      description: '步骤3：验证最终EC值',
      formula: `EC最终 = EC当前 × V总液 / (V总液 + V清水)\nEC最终 = ${formatNumber(currentEcMs)} × ${formatNumber(totalVolumeL)} / (${formatNumber(totalVolumeL)} + ${formatNumber(waterAmountL)})`,
      result: `最终EC: ${formatNumber(finalEcMs)} mS/cm`,
    });
  } else {
    steps.push({
      description: '步骤2：无需调整',
      formula: '当前EC已等于目标EC',
      result: '无需添加母液或清水',
    });
  }

  return steps;
}

export function calculateEcDilution(input: CalculationInput): CalculationResult {
  const warnings = validateInput(input);

  const hasInvalidInput = warnings.some((w) => w.type === 'input_invalid');
  if (hasInvalidInput) {
    return {
      stockAmount: 0,
      stockAmountUnit: 'L',
      waterAmount: 0,
      waterAmountUnit: 'L',
      actionType: 'no_action',
      warnings,
      calculationSteps: [],
      finalEc: input.currentEc,
      finalEcUnit: input.currentEcUnit,
    };
  }

  const currentEcMs = ecToMs(input.currentEc, input.currentEcUnit);
  const targetEcMs = ecToMs(input.targetEc, input.targetEcUnit);
  const stockEcMs = ecToMs(input.stockEc, input.stockEcUnit);
  const tankVolumeL = volumeToL(input.tankVolume, input.tankVolumeUnit);
  const waterVolumeL = volumeToL(input.waterVolume, input.waterVolumeUnit);
  const totalVolumeL = tankVolumeL + waterVolumeL;

  let stockAmountL = 0;
  let waterAmountL = 0;
  let actionType: ActionType = 'no_action';
  let finalEcMs = currentEcMs;

  if (Math.abs(targetEcMs - currentEcMs) < 0.001) {
    actionType = 'no_action';
    finalEcMs = currentEcMs;
  } else if (targetEcMs > currentEcMs && stockEcMs > targetEcMs) {
    actionType = 'add_stock';
    stockAmountL = ((targetEcMs - currentEcMs) * totalVolumeL) / (stockEcMs - targetEcMs);
    finalEcMs = (currentEcMs * totalVolumeL + stockEcMs * stockAmountL) / (totalVolumeL + stockAmountL);
  } else if (targetEcMs < currentEcMs) {
    actionType = 'add_water';
    waterAmountL = ((currentEcMs - targetEcMs) * totalVolumeL) / targetEcMs;
    finalEcMs = (currentEcMs * totalVolumeL) / (totalVolumeL + waterAmountL);
  }

  const outputUnit = input.tankVolumeUnit;
  const stockAmount = convertVolume(stockAmountL, 'L', outputUnit);
  const waterAmount = convertVolume(waterAmountL, 'L', outputUnit);
  const finalEc = convertEc(finalEcMs, 'mS/cm', input.targetEcUnit);

  const calculationSteps = buildCalculationSteps(input, stockAmountL, waterAmountL, actionType, finalEcMs);

  return {
    stockAmount,
    stockAmountUnit: outputUnit,
    waterAmount,
    waterAmountUnit: outputUnit,
    actionType,
    warnings,
    calculationSteps,
    finalEc,
    finalEcUnit: input.targetEcUnit,
  };
}

export function getActionLabel(actionType: ActionType): string {
  switch (actionType) {
    case 'add_stock':
      return '添加母液';
    case 'add_water':
      return '添加清水';
    case 'no_action':
      return '无需调整';
    default:
      return '';
  }
}
