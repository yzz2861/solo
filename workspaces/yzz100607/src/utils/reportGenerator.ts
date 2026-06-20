import type {
  DrainageInput,
  DrainageResult,
  CalculationRecord,
  ContractorReportData,
  OwnerReportData,
  AdjustmentSuggestion,
  CalculationStep,
  DisclosureFormData,
} from '@/types';
import { toMeters } from './unitConversion';

export function generateCalculationSteps(
  input: DrainageInput,
  result: DrainageResult
): CalculationStep[] {
  const lengthM = toMeters(input.length, input.lengthUnit);
  const widthM = toMeters(input.width, input.widthUnit);

  return [
    {
      step: 1,
      title: '计算汇水面积',
      formula: 'S = 长度 × 宽度',
      values: `${lengthM.toFixed(2)} m × ${widthM.toFixed(2)} m`,
      result: `${result.areaM2.toFixed(2)} m²`,
    },
    {
      step: 2,
      title: '换算设计雨强',
      formula: 'i = 雨强（mm/min）',
      values: `${input.rainfallIntensity} ${input.rainfallUnit}`,
      result: `${result.rainfallMmMin.toFixed(3)} mm/min`,
    },
    {
      step: 3,
      title: '计算雨水量',
      formula: 'Q_雨 = i × S × 径流系数 / 60',
      values: `${result.rainfallMmMin.toFixed(3)} × ${result.areaM2.toFixed(2)} × 0.9 / 60`,
      result: `${result.rainwaterVolume.toFixed(3)} L/s`,
    },
    {
      step: 4,
      title: '单口排水能力',
      formula: 'Q_单口 = f(口径)',
      values: `口径 ${input.drainDiameter} mm`,
      result: `${result.singleDrainCapacity.toFixed(2)} L/s`,
    },
    {
      step: 5,
      title: '总排水能力',
      formula: 'Q_排 = Q_单口 × 数量 × 遮挡系数',
      values: `${result.singleDrainCapacity.toFixed(2)} × ${input.drainCount} × ${input.drainBlocked ? '0.5' : '1.0'}`,
      result: `${result.drainCapacity.toFixed(3)} L/s`,
    },
    {
      step: 6,
      title: '积水系数',
      formula: 'K = Q_雨 / Q_排',
      values: `${result.rainwaterVolume.toFixed(3)} / ${result.drainCapacity.toFixed(3)}`,
      result: `${result.积水系数.toFixed(3)}`,
    },
  ];
}

export function generateAdjustmentSuggestions(
  input: DrainageInput,
  result: DrainageResult
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];

  if (result.slopeStatus === 'zero') {
    suggestions.push({
      priority: 'high',
      title: '坡度调整',
      description: '当前坡度为0，雨水无法自流排放',
      details: `必须设置不小于3‰的排水坡度。建议坡度：5‰。沿长边方向找坡，坡向排水口位置。坡高 = 长度 × 坡度 = ${toMeters(input.length, input.lengthUnit).toFixed(2)}m × 5‰ = ${(toMeters(input.length, input.lengthUnit) * 0.005 * 1000).toFixed(0)}mm`,
    });
  } else if (result.slopeStatus === 'poor') {
    suggestions.push({
      priority: 'high',
      title: '坡度优化',
      description: `当前坡度${input.slope}‰小于推荐最小值3‰`,
      details: `建议将坡度调整至3‰~5‰。调整后坡高增加：长度 × (目标坡度 - 当前坡度)。如调整至5‰，坡高为 ${(toMeters(input.length, input.lengthUnit) * 0.005 * 1000).toFixed(0)}mm`,
    });
  }

  if (input.drainBlocked) {
    suggestions.push({
      priority: 'high',
      title: '清理排水口',
      description: '排水口被遮挡，排水能力降低50%',
      details: '立即清理排水口遮挡物，恢复排水口通畅。如无法清理，需增设同等口径排水口。',
    });
  }

  if (result.riskLevel === 'danger') {
    const requiredCapacity = result.rainwaterVolume / 0.8;
    const currentCapacity = result.drainCapacity;
    const additionalCapacity = requiredCapacity - currentCapacity;
    const additionalDrains = Math.ceil(additionalCapacity / result.singleDrainCapacity);

    suggestions.push({
      priority: 'high',
      title: '增设排水口',
      description: `排水能力不足，积水系数${result.积水系数.toFixed(2)} > 1.0`,
      details: `需要增加排水能力 ${additionalCapacity.toFixed(2)} L/s。建议增设 ${additionalDrains} 个 ${input.drainDiameter}mm 口径排水口，或更换为更大口径排水口。排水口应均匀布置在雨棚边缘最低处。`,
    });

    if (input.drainDiameter < 150) {
      suggestions.push({
        priority: 'high',
        title: '增大排水口径',
        description: `当前口径${input.drainDiameter}mm偏小`,
        details: `建议将排水口口径增大至150mm以上。150mm口径单口排水能力4.5L/s，比${input.drainDiameter}mm提高${((4.5 / result.singleDrainCapacity - 1) * 100).toFixed(0)}%。`,
      });
    }
  } else if (result.riskLevel === 'warning') {
    suggestions.push({
      priority: 'medium',
      title: '排水能力裕量不足',
      description: `积水系数${result.积水系数.toFixed(2)}处于临界区间(0.8~1.0)`,
      details: '建议适当增加排水口数量或增大口径，预留15%以上的排水裕量。可考虑增设1个备用排水口。',
    });
  }

  if (input.drainPositions.length === 0) {
    suggestions.push({
      priority: 'medium',
      title: '排水口位置优化',
      description: '未设置排水口位置信息',
      details: '排水口应设置在雨棚的最低处，沿坡向的下方边缘。长边超过6m时应在两端均设置排水口。避免在人员出入口上方设置排水口。',
    });
  }

  if (input.slope >= 3) {
    suggestions.push({
      priority: 'low',
      title: '坡向确认',
      description: '坡度符合要求',
      details: `当前坡度${input.slope}‰符合规范要求。请确认坡向朝向排水口，避免出现反坡或积水区域。`,
    });
  }

  return suggestions;
}

