import type { WeightUnit } from '@/types';

export const tonToKg = (ton: number): number => ton * 1000;
export const kgToTon = (kg: number): number => kg / 1000;

export const toTon = (value: number, unit: WeightUnit): number =>
  unit === 'ton' ? value : kgToTon(value);

export const toKg = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? value : tonToKg(value);

export const formatWeight = (value: number, unit: WeightUnit, decimals = 2): string => {
  const v = Number(value.toFixed(decimals));
  return `${v} ${unit === 'ton' ? '吨' : '公斤'}`;
};

export const formatDistance = (meters: number, decimals = 2): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(decimals)} km`;
  return `${Number(meters.toFixed(decimals))} m`;
};

export const formatAngle = (deg: number, decimals = 1): string => {
  return `${Number(deg.toFixed(decimals))}°`;
};
