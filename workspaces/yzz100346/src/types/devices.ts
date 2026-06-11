export type DeviceType = 'lightRig' | 'speaker' | 'hoistPoint' | 'audienceArea' | 'stage';

export type WeightUnit = 'kg' | '公斤' | '';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface BaseDevice {
  id: string;
  type: DeviceType;
  name: string;
  position: Position;
  rotation?: Position;
  dimensions?: Dimensions;
}

export interface LoadBearingDevice extends BaseDevice {
  weight: number;
  weightUnit: WeightUnit;
}

export interface LightRig extends LoadBearingDevice {
  type: 'lightRig';
  lightCount: number;
  connectedHoistPoints: string[];
}

export interface Speaker extends LoadBearingDevice {
  type: 'speaker';
  power: number;
}

export interface HoistPoint extends BaseDevice {
  type: 'hoistPoint';
  maxLoad: number;
  currentLoad: number;
}

export interface AudienceArea extends BaseDevice {
  type: 'audienceArea';
  capacity: number;
}

export interface Stage extends BaseDevice {
  type: 'stage';
}

export type Device = LightRig | Speaker | HoistPoint | AudienceArea | Stage;

export const isLoadBearingDevice = (device: BaseDevice): device is LoadBearingDevice => {
  return 'weight' in device && 'weightUnit' in device;
};

export const isLightRig = (device: BaseDevice): device is LightRig => {
  return device.type === 'lightRig';
};

export const isSpeaker = (device: BaseDevice): device is Speaker => {
  return device.type === 'speaker';
};

export const isHoistPoint = (device: BaseDevice): device is HoistPoint => {
  return device.type === 'hoistPoint';
};

export const isAudienceArea = (device: BaseDevice): device is AudienceArea => {
  return device.type === 'audienceArea';
};

export const isStage = (device: BaseDevice): device is Stage => {
  return device.type === 'stage';
};
