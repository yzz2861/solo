import type { 
  PatrolShift, 
  Checkpoint, 
  HeatmapCell, 
  CoverageReport, 
  StayReport, 
  MissedPointsReport,
  ComparisonReport,
  ShiftDifference,
  PatternAnalysis,
  AbnormalStay,
  TrajectoryPoint
} from '@/types';
import { distance2D } from '@/utils/math';
import { getTimeDifference } from '@/utils/time';
import { calculateTotalDistance, detectStops } from './trajectoryService';

export const calculateCoverageRate = (
  shift: PatrolShift,
  checkpoints: Checkpoint[]
): { rate: number; covered: Checkpoint[]; missed: Checkpoint[] } => {
  const { trajectoryPoints } = shift;
  if (trajectoryPoints.length === 0 || checkpoints.length === 0) {
    return { rate: 0, covered: [], missed: checkpoints };
  }
  
  const covered: Checkpoint[] = [];
  const missed: Checkpoint[] = [];
  
  checkpoints.forEach(checkpoint => {
    const isVisited = trajectoryPoints.some(point => {
      const dist = distance2D(point.x, point.z, checkpoint.x, checkpoint.y);
      return dist <= checkpoint.radius;
    });
    
    if (isVisited) {
      covered.push(checkpoint);
    } else {
      missed.push(checkpoint);
    }
  });
  
  const rate = checkpoints.length > 0 ? covered.length / checkpoints.length : 0;
  
  return { rate, covered, missed };
};

export const generateHeatmap = (
  points: TrajectoryPoint[],
  gridSize: number = 5,
  mapWidth: number = 100,
  mapHeight: number = 80
): HeatmapCell[] => {
  const grid: { [key: string]: number } = {};
  
  points.forEach(point => {
    const gridX = Math.floor(point.x / gridSize);
    const gridY = Math.floor(point.z / gridSize);
    const key = `${gridX},${gridY}`;
    grid[key] = (grid[key] || 0) + 1;
  });
  
  const heatmap: HeatmapCell[] = [];
  
  for (let x = 0; x < mapWidth / gridSize; x++) {
    for (let y = 0; y < mapHeight / gridSize; y++) {
      const key = `${x},${y}`;
      const value = grid[key] || 0;
      if (value > 0) {
        heatmap.push({
          x: x * gridSize + gridSize / 2,
          y: y * gridSize + gridSize / 2,
          value,
        });
      }
    }
  }
  
  return heatmap;
};

export const generateCoverageReport = (
  shift: PatrolShift,
  checkpoints: Checkpoint[],
  mapWidth: number = 100,
  mapHeight: number = 80
): CoverageReport => {
  const { rate, covered, missed } = calculateCoverageRate(shift, checkpoints);
  const heatmapData = generateHeatmap(shift.trajectoryPoints, 5, mapWidth, mapHeight);
  const patrolDuration = getTimeDifference(shift.startTime, shift.endTime);
  const totalDistance = calculateTotalDistance(shift.trajectoryPoints);
  
  return {
    shiftId: shift.id,
    shiftName: shift.shiftName,
    date: shift.date,
    coverageRate: rate,
    totalCheckpoints: checkpoints.length,
    coveredCheckpoints: covered.length,
    missedCheckpoints: missed,
    heatmapData,
    patrolDuration,
    totalDistance,
  };
};

export const generateStayReport = (shift: PatrolShift): StayReport => {
  const stops = detectStops(shift.trajectoryPoints, 180000);
  
  const abnormalStays: AbnormalStay[] = stops.map(stop => ({
    id: stop.id,
    x: stop.x,
    y: stop.y,
    startTime: stop.startTime,
    endTime: stop.endTime,
    duration: stop.duration,
  }));
  
  const totalStayTime = abnormalStays.reduce((sum, s) => sum + s.duration, 0);
  const avgStayDuration = abnormalStays.length > 0 ? totalStayTime / abnormalStays.length : 0;
  const maxStayDuration = abnormalStays.length > 0 
    ? Math.max(...abnormalStays.map(s => s.duration)) 
    : 0;
  
  return {
    shiftId: shift.id,
    shiftName: shift.shiftName,
    date: shift.date,
    abnormalStays,
    totalStayTime,
    avgStayDuration,
    maxStayDuration,
    stayCount: abnormalStays.length,
  };
};

export const generateMissedPointsReport = (
  shift: PatrolShift,
  checkpoints: Checkpoint[]
): MissedPointsReport => {
  const { missed } = calculateCoverageRate(shift, checkpoints);
  
  const lastVisitTimes: { [checkpointId: string]: string | null } = {};
  
  checkpoints.forEach(checkpoint => {
    let lastVisit: string | null = null;
    
    for (let i = shift.trajectoryPoints.length - 1; i >= 0; i--) {
      const point = shift.trajectoryPoints[i];
      const dist = distance2D(point.x, point.z, checkpoint.x, checkpoint.y);
      if (dist <= checkpoint.radius) {
        lastVisit = point.timestamp;
        break;
      }
    }
    
    lastVisitTimes[checkpoint.id] = lastVisit;
  });
  
  return {
    shiftId: shift.id,
    shiftName: shift.shiftName,
    date: shift.date,
    missedPoints: missed,
    totalMissed: missed.length,
    lastVisitTimes,
  };
};

