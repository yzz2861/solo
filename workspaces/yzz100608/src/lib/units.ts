import { CapacityUnit, PowerUnit, TimeUnit } from '../types';

export function convertCapacityToWh(
  capacity: number,
  unit: CapacityUnit,
  voltage: number
): number {
  if (!isFinite(capacity) || capacity <= 0) return 0;
  if (!isFinite(voltage) || voltage <= 0) return 0;

  switch (unit) {
    case 'mAh':
      return (capacity / 1000) * voltage;
    case 'Wh':
      return capacity;
    default:
      return capacity;
  }
}

export function convertWhToCapacity(
  wh: number,
  targetUnit: CapacityUnit,
  voltage: number
): number {
  if (!isFinite(wh) || wh <= 0) return 0;
  if (!isFinite(voltage) || voltage <= 0) return 0;

  switch (targetUnit) {
    case 'mAh':
      return (wh / voltage) * 1000;
    case 'Wh':
      return wh;
    default:
      return wh;
  }
}

export function convertPowerToW(power: number, unit: PowerUnit): number {
  if (!isFinite(power)) return 0;
  switch (unit) {
    case 'uW':
      return power / 1_000_000;
    case 'mW':
      return power / 1000;
    case 'W':
      return power;
    default:
      return power;
  }
}

export function convertWToPower(watts: number, targetUnit: PowerUnit): number {
  if (!isFinite(watts)) return 0;
  switch (targetUnit) {
    case 'uW':
      return watts * 1_000_000;
    case 'mW':
      return watts * 1000;
    case 'W':
      return watts;
    default:
      return watts;
  }
}

export function convertDurationToS(duration: number, unit: TimeUnit): number {
  if (!isFinite(duration) || duration < 0) return 0;
  switch (unit) {
    case 'ms':
      return duration / 1000;
    case 's':
      return duration;
    case 'min':
      return duration * 60;
    case 'h':
      return duration * 3600;
    default:
      return duration;
  }
}

export function convertSToDuration(seconds: number, targetUnit: TimeUnit): number {
  if (!isFinite(seconds) || seconds < 0) return 0;
  switch (targetUnit) {
    case 'ms':
      return seconds * 1000;
    case 's':
      return seconds;
    case 'min':
      return seconds / 60;
    case 'h':
      return seconds / 3600;
    default:
      return seconds;
  }
}

export function joulesToWh(joules: number): number {
  if (!isFinite(joules)) return 0;
  return joules / 3600;
}

export function whToJoules(wh: number): number {
  if (!isFinite(wh)) return 0;
  return wh * 3600;
}

export function getBestPowerUnit(watts: number): PowerUnit {
  if (watts >= 1) return 'W';
  if (watts >= 0.001) return 'mW';
  return 'uW';
}

export function getBestTimeUnit(seconds: number): TimeUnit {
  if (seconds < 1) return 'ms';
  if (seconds < 60) return 's';
  if (seconds < 3600) return 'min';
  return 'h';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function roundToSignificant(value: number, sigFigs: number = 3): number {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, sigFigs - magnitude - 1);
  return Math.round(value * factor) / factor;
}
