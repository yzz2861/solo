import type { TrajectoryPoint, ForbiddenZone, DetectionResult } from '@/types';
import { getTimeDifference } from '@/utils/time';
import { pointToPolygonDistance, isPointInPolygon } from '@/utils/math';

const generateDetectionId = (type: string, ...keys: string[]): string => {
  const key = keys.filter(k => k).join('-');
  return `det-${type}-${btoa(key).replace(/[^a-zA-Z0-9]/g, '')}`;
};

export const detectMissingCoordinates = (
  points: TrajectoryPoint[],
  maxIntervalSeconds: number = 60
): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    const interval = getTimeDifference(prev.timestamp, curr.timestamp);
    
    if (interval > maxIntervalSeconds) {
      const detectionId = generateDetectionId('missing', prev.id, prev.timestamp);
      results.push({
        id: detectionId,
        type: 'missing',
        description: `坐标缺失：在 ${prev.timestamp} 到 ${curr.timestamp} 之间间隔 ${interval.toFixed(0)} 秒，超过最大允许间隔 ${maxIntervalSeconds} 秒`,
        severity: interval > maxIntervalSeconds * 3 ? 'high' : interval > maxIntervalSeconds * 2 ? 'medium' : 'low',
        timestamp: prev.timestamp,
        pointId: prev.id,
      });
    }
  }
  
  return results;
};

export const detectDuplicateRecords = (
  points: TrajectoryPoint[],
  toleranceMs: number = 1000
): DetectionResult[] => {
  const results: DetectionResult[] = [];
  const timeMap = new Map<number, TrajectoryPoint[]>();
  
  points.forEach(point => {
    const time = Math.floor(new Date(point.timestamp).getTime() / toleranceMs) * toleranceMs;
    const existing = timeMap.get(time) || [];
    timeMap.set(time, [...existing, point]);
  });
  
  timeMap.forEach((group, time) => {
    if (group.length > 1) {
      const detectionId = generateDetectionId('duplicate', new Date(time).toISOString());
      results.push({
        id: detectionId,
        type: 'duplicate',
        description: `重复记录：在 ${new Date(time).toISOString()} 附近检测到 ${group.length} 条记录`,
        severity: group.length > 2 ? 'high' : 'medium',
        timestamp: new Date(time).toISOString(),
        pointId: group[0].id,
      });
    }
  });
  
  return results;
};

export const getPointToZoneDistance = (
  point: TrajectoryPoint,
  zone: ForbiddenZone
): { distance: number; isInside: boolean } => {
  const isInside = isPointInPolygon(point.x, point.z, zone.polygon);
  const distance = pointToPolygonDistance(point.x, point.z, zone.polygon);
  
  return {
    distance: isInside ? -distance : distance,
    isInside,
  };
};

export const detectZoneProximity = (
  points: TrajectoryPoint[],
  zones: ForbiddenZone[]
): DetectionResult[] => {
  const results: DetectionResult[] = [];
  const warnedPoints = new Set<string>();
  
  points.forEach(point => {
    zones.forEach(zone => {
      const { distance, isInside } = getPointToZoneDistance(point, zone);
      const absDistance = Math.abs(distance);
      
      if (isInside) {
        if (!warnedPoints.has(`${point.id}-${zone.id}`)) {
          warnedPoints.add(`${point.id}-${zone.id}`);
          const detectionId = generateDetectionId('proximity', point.id, zone.id, 'inside');
          results.push({
            id: detectionId,
            type: 'proximity',
            description: `进入禁区：机器人在 ${point.timestamp} 进入 ${zone.name} 区域`,
            severity: 'high',
            timestamp: point.timestamp,
            pointId: point.id,
            zoneId: zone.id,
            distance: distance,
          });
        }
      } else if (absDistance < zone.warningDistance) {
        if (!warnedPoints.has(`${point.id}-${zone.id}`)) {
          warnedPoints.add(`${point.id}-${zone.id}`);
          const detectionId = generateDetectionId('proximity', point.id, zone.id, 'near');
          results.push({
            id: detectionId,
            type: 'proximity',
            description: `靠近禁区：机器人在 ${point.timestamp} 距离 ${zone.name} 仅 ${absDistance.toFixed(2)} 米，低于安全距离 ${zone.warningDistance} 米`,
            severity: absDistance < zone.warningDistance * 0.5 ? 'high' : 'medium',
            timestamp: point.timestamp,
            pointId: point.id,
            zoneId: zone.id,
            distance: absDistance,
          });
        }
      }
    });
  });
  
  return results;
};

