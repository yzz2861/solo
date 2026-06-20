import type { ConcentrationUnit, VolumeUnit } from '@/types';

export function concentrationToMolL(value: number, unit: ConcentrationUnit): number {
  return unit === 'mM' ? value / 1000 : value;
}

export function volumeToL(value: number, unit: VolumeUnit): number {
  return unit === 'mL' ? value / 1000 : value;
}

export function volumeToML(value: number, unit: VolumeUnit): number {
  return unit === 'L' ? value * 1000 : value;
}

export function lToML(liters: number): number {
  return liters * 1000;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) < 0.001 && value !== 0) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
}

export function formatVolume(mL: number): string {
  if (mL >= 1000) {
    return `${(mL / 1000).toFixed(3)} L`;
  }
  if (mL < 0.01 && mL > 0) {
    return `${mL.toExponential(2)} mL`;
  }
  return `${mL.toFixed(2)} mL`;
}
