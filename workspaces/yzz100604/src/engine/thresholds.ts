import type { RiskLevel, PrecipType } from './types';

export const FORMULA_VERSION = 'ice-risk-v1.2.0';

export const TEMP_THRESHOLDS = {
  DANGER_MAX: -5,
  WARNING_MAX: 0,
  CAUTION_MAX: 3,
  SAFE_MIN: 5,
} as const;

export const HUMIDITY_THRESHOLDS = {
  HIGH: 90,
  MEDIUM: 70,
  LOW: 50,
} as const;

export const WIND_THRESHOLDS = {
  STRONG: 10,
  MEDIUM: 6,
  LIGHT: 3,
} as const;

export const PRECIP_WEIGHTS: Record<PrecipType, number> = {
  none: 0,
  drizzle: 8,
  rain: 12,
  sleet: 18,
  snow: 15,
  freezing_rain: 25,
} as const;

export const SALT_MAX_OFFSET = 15;
export const SALT_DECAY_HOURS = 6;

export const RISK_LEVEL_RANGES: Record<RiskLevel, [number, number]> = {
  safe: [0, 25],
  caution: [26, 50],
  warning: [51, 75],
  danger: [76, 100],
} as const;

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  safe: '安全',
  caution: '低度风险',
  warning: '中度风险',
  danger: '高度危险',
} as const;

export const PRECIP_LABELS: Record<PrecipType, { label: string; icon: string }> = {
  none: { label: '无', icon: 'Sun' },
  drizzle: { label: '毛毛雨', icon: 'CloudDrizzle' },
  rain: { label: '小雨', icon: 'CloudRain' },
  sleet: { label: '雨夹雪', icon: 'CloudSnow' },
  snow: { label: '雪', icon: 'Snowflake' },
  freezing_rain: { label: '冻雨', icon: 'CloudLightning' },
} as const;

export const REVIEW_TIME_RANGES: Record<RiskLevel, [number, number]> = {
  safe: [120, 180],
  caution: [60, 90],
  warning: [20, 45],
  danger: [0, 10],
} as const;