export const compareShifts = (
  shifts: PatrolShift[],
  checkpoints: Checkpoint[]
): ComparisonReport => {
  if (shifts.length < 2) {
    throw new Error('需要至少2个班次进行对比');
  }
  
  const coverageComparison = shifts.map(shift => {
    const { rate } = calculateCoverageRate(shift, checkpoints);
    return {
      shiftId: shift.id,
      shiftName: `${shift.date} ${shift.shiftName}`,
      rate,
    };
  });
  
  const differences: ShiftDifference[] = [];
  
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const shift1 = shifts[i];
      const shift2 = shifts[j];
      
      const coverage1 = coverageComparison.find(c => c.shiftId === shift1.id)!.rate;
      const coverage2 = coverageComparison.find(c => c.shiftId === shift2.id)!.rate;
      const coverageDiff = Math.abs(coverage1 - coverage2);
      
      if (coverageDiff > 0.1) {
        differences.push({
          type: 'coverage',
          description: `巡逻覆盖率差异`,
          shift1Value: `${(coverage1 * 100).toFixed(1)}%`,
          shift2Value: `${(coverage2 * 100).toFixed(1)}%`,
          severity: coverageDiff > 0.3 ? 'high' : coverageDiff > 0.2 ? 'medium' : 'low',
        });
      }
      
      const alarmDiff = Math.abs(shift1.alarms.length - shift2.alarms.length);
      if (alarmDiff >= 2) {
        differences.push({
          type: 'alarms',
          description: `告警数量差异`,
          shift1Value: shift1.alarms.length,
          shift2Value: shift2.alarms.length,
          severity: alarmDiff > 4 ? 'high' : alarmDiff > 2 ? 'medium' : 'low',
        });
      }
      
      const duration1 = getTimeDifference(shift1.startTime, shift1.endTime);
      const duration2 = getTimeDifference(shift2.startTime, shift2.endTime);
      const durationDiff = Math.abs(duration1 - duration2);
      
      if (durationDiff > 600) {
        differences.push({
          type: 'timing',
          description: `巡逻时长差异`,
          shift1Value: `${Math.floor(duration1 / 60)}分钟`,
          shift2Value: `${Math.floor(duration2 / 60)}分钟`,
          severity: durationDiff > 1800 ? 'high' : durationDiff > 900 ? 'medium' : 'low',
        });
      }
      
      const missed1 = calculateCoverageRate(shift1, checkpoints).missed;
      const missed2 = calculateCoverageRate(shift2, checkpoints).missed;
      
      const uniqueMissed1 = missed1.filter(m => 
        !missed2.some(m2 => m2.id === m.id)
      );
      const uniqueMissed2 = missed2.filter(m => 
        !missed1.some(m2 => m2.id === m.id)
      );
      
      if (uniqueMissed1.length > 0 || uniqueMissed2.length > 0) {
        differences.push({
          type: 'route',
          description: `漏巡点位差异`,
          shift1Value: uniqueMissed1.map(m => m.name).join(', ') || '无',
          shift2Value: uniqueMissed2.map(m => m.name).join(', ') || '无',
          severity: (uniqueMissed1.length + uniqueMissed2.length) > 3 ? 'high' : 'medium',
        });
      }
    }
  }
  
  const patternAnalysis = analyzePattern(shifts, checkpoints);
  
  return {
    shiftIds: shifts.map(s => s.id),
    shiftNames: shifts.map(s => `${s.date} ${s.shiftName}`),
    coverageComparison,
    differences,
    patternAnalysis,
    generatedAt: new Date().toISOString(),
  };
};

export const analyzePattern = (
  shifts: PatrolShift[],
  checkpoints: Checkpoint[]
): PatternAnalysis => {
  const coverageRates = shifts.map(shift => 
    calculateCoverageRate(shift, checkpoints).rate
  );
  
  const averageCoverage = coverageRates.reduce((sum, r) => sum + r, 0) / coverageRates.length;
  
  const variance = coverageRates.reduce((sum, r) => 
    sum + Math.pow(r - averageCoverage, 2), 0
  ) / coverageRates.length;
  
  const consistentCoverage = Math.max(0, 1 - Math.sqrt(variance) * 2);
  
  const missedPointCounts: { [pointId: string]: number } = {};
  
  shifts.forEach(shift => {
    const { missed } = calculateCoverageRate(shift, checkpoints);
    missed.forEach(point => {
      missedPointCounts[point.id] = (missedPointCounts[point.id] || 0) + 1;
    });
  });
  
  const frequentMissedPoints = checkpoints.filter(point => {
    const missCount = missedPointCounts[point.id] || 0;
    return missCount >= shifts.length * 0.5;
  });
  
  const isSystemicIssue = frequentMissedPoints.length > 0 || averageCoverage < 0.8;
  
  const recommendations: string[] = [];
  
  if (averageCoverage < 0.8) {
    recommendations.push('整体覆盖率偏低，建议检查巡逻路线规划是否合理');
  }
  
  if (consistentCoverage < 0.7) {
    recommendations.push('班次间一致性较差，建议加强标准化作业培训');
  }
  
  frequentMissedPoints.forEach(point => {
    recommendations.push(`点位"${point.name}"频繁漏巡，建议在该区域增设巡检打卡点`);
  });
  
  if (recommendations.length === 0) {
    recommendations.push('巡逻情况良好，继续保持');
  }
  
  return {
    consistentCoverage,
    frequentMissedPoints,
    averageCoverage,
    coverageVariance: variance,
    isSystemicIssue,
    recommendations,
  };
};

export const identifyMissedPoints = (
  shift: PatrolShift,
  checkpoints: Checkpoint[]
): Checkpoint[] => {
  return calculateCoverageRate(shift, checkpoints).missed;
};

export default {
  calculateCoverageRate,
  generateHeatmap,
  generateCoverageReport,
  generateStayReport,
  generateMissedPointsReport,
  compareShifts,
  analyzePattern,
  identifyMissedPoints,
};
