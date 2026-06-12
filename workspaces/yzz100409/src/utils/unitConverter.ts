import type {
  TemperatureUnit,
  RadiationUnit,
  WindUnit,
  SoilMoistureUnit,
} from '../../shared/types';

export const tempConvert = (
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit = 'celsius'
): number => {
  if (from === to) return value;
  if (from === 'fahrenheit' && to === 'celsius') {
    return ((value - 32) * 5) / 9;
  }
  return (value * 9) / 5 + 32;
};

export const radiationConvert = (
  value: number,
  from: RadiationUnit,
  to: RadiationUnit = 'w_m2'
): number => {
  if (from === to) return value;
  if (from === 'lux' && to === 'w_m2') {
    return value * 0.0079;
  }
  return value / 0.0079;
};

export const windConvert = (
  value: number,
  from: WindUnit,
  to: WindUnit = 'm_s'
): number => {
  if (from === to) return value;
  if (from === 'km_h' && to === 'm_s') {
    return value / 3.6;
  }
  return value * 3.6;
};

export const soilMoistureConvert = (
  value: number,
  from: SoilMoistureUnit,
  to: SoilMoistureUnit = 'vol_percent'
): number => {
  if (from === to) return value;
  if (from === 'mbar' && to === 'vol_percent') {
    if (value <= 0) return 50;
    const pF = Math.log10(value);
    if (pF < 2) return 45 - (pF - 1) * 10;
    if (pF < 2.5) return 35 - (pF - 2) * 10;
    if (pF < 3) return 30 - (pF - 2.5) * 10;
    if (pF < 4) return 25 - (pF - 3) * 8;
    return 15;
  }
  if (value >= 40) return 10;
  if (value >= 30) return 100 * Math.pow(10, ((40 - value) / 10 + 2));
  if (value >= 20) return 100 * Math.pow(10, ((30 - value) / 10 + 2.5));
  if (value >= 10) return 100 * Math.pow(10, ((20 - value) / 8 + 3));
  return 10000;
};

export const mmToM3Mu = (mm: number): number => {
  return mm * (2000 / 3) * 0.001;
};

export const m3MuToMm = (m3Mu: number): number => {
  return m3Mu / ((2000 / 3) * 0.001);
};

export const TEMP_UNIT_LABELS: Record<TemperatureUnit, string> = {
  celsius: '℃',
  fahrenheit: '℉',
};
export const RAD_UNIT_LABELS: Record<RadiationUnit, string> = {
  w_m2: 'W/m²',
  lux: 'lux',
};
export const WIND_UNIT_LABELS: Record<WindUnit, string> = {
  m_s: 'm/s',
  km_h: 'km/h',
};
export const SOIL_UNIT_LABELS: Record<SoilMoistureUnit, string> = {
  vol_percent: '体积%',
  mbar: 'mbar',
};
