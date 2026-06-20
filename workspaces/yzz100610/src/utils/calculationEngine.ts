import {
  CalculationInput,
  CalculationResult,
  SafetyLevel,
  Warning,
  PALLET_FACTORS,
  HUMIDITY_FACTORS,
  SAFETY_THRESHOLDS,
  MAX_RECOMMENDED_LAYERS,
} from '@/types/calculation';

const KG_TO_KGF = 1 / 9.80665;
const N_TO_KGF = 1 / 9.80665;

export function convertToKgf(value: number, unit: 'kgf' | 'N' | 'kg'): number {
  switch (unit) {
    case 'kgf':
      return value;
    case 'N':
      return value * N_TO_KGF;
    case 'kg':
      return value;
    default:
      return value;
  }
}

export function convertFromKgf(value: number, unit: 'kgf' | 'N' | 'kg'): number {
  switch (unit) {
    case 'kgf':
      return value;
    case 'N':
      return value / N_TO_KGF;
    case 'kg':
      return value;
    default:
      return value;
  }
}

export function getTransportFactor(days: number): number {
  if (days <= 3) return 1.0;
  if (days <= 7) return 0.95;
  if (days <= 15) return 0.9;
  return 0.85;
}

export function getSafetyLevel(factor: number): SafetyLevel {
  if (factor >= SAFETY_THRESHOLDS.excellent) return 'excellent';
  if (factor >= SAFETY_THRESHOLDS.good) return 'good';
  if (factor >= SAFETY_THRESHOLDS.pass) return 'pass';
  if (factor >= SAFETY_THRESHOLDS.critical) return 'critical';
  return 'fail';
}

export function generateWarnings(input: CalculationInput, result: CalculationResult): Warning[] {
  const warnings: Warning[] = [];

  if (input.compressionUnit === 'N') {
    warnings.push({
      type: 'info',
      code: 'unit_newton',
      message: '抗压值单位为牛(N)，已自动换算为kgf进行计算。1 kgf ≈ 9.81 N',
    });
  }

  if (input.compressionUnit === 'kg') {
    warnings.push({
      type: 'info',
      code: 'unit_kg',
      message: '抗压值单位为公斤(kg)，按kgf等价计算。注意：公斤(质量)与kgf(力)在数值上相等。',
    });
  }

  if (input.stackLayers > MAX_RECOMMENDED_LAYERS) {
    warnings.push({
      type: 'warning',
      code: 'layers_too_high',
      message: `堆码层数(${input.stackLayers}层)超过建议最大值(${MAX_RECOMMENDED_LAYERS}层)，高层堆码存在稳定性风险。`,
    });
  }

  if (result.bottomLoadRatio >= 0.9) {
    warnings.push({
      type: 'error',
      code: 'bottom_overload',
      message: `底层纸箱受力已达有效抗压值的${(result.bottomLoadRatio * 100).toFixed(1)}%，严重超限！`,
    });
  } else if (result.bottomLoadRatio >= 0.7) {
    warnings.push({
      type: 'warning',
      code: 'bottom_high_load',
      message: `底层纸箱受力占有效抗压值的${(result.bottomLoadRatio * 100).toFixed(1)}%，安全余量不足。`,
    });
  }

  if (input.humidityCondition === 'high') {
    warnings.push({
      type: 'warning',
      code: 'high_humidity',
      message: '高湿环境下纸箱抗压强度下降明显，建议使用防水纸箱或增加包装防护。',
    });
  }

  if (input.transportDays > 15) {
    warnings.push({
      type: 'warning',
      code: 'long_transport',
      message: `运输时间较长(${input.transportDays}天)，纸箱长期吸湿会进一步降低抗压强度。`,
    });
  }

  if (input.palletType === 'none') {
    warnings.push({
      type: 'info',
      code: 'no_pallet',
      message: '无托盘直接堆码时，底层纸箱受力不均匀，实际安全系数可能低于计算值。',
    });
  }

  return warnings;
}

