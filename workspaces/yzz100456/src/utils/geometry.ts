export type Vec2 = [number, number];

export const vec2Sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const vec2Add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const vec2Scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
export const vec2Dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
export const vec2Len = (a: Vec2): number => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
export const vec2Dist = (a: Vec2, b: Vec2): number => vec2Len(vec2Sub(a, b));
export const vec2Normalize = (a: Vec2): Vec2 => {
  const l = vec2Len(a) || 1;
  return [a[0] / l, a[1] / l];
};

export const angleToDirection = (angleDeg: number, radius: number): Vec2 => {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return [Math.cos(rad) * radius, Math.sin(rad) * radius];
};

export const closestPointOnSegment = (p: Vec2, a: Vec2, b: Vec2): Vec2 => {
  const ab = vec2Sub(b, a);
  const len2 = vec2Dot(ab, ab) || 1;
  let t = vec2Dot(vec2Sub(p, a), ab) / len2;
  t = Math.max(0, Math.min(1, t));
  return vec2Add(a, vec2Scale(ab, t));
};

export const distancePointToPolygon = (p: Vec2, polygon: Vec2[]): number => {
  if (polygon.length < 2) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cp = closestPointOnSegment(p, a, b);
    const d = vec2Dist(p, cp);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

export const isPointInPolygon = (p: Vec2, polygon: Vec2[]): boolean => {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > p[1]) !== (yj > p[1])) &&
      (p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) || 0.000001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export const circleIntersectsPolygon = (
  center: Vec2,
  radius: number,
  polygon: Vec2[]
): { intersects: boolean; minDist: number } => {
  if (isPointInPolygon(center, polygon)) {
    return { intersects: true, minDist: 0 };
  }
  const d = distancePointToPolygon(center, polygon);
  return { intersects: d <= radius, minDist: d };
};

export const arcPolygonIntersection = (
  center: Vec2,
  radius: number,
  startAngle: number,
  endAngle: number,
  polygon: Vec2[]
): { intersects: boolean; minDist: number; samplePoints: Vec2[] } => {
  let s = startAngle, e = endAngle;
  while (e < s) e += 360;

  const samples: Vec2[] = [];
  const step = 2;
  let minD = Infinity;
  let hit = false;

  for (let a = s; a <= e; a += step) {
    const dir = angleToDirection(a, radius);
    const pt: Vec2 = [center[0] + dir[0], center[1] + dir[1]];
    samples.push(pt);

    if (isPointInPolygon(pt, polygon)) {
      hit = true;
      minD = 0;
      continue;
    }
    const d = distancePointToPolygon(pt, polygon);
    if (d < minD) minD = d;
    if (d <= 0.1) hit = true;
  }

  for (let r = 0; r <= radius; r += Math.max(1, radius / 20)) {
    for (let a = s; a <= e; a += step * 2) {
      const dir = angleToDirection(a, r);
      const pt: Vec2 = [center[0] + dir[0], center[1] + dir[1]];
      if (isPointInPolygon(pt, polygon)) {
        hit = true;
        minD = Math.min(minD, 0);
      }
    }
  }

  return { intersects: hit, minDist: minD, samplePoints: samples };
};

export const degToRad = (d: number): number => d * Math.PI / 180;
export const radToDeg = (r: number): number => r * 180 / Math.PI;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
