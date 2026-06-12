import type { Orientation, UsageType } from '@/types';

export const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'north', label: '北' },
  { value: 'south', label: '南' },
  { value: 'east', label: '东' },
  { value: 'west', label: '西' },
  { value: 'northeast', label: '东北' },
  { value: 'northwest', label: '西北' },
  { value: 'southeast', label: '东南' },
  { value: 'southwest', label: '西南' },
];

export const USAGE_TYPE_OPTIONS: { value: UsageType; label: string; icon: string }[] = [
  { value: 'office', label: '开放办公区', icon: 'building' },
  { value: 'meeting', label: '会议室', icon: 'users' },
  { value: 'server', label: '机房', icon: 'server' },
];

export const ORIENTATION_SOLAR_FACTOR: Record<Orientation, number> = {
  north: 0.3,
  south: 0.8,
  east: 0.6,
  west: 0.7,
  northeast: 0.45,
  northwest: 0.5,
  southeast: 0.7,
  southwest: 0.75,
};

export const USAGE_TYPE_CONFIG: Record<
  UsageType,
  {
    humanLoadPerPerson: number;
    equipmentLoadPerComputer: number;
    lightingLoadPerSqm: number;
    usageFactor: number;
    peopleDensityMin: number;
    peopleDensityMax: number;
  }
> = {
  office: {
    humanLoadPerPerson: 130,
    equipmentLoadPerComputer: 200,
    lightingLoadPerSqm: 12,
    usageFactor: 1.0,
    peopleDensityMin: 6,
    peopleDensityMax: 10,
  },
  meeting: {
    humanLoadPerPerson: 150,
    equipmentLoadPerComputer: 150,
    lightingLoadPerSqm: 10,
    usageFactor: 0.8,
    peopleDensityMin: 2,
    peopleDensityMax: 4,
  },
  server: {
    humanLoadPerPerson: 120,
    equipmentLoadPerComputer: 500,
    lightingLoadPerSqm: 8,
    usageFactor: 1.2,
    peopleDensityMin: 15,
    peopleDensityMax: 30,
  },
};

export const WALL_U_VALUE = 1.5;
export const WINDOW_U_VALUE = 3.0;
export const ROOF_U_VALUE = 1.2;
export const DESIGN_TEMP_DIFF = 8;

export const SAFETY_FACTOR_MIN = 1.1;
export const SAFETY_FACTOR_MAX = 1.3;

export const HP_RATINGS = [
  { hp: '小1匹', watt: 2200 },
  { hp: '1匹', watt: 2500 },
  { hp: '大1匹', watt: 2600 },
  { hp: '1.5匹', watt: 3500 },
  { hp: '2匹', watt: 5000 },
  { hp: '大2匹', watt: 5200 },
  { hp: '3匹', watt: 7200 },
  { hp: '5匹', watt: 12000 },
  { hp: '10匹', watt: 25000 },
];

export const DEFAULT_PARAMS = {
  area: 30,
  areaUnit: 'sqm' as const,
  floorHeight: 2.8,
  orientation: 'south' as const,
  windowWallRatio: 0.3,
  peopleCount: 4,
  computerCount: 4,
  usageHours: 8,
  usageType: 'office' as const,
};

export const SQM_TO_SQFT = 10.7639;
export const SQFT_TO_SQM = 0.092903;
