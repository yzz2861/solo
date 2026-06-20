import type { LengthUnit, RainfallUnit } from '@/types';

export function toMeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm': return value / 1000;
    case 'cm': return value / 100;
    case 'm': return value;
  }
}

export function toMmPerMin(value: number, unit: RainfallUnit): number {
  return unit === 'mm/h' ? value / 60 : value;
}

export function formatLength(value: number, fromUnit: LengthUnit, toUnit: LengthUnit): number {
  const meters = toMeters(value, fromUnit);
  switch (toUnit) {
    case 'mm': return meters * 1000;
    case 'cm': return meters * 100;
    case 'm': return meters;
  }
}
