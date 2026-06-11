import type { Position, Dimensions, BaseDevice } from '../types/devices';

export const distance3D = (p1: Position, p2: Position): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const distance2D = (p1: Position, p2: Position): number => {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const getDeviceBounds = (device: BaseDevice): {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
} => {
  const { position, dimensions } = device;
  const w = dimensions?.width || 1;
  const h = dimensions?.height || 1;
  const d = dimensions?.depth || 1;
  
  return {
    minX: position.x - w / 2,
    maxX: position.x + w / 2,
    minY: position.y,
    maxY: position.y + h,
    minZ: position.z - d / 2,
    maxZ: position.z + d / 2,
  };
};

export const minDistanceBetweenDevices = (
  device1: BaseDevice,
  device2: BaseDevice
): number => {
  const b1 = getDeviceBounds(device1);
  const b2 = getDeviceBounds(device2);
  
  let dx = 0;
  if (b1.maxX < b2.minX) dx = b2.minX - b1.maxX;
  else if (b2.maxX < b1.minX) dx = b1.minX - b2.maxX;
  
  let dy = 0;
  if (b1.maxY < b2.minY) dy = b2.minY - b1.maxY;
  else if (b2.maxY < b1.minY) dy = b1.minY - b2.maxY;
  
  let dz = 0;
  if (b1.maxZ < b2.minZ) dz = b2.minZ - b1.maxZ;
  else if (b2.maxZ < b1.minZ) dz = b1.minZ - b2.maxZ;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const calculateLoadShare = (
  devicePosition: Position,
  hoistPoints: Position[],
  totalWeight: number
): number[] => {
  if (hoistPoints.length === 0) return [];
  if (hoistPoints.length === 1) return [totalWeight];
  
  const distances = hoistPoints.map(hp => distance3D(devicePosition, hp));
  const inverseDistances = distances.map(d => 1 / Math.max(d, 0.001));
  const totalInverse = inverseDistances.reduce((sum, inv) => sum + inv, 0);
  
  return inverseDistances.map(inv => totalWeight * (inv / totalInverse));
};

export const calculateVariance = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
};

export const snapToGrid = (value: number, gridSize: number = 0.5): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPositionToGrid = (position: Position, gridSize: number = 0.5): Position => ({
  x: snapToGrid(position.x, gridSize),
  y: snapToGrid(position.y, gridSize),
  z: snapToGrid(position.z, gridSize),
});

export const clampPosition = (
  position: Position,
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
): Position => ({
  x: Math.max(bounds.minX, Math.min(bounds.maxX, position.x)),
  y: Math.max(bounds.minY, Math.min(bounds.maxY, position.y)),
  z: Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z)),
});
