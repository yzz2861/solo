import type { SugarUnit } from '../types';

export function convertToBrix(value: number, unit: SugarUnit): number {
  if (unit === 'Brix') {
    return value;
  }
  return value;
}

export function convertBrixToPercent(brix: number): number {
  return brix;
}

export function detectSugarUnit(unitStr: string): SugarUnit {
  const lower = unitStr.toLowerCase().trim();
  if (lower === 'brix' || lower === '°bx' || lower === 'bx' || lower.includes('brix')) {
    return 'Brix';
  }
  if (lower === '%' || lower === 'percent' || lower === '百分比' || lower.includes('%')) {
    return '%';
  }
  return 'Brix';
}

export function formatBrix(value: number): string {
  return `${value.toFixed(1)}°Bx`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTemperature(value: number): string {
  return `${value.toFixed(1)}°C`;
}

export function celsiusToFahrenheit(celsius: number): number {
  return celsius * 9 / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9;
}
