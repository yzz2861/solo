import type { EcUnit, VolumeUnit } from '@/types';

export const EC_UNITS: EcUnit[] = ['mS/cm', 'μS/cm'];
export const VOLUME_UNITS: VolumeUnit[] = ['L', 'mL'];

export function ecToMs(value: number, unit: EcUnit): number {
  if (unit === 'mS/cm') return value;
  return value / 1000;
}

export function ecToUs(value: number, unit: EcUnit): number {
  if (unit === 'μS/cm') return value;
  return value * 1000;
}

export function convertEc(value: number, fromUnit: EcUnit, toUnit: EcUnit): number {
  if (fromUnit === toUnit) return value;
  if (toUnit === 'mS/cm') return ecToMs(value, fromUnit);
  return ecToUs(value, fromUnit);
}

export function volumeToL(value: number, unit: VolumeUnit): number {
  if (unit === 'L') return value;
  return value / 1000;
}

export function volumeToMl(value: number, unit: VolumeUnit): number {
  if (unit === 'mL') return value;
  return value * 1000;
}

export function convertVolume(value: number, fromUnit: VolumeUnit, toUnit: VolumeUnit): number {
  if (fromUnit === toUnit) return value;
  if (toUnit === 'L') return volumeToL(value, fromUnit);
  return volumeToMl(value, fromUnit);
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return Number(value.toFixed(decimals)).toString();
}

export function formatEc(value: number, unit: EcUnit, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}

export function formatVolume(value: number, unit: VolumeUnit, decimals: number = 2): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}
