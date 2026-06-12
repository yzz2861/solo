import type { DeviceTemplate, StudioDevice } from '@/types/device';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const deviceTemplates: DeviceTemplate[] = [
  {
    type: 'anchor',
    name: '主播区',
    icon: 'user',
    description: '主播站立/坐立区域',
    defaultProps: {
      size: { width: 1.5, depth: 1.5 },
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  },
  {
    type: 'productTable',
    name: '商品台',
    icon: 'table',
    description: '商品展示台',
    defaultProps: {
      size: { width: 1.2, depth: 0.6, height: 0.8 },
      position: { x: 2, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  },
  {
    type: 'camera',
    name: '相机',
    icon: 'camera',
    description: '直播摄像机位',
    defaultProps: {
      fov: 50,
      near: 0.1,
      far: 20,
      height: 1.6,
      position: { x: 0, y: 1.6, z: -5 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  },
  {
    type: 'light',
    name: '聚光灯',
    icon: 'lightbulb',
    description: '聚光灯光源',
    defaultProps: {
      lightType: 'spot',
      intensity: 2,
      color: '#ffffff',
      height: 2.5,
      angle: Math.PI / 4,
      penumbra: 0.5,
      position: { x: -2, y: 2.5, z: -2 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  },
  {
    type: 'zone',
    name: '通道区',
    icon: 'arrow-right-left',
    description: '人员通道区域',
    defaultProps: {
      zoneType: 'walkway',
      size: { width: 1.5, depth: 4 },
      color: 'rgba(59, 130, 246, 0.2)',
      position: { x: -4, y: 0.01, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    },
  },
];

export const createDeviceFromTemplate = (
  template: DeviceTemplate
): StudioDevice => {
  const id = generateId();
  const defaultPosition = template.defaultProps.position || { x: 0, y: 0, z: 0 };
  const defaultRotation = template.defaultProps.rotation || { x: 0, y: 0, z: 0 };
  const { position: _, rotation: __, ...restDefaultProps } = template.defaultProps;
  return {
    id,
    type: template.type,
    name: template.name,
    position: { ...defaultPosition },
    rotation: { ...defaultRotation },
    ...restDefaultProps,
  } as StudioDevice;
};
