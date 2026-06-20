import type { DrainageInput, DrainageResult, SlopeStatus, RiskLevel } from '@/types';
import { toMeters, toMmPerMin } from './unitConversion';

const DRAIN_CAPACITY_TABLE: Record<number, number> = {
  75: 1.0,
  100: 2.0,
  125: 3.2,
  150: 4.5,
  200: 8.0,
  250: 12.5,
  300: 18.0,
};

export function getSingleDrainCapacity(diameterMm: number): number {
  const diameters = Object.keys(DRAIN_CAPACITY_TABLE)
    .map(Number)
    .sort((a, b) => a - b);

  if (diameterMm <= diameters[0]) return DRAIN_CAPACITY_TABLE[diameters[0]];
  if (diameterMm >= diameters[diameters.length - 1]) {
    return DRAIN_CAPACITY_TABLE[diameters[diameters.length - 1]];
  }

  for (let i = 0; i < diameters.length - 1; i++) {
    if (diameterMm >= diameters[i] && diameterMm <= diameters[i + 1]) {
      const ratio = (diameterMm - diameters[i]) / (diameters[i + 1] - diameters[i]);
      return (
        DRAIN_CAPACITY_TABLE[diameters[i]] +
        ratio * (DRAIN_CAPACITY_TABLE[diameters[i + 1]] - DRAIN_CAPACITY_TABLE[diameters[i]])
      );
    }
  }

  return 2.0;
}

export function calculateArea(input: DrainageInput): number {
  const lengthM = toMeters(input.length, input.lengthUnit);
  const widthM = toMeters(input.width, input.widthUnit);
  return lengthM * widthM;
}

export function calculateRainwater(
  rainfallMmMin: number,
  areaM2: number,
  runoffCoefficient = 0.9
): number {
  return (rainfallMmMin * areaM2 * runoffCoefficient) / 60;
}

export function calculateDrainCapacity(
  drainCount: number,
  drainDiameter: number,
  blocked: boolean
): number {
  const singleCapacity = getSingleDrainCapacity(drainDiameter);
  const blockFactor = blocked ? 0.5 : 1.0;
  return singleCapacity * drainCount * blockFactor;
}

export function assessRisk(
  rainwater: number,
  drainCapacity: number
): { 积水系数: number; riskLevel: RiskLevel } {
  if (drainCapacity <= 0) {
    return { 积水系数: Infinity, riskLevel: 'danger' };
  }

  const 积水系数 = rainwater / drainCapacity;
  let riskLevel: RiskLevel;

  if (积水系数 < 0.8) {
    riskLevel = 'safe';
  } else if (积水系数 < 1.0) {
    riskLevel = 'warning';
  } else {
    riskLevel = 'danger';
  }

  return { 积水系数, riskLevel };
}

export function assessSlope(slope: number): SlopeStatus {
  if (slope <= 0) return 'zero';
  if (slope >= 5) return 'excellent';
  if (slope >= 3) return 'good';
  return 'poor';
}

export function calculateDrainage(input: DrainageInput): DrainageResult {
  const areaM2 = calculateArea(input);
  const rainfallMmMin = toMmPerMin(input.rainfallIntensity, input.rainfallUnit);
  const rainwaterVolume = calculateRainwater(rainfallMmMin, areaM2);
  const singleDrainCapacity = getSingleDrainCapacity(input.drainDiameter);
  const drainCapacity = calculateDrainCapacity(
    input.drainCount,
    input.drainDiameter,
    input.drainBlocked
  );
  const { 积水系数, riskLevel } = assessRisk(rainwaterVolume, drainCapacity);
  const slopeStatus = assessSlope(input.slope);

  return {
    rainwaterVolume,
    drainCapacity,
    积水系数,
    riskLevel,
    slopeStatus,
    warnings: [],
    areaM2,
    rainfallMmMin,
    singleDrainCapacity,
  };
}
