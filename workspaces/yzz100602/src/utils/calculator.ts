import type { DryingParams, DryingResult } from '@/types';

const BASE_HEATING_POWER = 15;
const FAN_POWER = 2.5;
const MAX_TEMP = 120;

export function calculateDrying(params: DryingParams): DryingResult {
  const { weight, initialMoisture, targetMoisture, temperature, airFlow, ambientHumidity } = params;

  const dryMatterWeight = weight * (1 - initialMoisture / 100);

  const finalWeight = dryMatterWeight / (1 - targetMoisture / 100);

  const waterToRemove = weight - finalWeight;

  const tempFactor = Math.min(temperature / 60, 2);

  const airflowFactor = airFlow > 0 ? Math.min(airFlow / 1000, 1.5) : 0.3;

  const humidityFactor = Math.max(1 - (ambientHumidity - 50) / 100, 0.3);

  const baseRate = 8;

  const hourlyDehumidification = baseRate * tempFactor * airflowFactor * humidityFactor;

  const estimatedTime = hourlyDehumidification > 0 ? waterToRemove / hourlyDehumidification : 0;

  const powerPerHour = BASE_HEATING_POWER * (temperature / 60) + FAN_POWER;
  const energyConsumption = estimatedTime * powerPerHour;

  return {
    waterToRemove: Math.max(0, round2(waterToRemove)),
    estimatedTime: round2(estimatedTime),
    energyConsumption: round2(energyConsumption),
    hourlyDehumidification: round2(hourlyDehumidification),
    dryMatterWeight: round2(dryMatterWeight),
    finalWeight: round2(finalWeight),
  };
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

export function getOperationSuggestions(params: DryingParams, result: DryingResult): string[] {
  const suggestions: string[] = [];

  if (params.ambientHumidity > 70) {
    suggestions.push('环境湿度较高，建议提前开机预热烘房，并增加10-20%的烘干时间');
  }

  if (params.temperature > 80) {
    suggestions.push('温度较高，注意观察物料状态，防止表层过硬影响内部排湿');
  }

  if (params.temperature < 50) {
    suggestions.push('温度偏低，烘干时间会较长，可适当提高温度加快排湿');
  }

  if (!params.airFlow || params.airFlow < 200) {
    suggestions.push('风量不足，建议增大排风量或增加排湿口，否则烘干时间会明显延长');
  }

  if (result.estimatedTime > 12) {
    suggestions.push('烘干时间超过12小时，建议分两班作业，中间可适当翻动物料');
  }

  if (params.initialMoisture > 70) {
    suggestions.push('初始水分较高，前期可高温大风量快速排湿，后期降温定型');
  }

  if (params.targetMoisture < 10) {
    suggestions.push('目标水分较低，后期需降低温度慢烘，防止外干内湿');
  }

  if (suggestions.length === 0) {
    suggestions.push('参数合理，按常规工艺操作即可，中间检查1-2次');
  }

  return suggestions;
}

export function getEnergyCost(energyKwh: number, pricePerKwh: number = 0.8): number {
  return round2(energyKwh * pricePerKwh);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const constants = {
  BASE_HEATING_POWER,
  FAN_POWER,
  MAX_TEMP,
};