export function generateSuggestions(input: CalculationInput, result: CalculationResult): string[] {
  const suggestions: string[] = [];

  if (result.safetyLevel === 'fail') {
    suggestions.push('安全系数严重不足，存在塌箱风险，必须更换更坚固的纸箱规格。');
    suggestions.push(`建议选用抗压值不低于 ${(result.bottomLoad * SAFETY_THRESHOLDS.pass).toFixed(1)} kgf 的纸箱。`);
  } else if (result.safetyLevel === 'critical') {
    suggestions.push('安全系数处于临界状态，建议谨慎使用或升级纸箱规格。');
    suggestions.push('如必须使用当前箱规，请减少堆码层数或改善仓储环境。');
  } else if (result.safetyLevel === 'pass') {
    suggestions.push('安全系数基本合格，建议保留一定余量以应对意外情况。');
  } else if (result.safetyLevel === 'excellent') {
    suggestions.push('安全储备非常充足，可考虑降低纸箱规格以控制成本。');
  }

  if (input.humidityCondition === 'humid' || input.humidityCondition === 'high') {
    suggestions.push('潮湿环境下建议使用防潮纸箱或添加防水膜包装。');
  }

  if (input.transportDays > 7) {
    suggestions.push('长途运输建议增加纸箱防护，避免堆叠过高。');
  }

  if (input.palletType !== 'wood') {
    suggestions.push('使用木托盘(满铺)可获得最佳的堆码支撑效果。');
  }

  if (result.maxSafeLayers < input.stackLayers) {
    suggestions.push(`按当前条件，建议堆码不超过 ${result.maxSafeLayers} 层。`);
  }

  return suggestions;
}

export function calculateMaxLayers(
  boxWeight: number,
  effectiveCompression: number,
  safetyThreshold: number
): number {
  if (boxWeight <= 0) return 1;
  const maxLayers = Math.floor((effectiveCompression / safetyThreshold) / boxWeight) + 1;
  return Math.max(1, maxLayers);
}

export function calculateStack(input: CalculationInput): CalculationResult {
  const { boxWeight, boxCompression, compressionUnit, stackLayers, palletType, humidityCondition, transportDays } = input;

  const compressionKgf = convertToKgf(boxCompression, compressionUnit);

  const palletFactor = PALLET_FACTORS[palletType];
  const humidityFactor = HUMIDITY_FACTORS[humidityCondition];
  const transportFactor = getTransportFactor(transportDays);

  const effectiveCompression = compressionKgf * palletFactor * humidityFactor * transportFactor;

  const bottomLoad = boxWeight * (stackLayers - 1);

  const safetyFactor = bottomLoad > 0 ? effectiveCompression / bottomLoad : 999;

  const safetyLevel = getSafetyLevel(safetyFactor);

  const bottomLoadRatio = bottomLoad / effectiveCompression;

  const maxSafeLayers = calculateMaxLayers(boxWeight, effectiveCompression, SAFETY_THRESHOLDS.good);
  const maxSafeLayersMin = calculateMaxLayers(boxWeight, effectiveCompression, SAFETY_THRESHOLDS.pass);

  const result: CalculationResult = {
    safetyFactor,
    safetyLevel,
    bottomLoad,
    bottomLoadRatio,
    effectiveCompression,
    maxSafeLayers,
    maxSafeLayersMin,
    humidityFactor,
    palletFactor,
    transportFactor,
    warnings: [],
    suggestions: [],
  };

  result.warnings = generateWarnings(input, result);
  result.suggestions = generateSuggestions(input, result);

  return result;
}

export function getHumidityAvoidanceInfo(boxWeight: number, compressionKgf: number): string[] {
  const info: string[] = [];
  
  const dryMax = calculateMaxLayers(boxWeight, compressionKgf * HUMIDITY_FACTORS.dry, SAFETY_THRESHOLDS.good);
  const normalMax = calculateMaxLayers(boxWeight, compressionKgf * HUMIDITY_FACTORS.normal, SAFETY_THRESHOLDS.good);
  const humidMax = calculateMaxLayers(boxWeight, compressionKgf * HUMIDITY_FACTORS.humid, SAFETY_THRESHOLDS.good);
  const highMax = calculateMaxLayers(boxWeight, compressionKgf * HUMIDITY_FACTORS.high, SAFETY_THRESHOLDS.good);

  if (dryMax > normalMax) {
    info.push(`干燥环境最多可堆 ${dryMax} 层，正常湿度下降为 ${normalMax} 层`);
  }
  if (humidMax < normalMax) {
    info.push(`⚠️ 潮湿天气(75-85%RH)时，堆码层数需降至 ${humidMax} 层`);
  }
  if (highMax < humidMax) {
    info.push(`🚫 高湿环境(>85%RH)必须避开，最多只能堆 ${highMax} 层`);
  }

  return info;
}
