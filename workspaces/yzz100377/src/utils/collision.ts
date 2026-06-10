import type {
  SceneObject,
  Path,
  PathPoint,
  CollisionPoint,
  ForkliftObject,
  Vec2,
  Severity,
  ZoneObject,
} from '@/types/scene';
import {
  getOBBCorners,
  satOBBOverlap,
  pointToOBBDistance,
  pointsToPolyline,
  distanceV2,
  isPointInPolygon,
  lerpV2,
  computeTurnRadius,
} from './geometry';

const WARNING_THRESHOLD = 0.3;
const DANGER_THRESHOLD = 0.05;

function getSeverity(distance: number): Severity {
  if (distance <= DANGER_THRESHOLD) return 'danger';
  if (distance <= WARNING_THRESHOLD) return 'warning';
  return 'safe';
}

function getObjectFootprint(obj: SceneObject): { corners: Vec2[]; width: number; depth: number } | null {
  switch (obj.type) {
    case 'shelf': {
      const totalWidth = obj.width + (obj.hasPallet ? obj.palletOverhang * 2 : 0);
      return {
        corners: getOBBCorners(
          { x: obj.position.x, z: obj.position.z },
          totalWidth,
          obj.depth,
          obj.rotation,
        ),
        width: totalWidth,
        depth: obj.depth,
      };
    }
    case 'forklift': {
      const totalLen = obj.wheelbase + obj.forkLength;
      return {
        corners: getOBBCorners(
          { x: obj.position.x, z: obj.position.z },
          obj.width,
          totalLen,
          obj.rotation,
        ),
        width: obj.width,
        depth: totalLen,
      };
    }
    case 'zone':
    case 'pallet': {
      return {
        corners: getOBBCorners(
          { x: obj.position.x, z: obj.position.z },
          obj.width,
          obj.depth,
          obj.rotation,
        ),
        width: obj.width,
        depth: obj.depth,
      };
    }
    default:
      return null;
  }
}

export function checkObjectCollision(objA: SceneObject, objB: SceneObject): {
  colliding: boolean;
  distance: number;
} {
  const footprintA = getObjectFootprint(objA);
  const footprintB = getObjectFootprint(objB);

  if (!footprintA || !footprintB) {
    return { colliding: false, distance: Infinity };
  }

  const result = satOBBOverlap(footprintA.corners, footprintB.corners);
  return {
    colliding: result.overlap,
    distance: result.minDistance,
  };
}

export function checkPathCollisions(
  path: Path,
  objects: SceneObject[],
  forklift: ForkliftObject | null,
): CollisionPoint[] {
  const collisions: CollisionPoint[] = [];

  if (!forklift || path.points.length < 2) return collisions;

  const smoothPoints = pointsToPolyline(
    path.points.map((p) => ({ x: p.x, z: p.z })),
    5,
  );

  const forkliftHalfWidth = forklift.width / 2;
  const sampleStep = 0.5;

  for (let i = 0; i < smoothPoints.length - 1; i++) {
    const p1 = smoothPoints[i];
    const p2 = smoothPoints[i + 1];
    const segLen = distanceV2(p1, p2);
    const steps = Math.max(1, Math.floor(segLen / sampleStep));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pos = lerpV2(p1, p2, t);

      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z) * (180 / Math.PI);
      const forkliftCorners = getOBBCorners(
        pos,
        forklift.width,
        forklift.wheelbase + forklift.forkLength,
        angle,
      );

      for (const obj of objects) {
        if (obj.id === forklift.id) continue;
        if (obj.type === 'line') continue;

        const objFootprint = getObjectFootprint(obj);
        if (!objFootprint) continue;

        const result = satOBBOverlap(forkliftCorners, objFootprint.corners);
        const severity = getSeverity(result.minDistance);

        if (severity !== 'safe') {
          const exists = collisions.some(
            (c) => c.objectId === obj.id && distanceV2(c.position, pos) < 1,
          );

          if (!exists) {
            collisions.push({
              position: { x: pos.x, z: pos.z },
              distance: result.minDistance,
              objectId: obj.id,
              severity,
              description:
                severity === 'danger'
                  ? `与${getObjectName(obj)}碰撞，侵入${Math.abs(result.minDistance).toFixed(2)}m`
                  : `与${getObjectName(obj)}距离仅${result.minDistance.toFixed(2)}m，擦边风险`,
              pathPointIndex: i,
            });
          }
        }
      }
    }
  }

  return collisions.sort((a, b) => a.distance - b.distance);
}

export function checkZoneViolations(
  path: Path,
  zones: ZoneObject[],
): { zone: ZoneObject; entryPoint: Vec2; severity: 'danger' }[] {
  const violations: { zone: ZoneObject; entryPoint: Vec2; severity: 'danger' }[] = [];

  if (path.points.length < 2) return violations;

  for (const zone of zones) {
    if (zone.zoneType !== 'forbidden') continue;

    const corners = getOBBCorners(
      { x: zone.position.x, z: zone.position.z },
      zone.width,
      zone.depth,
      zone.rotation,
    );

    let entryPoint: Vec2 | null = null;

    for (const point of path.points) {
      if (isPointInPolygon({ x: point.x, z: point.z }, corners)) {
        entryPoint = { x: point.x, z: point.z };
        break;
      }
    }

    if (entryPoint) {
      violations.push({
        zone,
        entryPoint,
        severity: 'danger',
      });
    }
  }

  return violations;
}

export function computePathTurningRadii(points: PathPoint[]): PathPoint[] {
  if (points.length < 3) return points;

  const result: PathPoint[] = [...points];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const radius = computeTurnRadius(
      { x: prev.x, z: prev.z },
      { x: curr.x, z: curr.z },
      { x: next.x, z: next.z },
    );

    if (radius !== null) {
      result[i] = { ...curr, radius, isTurn: true };
    }
  }

  return result;
}

export function getPathMinTurnRadius(points: PathPoint[]): number | null {
  const radii = points.filter((p) => p.radius !== undefined).map((p) => p.radius!);
  if (radii.length === 0) return null;
  return Math.min(...radii);
}

export function getPedestrianDistance(
  path: Path,
  zones: ZoneObject[],
): { zone: ZoneObject; minDistance: number }[] {
  const results: { zone: ZoneObject; minDistance: number }[] = [];

  const pedestrianZones = zones.filter((z) => z.zoneType === 'pedestrian');

  for (const zone of pedestrianZones) {
    const corners = getOBBCorners(
      { x: zone.position.x, z: zone.position.z },
      zone.width,
      zone.depth,
      zone.rotation,
    );

    let minDist = Infinity;

    for (const point of path.points) {
      const dist = pointToOBBDistance({ x: point.x, z: point.z }, corners);
      if (dist < minDist) minDist = dist;
    }

    results.push({ zone, minDistance: minDist });
  }

  return results.sort((a, b) => a.minDistance - b.minDistance);
}

function getObjectName(obj: SceneObject): string {
  if (obj.name) return obj.name;
  switch (obj.type) {
    case 'shelf':
      return '货架';
    case 'pallet':
      return '托盘';
    case 'forklift':
      return '叉车';
    case 'zone':
      return obj.zoneType === 'forbidden' ? '禁行区' : '行人通道';
    default:
      return '物体';
  }
}
