import type { DeviceType, WeightUnit } from '../types/devices';

export const DEFAULT_DIMENSIONS: Record<DeviceType, { width: number; height: number; depth: number }> = {
  stage: { width: 12, height: 0.8, depth: 8 },
  lightRig: { width: 3, height: 0.3, depth: 0.3 },
  speaker: { width: 0.6, height: 1.2, depth: 0.5 },
  hoistPoint: { width: 0.2, height: 0.2, depth: 0.2 },
  audienceArea: { width: 15, height: 0.1, depth: 10 },
};

export const DEFAULT_WEIGHT: Record<string, { weight: number; unit: WeightUnit }> = {
  lightRig: { weight: 0, unit: 'kg' },
  speaker: { weight: 0, unit: 'kg' },
};

export const DEFAULT_MAX_HOIST_LOAD = 500;

export const DEFAULT_HOIST_HEIGHT = 8;

export const DEVICE_PLACEMENT_OFFSET: Record<DeviceType, { y: number }> = {
  stage: { y: 0 },
  lightRig: { y: 6 },
  speaker: { y: 3 },
  hoistPoint: { y: DEFAULT_HOIST_HEIGHT },
  audienceArea: { y: 0 },
};

export const getDefaultDeviceName = (type: DeviceType, index: number): string => {
  const names: Record<DeviceType, string> = {
    stage: `舞台 ${index + 1}`,
    lightRig: `灯架 ${index + 1}`,
    speaker: `音箱 ${index + 1}`,
    hoistPoint: `吊点 ${index + 1}`,
    audienceArea: `观众区 ${index + 1}`,
  };
  return names[type];
};

export const getDeviceTypeCount = (type: DeviceType, existingNames: string[]): number => {
  const prefix = getDefaultDeviceName(type, 0).replace(/\s\d+$/, '');
  return existingNames.filter(name => name.startsWith(prefix)).length;
};
