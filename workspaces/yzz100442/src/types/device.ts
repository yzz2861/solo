export type DeviceType = 'anchor' | 'productTable' | 'camera' | 'light' | 'cable' | 'zone';

export interface BaseDevice {
  id: string;
  type: DeviceType;
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  note?: string;
}

export interface AnchorDevice extends BaseDevice {
  type: 'anchor';
  size: { width: number; depth: number };
}

export interface ProductTableDevice extends BaseDevice {
  type: 'productTable';
  size: { width: number; depth: number; height: number };
}

export interface CameraDevice extends BaseDevice {
  type: 'camera';
  fov: number;
  near: number;
  far: number;
  height: number;
  targetId?: string;
}

export interface LightDevice extends BaseDevice {
  type: 'light';
  lightType: 'spot' | 'point' | 'area';
  intensity: number;
  color: string;
  height: number;
  angle?: number;
  penumbra?: number;
  targetId?: string;
}

export interface CableDevice extends BaseDevice {
  type: 'cable';
  points: { x: number; y: number; z: number }[];
  fromDeviceId?: string;
  toDeviceId?: string;
}

export interface ZoneDevice extends BaseDevice {
  type: 'zone';
  zoneType: 'walkway' | 'backstage';
  size: { width: number; depth: number };
  color: string;
}

export type StudioDevice =
  | AnchorDevice
  | ProductTableDevice
  | CameraDevice
  | LightDevice
  | CableDevice
  | ZoneDevice;

export interface DeviceTemplate {
  type: DeviceType;
  name: string;
  icon: string;
  description: string;
  defaultProps: Partial<StudioDevice>;
}
