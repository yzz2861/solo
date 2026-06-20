import type { TempUnit, WindUnit } from './types';

export const tempToCelsius = (value: number, unit: TempUnit): number => {
  if (unit === 'C') return value;
  return (value - 32) * (5 / 9);
};

export const celsiusToTemp = (celsius: number, unit: TempUnit): number => {
  if (unit === 'C') return celsius;
  return celsius * (9 / 5) + 32;
};

export const windToMs = (value: number, unit: WindUnit): number => {
  switch (unit) {
    case 'm/s':
      return value;
    case 'km/h':
      return value / 3.6;
    case 'mph':
      return value / 2.23694;
  }
};

export const msToWind = (ms: number, unit: WindUnit): number => {
  switch (unit) {
    case 'm/s':
      return ms;
    case 'km/h':
      return ms * 3.6;
    case 'mph':
      return ms * 2.23694;
  }
};

export const roundTo = (value: number, decimals: number = 1): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
