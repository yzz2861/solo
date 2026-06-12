import { SQM_TO_SQFT, SQFT_TO_SQM } from './constants';
import type { AreaUnit } from '@/types';

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (from === to) return value;
  if (from === 'sqm' && to === 'sqft') {
    return Math.round(value * SQM_TO_SQFT * 100) / 100;
  }
  return Math.round(value * SQFT_TO_SQM * 100) / 100;
}

export function toSqm(value: number, unit: AreaUnit): number {
  return unit === 'sqm' ? value : value * SQFT_TO_SQM;
}

export function toSqft(value: number, unit: AreaUnit): number {
  return unit === 'sqft' ? value : value * SQM_TO_SQFT;
}

export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWatt(watt: number): string {
  if (watt >= 10000) {
    return `${(watt / 1000).toFixed(1)} kW`;
  }
  return `${Math.round(watt)} W`;
}
