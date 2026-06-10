import type { Vec2 } from '@/types/scene';

export function vec2(x: number, z: number): Vec2 {
  return { x, z };
}

export function addV2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

export function subV2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

export function scaleV2(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, z: v.z * s };
}

export function dotV2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.z * b.z;
}

export function lengthV2(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.z * v.z);
}

export function distanceV2(a: Vec2, b: Vec2): number {
  return lengthV2(subV2(a, b));
}

export function normalizeV2(v: Vec2): Vec2 {
  const len = lengthV2(v);
  if (len === 0) return { x: 0, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

export function rotateV2(v: Vec2, angleDeg: number): Vec2 {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.z * sin,
    z: v.x * sin + v.z * cos,
  };
}

export function getAABB(
  center: Vec2,
  width: number,
  depth: number,
  rotationDeg: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const halfW = width / 2;
  const halfD = depth / 2;
  const corners = [
    rotateV2({ x: -halfW, z: -halfD }, rotationDeg),
    rotateV2({ x: halfW, z: -halfD }, rotationDeg),
    rotateV2({ x: halfW, z: halfD }, rotationDeg),
    rotateV2({ x: -halfW, z: halfD }, rotationDeg),
  ].map((c) => addV2(c, center));

  const xs = corners.map((c) => c.x);
  const zs = corners.map((c) => c.z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

export function getOBBCorners(
  center: Vec2,
  width: number,
  depth: number,
  rotationDeg: number,
): Vec2[] {
  const halfW = width / 2;
  const halfD = depth / 2;
  return [
    addV2(center, rotateV2({ x: -halfW, z: -halfD }, rotationDeg)),
    addV2(center, rotateV2({ x: halfW, z: -halfD }, rotationDeg)),
    addV2(center, rotateV2({ x: halfW, z: halfD }, rotationDeg)),
    addV2(center, rotateV2({ x: -halfW, z: halfD }, rotationDeg)),
  ];
}

export function getOBBAxes(corners: Vec2[]): Vec2[] {
  return [
    normalizeV2(subV2(corners[1], corners[0])),
    normalizeV2(subV2(corners[3], corners[0])),
  ];
}

export function projectOntoAxis(points: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const proj = dotV2(p, axis);
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

export function satOBBOverlap(
  cornersA: Vec2[],
  cornersB: Vec2[],
): { overlap: boolean; minDistance: number } {
  const axesA = getOBBAxes(cornersA);
  const axesB = getOBBAxes(cornersB);
  const allAxes = [...axesA, ...axesB];

  let minOverlap = Infinity;

  for (const axis of allAxes) {
    const projA = projectOntoAxis(cornersA, axis);
    const projB = projectOntoAxis(cornersB, axis);

    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap < 0) {
      return { overlap: false, minDistance: -overlap };
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
    }
  }

  return { overlap: true, minDistance: -minOverlap };
}

export function pointToOBBDistance(point: Vec2, corners: Vec2[]): number {
  const axes = getOBBAxes(corners);
  const center = scaleV2(addV2(corners[0], corners[2]), 0.5);

  const local = subV2(point, center);
  const halfExtents = [
    distanceV2(corners[0], corners[1]) / 2,
    distanceV2(corners[0], corners[3]) / 2,
  ];

  const localProj = [dotV2(local, axes[0]), dotV2(local, axes[1])];
  const clamped = [
    Math.max(-halfExtents[0], Math.min(halfExtents[0], localProj[0])),
    Math.max(-halfExtents[1], Math.min(halfExtents[1], localProj[1])),
  ];

  const closest = addV2(
    center,
    addV2(scaleV2(axes[0], clamped[0]), scaleV2(axes[1], clamped[1])),
  );

  return distanceV2(point, closest);
}

export function computeTurnRadius(p1: Vec2, p2: Vec2, p3: Vec2): number | null {
  const d1 = distanceV2(p1, p2);
  const d2 = distanceV2(p2, p3);
  const d3 = distanceV2(p1, p3);

  if (d1 < 0.1 || d2 < 0.1 || d3 < 0.1) return null;

  const s = (d1 + d2 + d3) / 2;
  const area = Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));

  if (area < 0.001) return null;

  return (d1 * d2 * d3) / (4 * area);
}

export function lerpV2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function bezierQuadratic(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z,
  };
}

export function pointsToPolyline(points: Vec2[], segmentsPerCurve: number = 10): Vec2[] {
  if (points.length < 2) return points;
  if (points.length === 2) return [...points];

  const result: Vec2[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const toPrev = normalizeV2(subV2(prev, curr));
    const toNext = normalizeV2(subV2(next, curr));
    const cornerDist = Math.min(distanceV2(prev, curr), distanceV2(curr, next)) * 0.3;

    const cp1 = addV2(curr, scaleV2(toPrev, cornerDist));
    const cp2 = addV2(curr, scaleV2(toNext, cornerDist));

    for (let j = 1; j <= segmentsPerCurve; j++) {
      const t = j / segmentsPerCurve;
      result.push(bezierQuadratic(cp1, curr, cp2, t));
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

export function polylineLength(points: Vec2[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distanceV2(points[i - 1], points[i]);
  }
  return len;
}

export function isPointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;

    if (zi > point.z !== zj > point.z && point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
