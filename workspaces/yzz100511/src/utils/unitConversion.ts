import type { WeightUnit, AreaUnit } from '../types';

export const convertWeightToKg = (weight: number, unit: WeightUnit): number => {
  if (unit === 'ton') {
    return weight * 1000;
  }
  return weight;
};

export const convertWeightFromKg = (weightKg: number, targetUnit: WeightUnit): number => {
  if (targetUnit === 'ton') {
    return weightKg / 1000;
  }
  return weightKg;
};

export const convertAreaToM2 = (area: number, unit: AreaUnit): number => {
  if (unit === 'ft2') {
    return area * 0.092903;
  }
  return area;
};

export const convertAreaFromM2 = (areaM2: number, targetUnit: AreaUnit): number => {
  if (targetUnit === 'ft2') {
    return areaM2 / 0.092903;
  }
  return areaM2;
};

export const calculatePressure = (weightKg: number): number => {
  return (weightKg * 9.8) / 1000;
};

export const calculateLoadPerM2 = (weight: number, weightUnit: WeightUnit, area: number, areaUnit: AreaUnit): number => {
  const weightKg = convertWeightToKg(weight, weightUnit);
  const areaM2 = convertAreaToM2(area, areaUnit);
  if (areaM2 <= 0) return Infinity;
  const pressure = calculatePressure(weightKg);
  return pressure / areaM2;
};

export const formatWeight = (weight: number, unit: WeightUnit): string => {
  return `${weight} ${unit === 'ton' ? '吨' : '千克'}`;
};

export const formatArea = (area: number, unit: AreaUnit): string => {
  return `${area} ${unit === 'ft2' ? '平方英尺' : '平方米'}`;
};

export const formatLoad = (load: number): string => {
  return `${load.toFixed(2)} kN/m²`;
};