export const detectAbnormalStays = (
  points: TrajectoryPoint[],
  minDurationSeconds: number = 180,
  minIntervalSeconds: number = 30
): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  if (points.length < 2) return results;
  
  let groupStartIndex = 0;
  let groupCenter = { x: points[0].x, z: points[0].z };
  
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const dist = Math.sqrt(
      Math.pow(point.x - groupCenter.x, 2) + 
      Math.pow(point.z - groupCenter.z, 2)
    );
    
    if (dist > 3) {
      const groupDuration = getTimeDifference(
        points[groupStartIndex].timestamp,
        points[i - 1].timestamp
      );
      
      if (groupDuration >= minDurationSeconds) {
        const detectionId = generateDetectionId('abnormalStay', points[groupStartIndex].id, points[groupStartIndex].timestamp);
        results.push({
          id: detectionId,
          type: 'abnormalStay',
          description: `异常停留：在位置 (${groupCenter.x.toFixed(1)}, ${groupCenter.z.toFixed(1)}) 停留 ${groupDuration.toFixed(0)} 秒`,
          severity: groupDuration > minDurationSeconds * 3 ? 'high' : groupDuration > minDurationSeconds * 2 ? 'medium' : 'low',
          timestamp: points[groupStartIndex].timestamp,
          pointId: points[groupStartIndex].id,
          duration: groupDuration,
        });
      }
      
      groupStartIndex = i;
      groupCenter = { x: point.x, z: point.z };
    } else {
      const n = i - groupStartIndex + 1;
      groupCenter = {
        x: (groupCenter.x * (n - 1) + point.x) / n,
        z: (groupCenter.z * (n - 1) + point.z) / n,
      };
    }
  }
  
  const groupDuration = getTimeDifference(
    points[groupStartIndex].timestamp,
    points[points.length - 1].timestamp
  );
  
  if (groupDuration >= minDurationSeconds) {
    const detectionId = generateDetectionId('abnormalStay', points[groupStartIndex].id, points[groupStartIndex].timestamp);
    results.push({
      id: detectionId,
      type: 'abnormalStay',
      description: `异常停留：在位置 (${groupCenter.x.toFixed(1)}, ${groupCenter.z.toFixed(1)}) 停留 ${groupDuration.toFixed(0)} 秒`,
      severity: groupDuration > minDurationSeconds * 3 ? 'high' : groupDuration > minDurationSeconds * 2 ? 'medium' : 'low',
      timestamp: points[groupStartIndex].timestamp,
      pointId: points[groupStartIndex].id,
      duration: groupDuration,
    });
  }
  
  return results.filter((result, index, self) => {
    if (index === 0) return true;
    const prev = self[index - 1];
    return getTimeDifference(prev.timestamp, result.timestamp) > minIntervalSeconds;
  });
};

export const runAllDetections = (
  points: TrajectoryPoint[],
  zones: ForbiddenZone[],
  options?: {
    maxInterval?: number;
    toleranceMs?: number;
    minStayDuration?: number;
  }
): DetectionResult[] => {
  const results: DetectionResult[] = [];
  
  results.push(...detectMissingCoordinates(points, options?.maxInterval));
  results.push(...detectDuplicateRecords(points, options?.toleranceMs));
  results.push(...detectZoneProximity(points, zones));
  results.push(...detectAbnormalStays(points, options?.minStayDuration));
  
  results.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return results;
};

export default {
  detectMissingCoordinates,
  detectDuplicateRecords,
  getPointToZoneDistance,
  detectZoneProximity,
  detectAbnormalStays,
  runAllDetections,
};