export function generateContractorReport(
  input: DrainageInput,
  result: DrainageResult
): ContractorReportData {
  const steps = generateCalculationSteps(input, result);
  const suggestions = generateAdjustmentSuggestions(input, result);

  let summary = '';
  if (result.riskLevel === 'safe') {
    summary = `排水系统设计合格。积水系数${result.积水系数.toFixed(2)} < 0.8，在设计雨强下无积水风险。坡度${input.slope}‰${result.slopeStatus === 'excellent' ? '优秀' : '符合要求'}。`;
  } else if (result.riskLevel === 'warning') {
    summary = `排水系统处于临界状态。积水系数${result.积水系数.toFixed(2)}在0.8~1.0之间，建议优化排水能力。${result.slopeStatus === 'poor' ? '坡度偏小，建议调整。' : ''}`;
  } else {
    summary = `排水系统存在积水风险！积水系数${result.积水系数.toFixed(2)} > 1.0，必须采取整改措施。${result.slopeStatus === 'zero' ? '坡度为零是主要问题，必须立即整改。' : result.slopeStatus === 'poor' ? '坡度偏小，建议调整至3‰以上。' : ''}${input.drainBlocked ? '排水口被遮挡，需清理。' : ''}`;
  }

  return {
    calculationSteps: steps,
    suggestions,
    summary,
  };
}

export function generateOwnerReport(
  input: DrainageInput,
  result: DrainageResult,
  recordId: string
): OwnerReportData {
  let riskDescription = '';
  let summary = '';

  if (result.riskLevel === 'safe') {
    riskDescription = '在设计降雨条件下，雨棚排水系统运行正常，无积水风险。';
    summary = '雨棚排水系统评估结果：安全 ✓';
  } else if (result.riskLevel === 'warning') {
    riskDescription = '排水能力接近临界值，在强降雨时可能出现积水。建议施工单位采取优化措施。';
    summary = '雨棚排水系统评估结果：存在一定积水风险 ⚠';
  } else {
    riskDescription = '排水能力不足，在设计降雨条件下将出现积水。施工单位必须进行整改。';
    summary = '雨棚排水系统评估结果：存在积水风险 ✗';
  }

  return {
    riskLevel: result.riskLevel,
    riskDescription,
    summary,
    recordId,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
}

export function generateDisclosureForm(
  record: CalculationRecord,
  projectName: string
): DisclosureFormData {
  return {
    recordId: record.id,
    projectName,
    rainfallIntensity: record.rainfallIntensity,
    rainfallUnit: record.rainfallUnit,
    drainDiameter: record.drainDiameter,
    slope: record.slope,
    length: record.length,
    lengthUnit: record.lengthUnit,
    width: record.width,
    widthUnit: record.widthUnit,
    drainCount: record.drainCount,
    result: record.result,
    createdAt: record.createdAt,
  };
}
