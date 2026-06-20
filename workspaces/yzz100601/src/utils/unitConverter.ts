import { WeightUnit } from '@/types';

export const toKg = (weight: number, unit: WeightUnit): number => {
  switch (unit) {
    case 'kg':
      return weight;
    case 'jin':
      return weight * 0.5;
    case 'lb':
      return weight * 0.45359237;
    default:
      return weight;
  }
};

export const fromKg = (weight_kg: number, targetUnit: WeightUnit): number => {
  switch (targetUnit) {
    case 'kg':
      return weight_kg;
    case 'jin':
      return weight_kg / 0.5;
    case 'lb':
      return weight_kg / 0.45359237;
    default:
      return weight_kg;
  }
};

export const formatWeight = (weight_kg: number, targetUnit: WeightUnit = 'kg'): string => {
  const value = fromKg(weight_kg, targetUnit);
  const unitLabel = targetUnit === 'kg' ? 'kg' : targetUnit === 'jin' ? '斤' : 'lb';
  return `${value.toFixed(2)} ${unitLabel}`;
};

export const detectMixedUnits = (units: WeightUnit[]): boolean => {
  if (units.length === 0) return false;
  const first = units[0];
  return units.some((u) => u !== first);
};
