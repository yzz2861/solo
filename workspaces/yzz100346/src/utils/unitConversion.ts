import type { WeightUnit } from '../types/devices';

export const normalizeWeightToKg = (weight: number, unit: WeightUnit): number => {
  if (unit === '公斤' || unit === 'kg') {
    return weight;
  }
  return weight;
};

export const formatWeight = (weight: number, unit: WeightUnit): string => {
  if (unit === '') {
    return '--';
  }
  return `${weight} ${unit}`;
};

export const parseWeightInput = (value: string): { weight: number; unit: WeightUnit } => {
  const trimmed = value.trim();
  
  if (trimmed === '') {
    return { weight: 0, unit: '' };
  }
  
  const kgMatch = trimmed.match(/^([\d.]+)\s*(kg|公斤)?$/i);
  if (kgMatch) {
    const weight = parseFloat(kgMatch[1]);
    const unit = (kgMatch[2]?.toLowerCase() || 'kg') as WeightUnit;
    const normalizedUnit = unit === '公斤' ? '公斤' : 'kg';
    return { weight, unit: normalizedUnit };
  }
  
  return { weight: 0, unit: '' };
};

export const isValidWeightValue = (weight: number, unit: WeightUnit): boolean => {
  if (unit === '') return false;
  return !isNaN(weight) && weight > 0;
};

export const convertToDisplayUnit = (weightInKg: number, targetUnit: WeightUnit): number => {
  return weightInKg;
};

export const getWeightUnitOptions = (): { value: WeightUnit; label: string }[] => {
  return [
    { value: 'kg', label: 'kg' },
    { value: '公斤', label: '公斤' },
  ];
};

export const formatWeightDisplay = (weight: number, unit: WeightUnit): string => {
  if (unit === '') {
    return '未填写';
  }
  return `${weight} ${unit}`;
};
