import type { WeightUnit, LengthUnit } from '@/types';

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  const inKg = from === 'ton' ? value * 1000 : value;
  return to === 'ton' ? inKg / 1000 : inKg;
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value;
  const inMm = from === 'm' ? value * 1000 : from === 'cm' ? value * 10 : value;
  if (to === 'm') return inMm / 1000;
  if (to === 'cm') return inMm / 10;
  return inMm;
}

export function formatWeight(kg: number, unit: WeightUnit = 'kg', decimals = 1): string {
  const value = unit === 'ton' ? kg / 1000 : kg;
  return `${value.toFixed(decimals)} ${unit === 'ton' ? '吨' : 'kg'}`;
}

export function formatLength(mm: number, unit: LengthUnit = 'mm', decimals = 0): string {
  let value: number;
  let label: string;
  if (unit === 'm') {
    value = mm / 1000;
    label = 'm';
  } else if (unit === 'cm') {
    value = mm / 10;
    label = 'cm';
  } else {
    value = mm;
    label = 'mm';
  }
  return `${value.toFixed(decimals)} ${label}`;
}
