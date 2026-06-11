import type { TrajectoryPoint, StopEvent } from '@/types';
import { distance3D, lerp, movingAverage, generateId } from '@/utils/math';

export const interpolatePoints = (
  points: TrajectoryPoint[],
  intervalMs: number
): TrajectoryPoint[] => {
  if (points.length < 2) return points;
  
  const result: TrajectoryPoint[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    
    const currentTime = new Date(current.timestamp).getTime();
    const nextTime = new Date(next.timestamp).getTime();
    const timeDiff = nextTime - currentTime;
    
    if (timeDiff <= 0) continue;
    
    result.push({ ...current });
    
    const steps = Math.floor(timeDiff / intervalMs);
    
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      const timestamp = new Date(currentTime + step * intervalMs).toISOString();
      
      result.push({
        id: generateId(),
        shiftId: current.shiftId,
        x: lerp(current.x, next.x, t),
        y: lerp(current.y, next.y, t),
        z: lerp(current.z, next.z, t),
        timestamp,
        speed: lerp(current.speed, next.speed, t),
        signalStrength: lerp(current.signalStrength, next.signalStrength, t),
      });
    }
  }
  
  if (points.length > 0) {
    result.push({ ...points[points.length - 1] });
  }
  
  return result;
};

export const calculateTotalDistance = (points: TrajectoryPoint[]): number => {
  if (points.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance3D(
      points[i - 1].x, points[i - 1].y, points[i - 1].z,
      points[i].x, points[i].y, points[i].z
    );
  }
  return total;
};

export const calculateAverageSpeed = (points: TrajectoryPoint[]): number => {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + p.speed, 0);
  return sum / points.length;
};

export const detectStops = (
  points: TrajectoryPoint[],
  minDurationMs: number = 60000,
  distanceThreshold: number = 1
): StopEvent[] => {
  if (points.length < 2) return [];
  
  const stops: StopEvent[] = [];
  let stopStart: TrajectoryPoint | null = null;
  let stopPoints: TrajectoryPoint[] = [];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    const dist = distance3D(prev.x, prev.y, prev.z, curr.x, curr.y, curr.z);
    
    if (dist < distanceThreshold && curr.speed < 0.1) {
      if (!stopStart) {
        stopStart = prev;
        stopPoints = [prev];
      }
      stopPoints.push(curr);
    } else {
      if (stopStart && stopPoints.length > 1) {
        const startTime = new Date(stopStart.timestamp).getTime();
        const endTime = new Date(curr.timestamp).getTime();
        const duration = endTime - startTime;
        
        if (duration >= minDurationMs) {
          const avgX = stopPoints.reduce((sum, p) => sum + p.x, 0) / stopPoints.length;
          const avgZ = stopPoints.reduce((sum, p) => sum + p.z, 0) / stopPoints.length;
          
          stops.push({
            id: generateId(),
            startTime: stopStart.timestamp,
            endTime: curr.timestamp,
            duration: duration / 1000,
            x: avgX,
            y: avgZ,
          });
        }
      }
      stopStart = null;
      stopPoints = [];
    }
  }
  
  return stops;
};

export const smoothTrajectory = (
  points: TrajectoryPoint[],
  windowSize: number = 3
): TrajectoryPoint[] => {
  if (points.length < windowSize) return points;
  
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const zs = points.map(p => p.z);
  const speeds = points.map(p => p.speed);
  const signals = points.map(p => p.signalStrength);
  
  const smoothedX = movingAverage(xs, windowSize);
  const smoothedY = movingAverage(ys, windowSize);
  const smoothedZ = movingAverage(zs, windowSize);
  const smoothedSpeed = movingAverage(speeds, windowSize);
  const smoothedSignal = movingAverage(signals, windowSize);
  
  return points.map((p, i) => ({
    ...p,
    x: smoothedX[i],
    y: smoothedY[i],
    z: smoothedZ[i],
    speed: smoothedSpeed[i],
    signalStrength: smoothedSignal[i],
  }));
};

export const getPointAtTime = (
  points: TrajectoryPoint[],
  targetTime: string
): { point: TrajectoryPoint; segmentProgress: number } | null => {
  if (points.length === 0) return null;
  
  const target = new Date(targetTime).getTime();
  
  for (let i = 0; i < points.length - 1; i++) {
    const currentTime = new Date(points[i].timestamp).getTime();
    const nextTime = new Date(points[i + 1].timestamp).getTime();
    
    if (target >= currentTime && target <= nextTime) {
      const t = nextTime === currentTime ? 0 : (target - currentTime) / (nextTime - currentTime);
      return {
        point: points[i],
        segmentProgress: t,
      };
    }
  }
  
  if (target < new Date(points[0].timestamp).getTime()) {
    return { point: points[0], segmentProgress: 0 };
  }
  
  if (target > new Date(points[points.length - 1].timestamp).getTime()) {
    return { point: points[points.length - 1], segmentProgress: 1 };
  }
  
  return null;
};

export const getInterpolatedPosition = (
  points: TrajectoryPoint[],
  targetTime: string
): { x: number; y: number; z: number; speed: number } | null => {
  const result = getPointAtTime(points, targetTime);
  if (!result) return null;
  
  const { point, segmentProgress } = result;
  const pointIndex = points.findIndex(p => p.id === point.id);
  
  if (pointIndex < 0 || pointIndex >= points.length - 1) {
    return { x: point.x, y: point.y, z: point.z, speed: point.speed };
  }
  
  const nextPoint = points[pointIndex + 1];
  const t = segmentProgress;
  
  return {
    x: lerp(point.x, nextPoint.x, t),
    y: lerp(point.y, nextPoint.y, t),
    z: lerp(point.z, nextPoint.z, t),
    speed: lerp(point.speed, nextPoint.speed, t),
  };
};

export const downsamplePoints = (
  points: TrajectoryPoint[],
  maxPoints: number = 500
): TrajectoryPoint[] => {
  if (points.length <= maxPoints) return points;
  
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0);
};

export default {
  interpolatePoints,
  calculateTotalDistance,
  calculateAverageSpeed,
  detectStops,
  smoothTrajectory,
  getPointAtTime,
  getInterpolatedPosition,
  downsamplePoints,
};
