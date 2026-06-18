import type { ExhibitionObject, Dimensions, FireExitZone, EntranceZone } from '../types';

export const getObjectBounds = (obj: { position: [number, number, number]; dimensions: Dimensions }) => {
  const [x, y, z] = obj.position;
  const { width, depth } = obj.dimensions;
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    y,
  };
};

export const checkOverlap = (
  obj1: { position: [number, number, number]; dimensions: Dimensions },
  obj2: { position: [number, number, number]; dimensions: Dimensions }
): boolean => {
  const b1 = getObjectBounds(obj1);
  const b2 = getObjectBounds(obj2);
  
  return !(
    b1.maxX <= b2.minX ||
    b1.minX >= b2.maxX ||
    b1.maxZ <= b2.minZ ||
    b1.minZ >= b2.maxZ
  );
};

export const calculateOverlapArea = (
  obj1: { position: [number, number, number]; dimensions: Dimensions },
  obj2: { position: [number, number, number]; dimensions: Dimensions }
): number => {
  const b1 = getObjectBounds(obj1);
  const b2 = getObjectBounds(obj2);
  
  const overlapX = Math.max(0, Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX));
  const overlapZ = Math.max(0, Math.min(b1.maxZ, b2.maxZ) - Math.max(b1.minZ, b2.minZ));
  
  return overlapX * overlapZ;
};

export const calculateDistance = (
  obj1: { position: [number, number, number]; dimensions: Dimensions },
  obj2: { position: [number, number, number]; dimensions: Dimensions }
): number => {
  const b1 = getObjectBounds(obj1);
  const b2 = getObjectBounds(obj2);
  
  const dx = Math.max(0, b2.minX - b1.maxX, b1.minX - b2.maxX);
  const dz = Math.max(0, b2.minZ - b1.maxZ, b1.minZ - b2.maxZ);
  
  return Math.sqrt(dx * dx + dz * dz);
};

export const calculateEdgeToEdgeDistance = (
  obj1: { position: [number, number, number]; dimensions: Dimensions },
  obj2: { position: [number, number, number]; dimensions: Dimensions }
): number => {
  const b1 = getObjectBounds(obj1);
  const b2 = getObjectBounds(obj2);
  
  const left = b2.minX - b1.maxX;
  const right = b1.minX - b2.maxX;
  const top = b2.minZ - b1.maxZ;
  const bottom = b1.minZ - b2.maxZ;
  
  if (left > 0 && top > 0) return Math.sqrt(left * left + top * top);
  if (left > 0 && bottom > 0) return Math.sqrt(left * left + bottom * bottom);
  if (right > 0 && top > 0) return Math.sqrt(right * right + top * top);
  if (right > 0 && bottom > 0) return Math.sqrt(right * right + bottom * bottom);
  if (left > 0) return left;
  if (right > 0) return right;
  if (top > 0) return top;
  if (bottom > 0) return bottom;
  
  return 0;
};

export const lineIntersectsZone = (
  line: [[number, number, number], [number, number, number]],
  zone: { position: [number, number, number]; dimensions: Dimensions }
): boolean => {
  const [p1, p2] = line;
  const zb = getObjectBounds(zone);
  
  const [x1, , z1] = p1;
  const [x2, , z2] = p2;
  
  const dx = x2 - x1;
  const dz = z2 - z1;
  
  let tMin = 0;
  let tMax = 1;
  
  if (Math.abs(dx) < 1e-10) {
    if (x1 < zb.minX || x1 > zb.maxX) return false;
  } else {
    const t1 = (zb.minX - x1) / dx;
    const t2 = (zb.maxX - x1) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  
  if (Math.abs(dz) < 1e-10) {
    if (z1 < zb.minZ || z1 > zb.maxZ) return false;
  } else {
    const t1 = (zb.minZ - z1) / dz;
    const t2 = (zb.maxZ - z1) / dz;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  
  return tMin <= tMax;
};

export const snapToGrid = (value: number, gridSize: number = 0.5): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const clampToBounds = (
  position: [number, number, number],
  dimensions: Dimensions,
  bounds: Dimensions,
  boundsPosition: [number, number, number] = [0, 0, 0]
): [number, number, number] => {
  const [x, y, z] = position;
  const { width: objWidth, depth: objDepth } = dimensions;
  const { width: boundWidth, depth: boundDepth } = bounds;
  const [bx, , bz] = boundsPosition;
  
  const halfObjW = objWidth / 2;
  const halfObjD = objDepth / 2;
  const halfBoundW = boundWidth / 2;
  const halfBoundD = boundDepth / 2;
  
  const clampedX = Math.max(bx - halfBoundW + halfObjW, Math.min(bx + halfBoundW - halfObjW, x));
  const clampedZ = Math.max(bz - halfBoundD + halfObjD, Math.min(bz + halfBoundD - halfObjD, z));
  
  return [clampedX, y, clampedZ];
};

export const getCenterPosition = (): [number, number, number] => {
  return [0, 0, 0];
};

export const distanceToCenter = (position: [number, number, number]): number => {
  const [x, , z] = position;
  return Math.sqrt(x * x + z * z);
};
