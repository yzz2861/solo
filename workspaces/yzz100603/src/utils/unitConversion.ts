import type { ChlorineUnit, ConcentrationUnit, DoseUnit } from '@/types';

export const CHLORINE_NORMAL_MIN = 0.3;
export const CHLORINE_NORMAL_MAX = 5.0;
export const PH_NORMAL_MIN = 7.2;
export const PH_NORMAL_MAX = 7.8;

export function chlorineToMgL(value: number, unit: ChlorineUnit): number {
  if (unit === 'ppm') return value;
  return value;
}

export function concentrationToPercent(value: number, unit: ConcentrationUnit): number {
  switch (unit) {
    case 'percent':
      return value;
    case 'mgL':
    case 'ppm':
      return value / 10000;
    default:
      return value;
  }
}

export function formatChlorineUnit(unit: ChlorineUnit): string {
  return unit === 'mgL' ? 'mg/L' : 'ppm';
}

export function formatConcentrationUnit(unit: ConcentrationUnit): string {
  switch (unit) {
    case 'percent':
      return '%';
    case 'mgL':
      return 'mg/L';
    case 'ppm':
      return 'ppm';
    default:
      return '';
  }
}

export function formatDoseUnit(unit: DoseUnit): string {
  switch (unit) {
    case 'g':
      return '克';
    case 'kg':
      return '千克';
    case 'mL':
      return '毫升';
    case 'L':
      return '升';
    default:
      return '';
  }
}

export function formatDosingMethod(method: string): string {
  switch (method) {
    case 'direct':
      return '直接投加';
    case 'diluted':
      return '稀释后投加';
    case 'feeder':
      return '投药器投加';
    default:
      return method;
  }
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

export function convertDoseToBestUnit(
  dose: number,
  chemicalType: 'tablet' | 'liquid'
): { dose: number; unit: DoseUnit } {
  if (chemicalType === 'tablet') {
    if (dose >= 1000) {
      return { dose: dose / 1000, unit: 'kg' };
    }
    return { dose, unit: 'g' };
  } else {
    if (dose >= 1000) {
      return { dose: dose / 1000, unit: 'L' };
    }
    return { dose, unit: 'mL' };
  }
}
