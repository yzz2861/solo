import type { Unit } from '@/types/scene';

export const unitFactors: Record<Unit, number> = {
  m: 1,
  cm: 100,
  mm: 1000,
};

export const unitLabels: Record<Unit, string> = {
  m: 'm',
  cm: 'cm',
  mm: 'mm',
};

export function convertUnit(value: number, from: Unit, to: Unit): number {
  const meters = value / unitFactors[from];
  return meters * unitFactors[to];
}

export function toMeters(value: number, unit: Unit): number {
  return value / unitFactors[unit];
}

export function fromMeters(value: number, unit: Unit): number {
  return value * unitFactors[unit];
}

export function formatDistance(meters: number, unit: Unit = 'm', decimals: number = 2): string {
  const value = fromMeters(meters, unit);
  return `${value.toFixed(decimals)} ${unitLabels[unit]}`;
}

export function formatAngle(degrees: number, decimals: number = 1): string {
  return `${degrees.toFixed(decimals)}°`;
}
