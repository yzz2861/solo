import type { PatrolShift, ForbiddenZone, Checkpoint } from '@/types';
import { generateId } from './math';

const MAP_WIDTH = 100;
const MAP_HEIGHT = 80;

export const generateForbiddenZones = (): ForbiddenZone[] => {
  return [
    {
      id: 'zone-1',
      name: '景观水池',
      type: 'pool',
      polygon: [
        { x: 20, y: 20 },
        { x: 35, y: 20 },
        { x: 38, y: 35 },
        { x: 25, y: 40 },
        { x: 18, y: 32 },
      ],
      warningDistance: 3,
      height: 0.5,
    },
    {
      id: 'zone-2',
      name: '仓库A门',
      type: 'warehouse',
      polygon: [
        { x: 60, y: 15 },
        { x: 75, y: 15 },
        { x: 75, y: 25 },
        { x: 60, y: 25 },
      ],
      warningDistance: 2,
      height: 3,
    },
    {
      id: 'zone-3',
      name: '仓库B门',
      type: 'warehouse',
      polygon: [
        { x: 70, y: 55 },
        { x: 85, y: 55 },
        { x: 85, y: 65 },
        { x: 70, y: 65 },
      ],
      warningDistance: 2,
      height: 3,
    },
    {
      id: 'zone-4',
      name: '办公楼',
      type: 'building',
      polygon: [
        { x: 40, y: 50 },
        { x: 55, y: 50 },
        { x: 55, y: 70 },
        { x: 40, y: 70 },
      ],
      warningDistance: 1,
      height: 15,
    },
    {
      id: 'zone-5',
      name: '配电房',
      type: 'restricted',
      polygon: [
        { x: 10, y: 60 },
        { x: 20, y: 60 },
        { x: 20, y: 70 },
        { x: 10, y: 70 },
      ],
      warningDistance: 3,
      height: 4,
    },
  ];
};

export const generateCheckpoints = (): Checkpoint[] => {
  return [
    { id: 'cp-1', name: '正门岗亭', x: 10, y: 10, radius: 5, required: true },
    { id: 'cp-2', name: '北门入口', x: 50, y: 5, radius: 5, required: true },
    { id: 'cp-3', name: '东门通道', x: 90, y: 40, radius: 5, required: true },
    { id: 'cp-4', name: '停车场', x: 85, y: 20, radius: 5, required: true },
    { id: 'cp-5', name: '花园中央', x: 30, y: 30, radius: 5, required: true },
    { id: 'cp-6', name: '办公楼大厅', x: 47, y: 60, radius: 5, required: true },
    { id: 'cp-7', name: '后门通道', x: 50, y: 75, radius: 5, required: true },
    { id: 'cp-8', name: '西南角', x: 15, y: 75, radius: 5, required: true },
    { id: 'cp-9', name: '东南角', x: 85, y: 75, radius: 5, required: true },
    { id: 'cp-10', name: '西北角', x: 15, y: 15, radius: 5, required: true },
    { id: 'cp-11', name: '东北角', x: 85, y: 10, radius: 5, required: true },
    { id: 'cp-12', name: '中央广场', x: 50, y: 35, radius: 5, required: true },
  ];
};

const generateTrajectoryPoints = (
  shiftId: string,
  date: string,
  startTime: string,
  endTime: string,
  options?: {
    missingPoints?: boolean;
    duplicatePoints?: boolean;
    nearZones?: boolean;
    skipPoints?: string[];
  }
) => {
  const points = [];
  const startDate = new Date(`${date}T${startTime}`);
  const endDate = new Date(`${date}T${endTime}`);
  
  if (endDate < startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  const checkpoints = generateCheckpoints();
  const filteredCheckpoints = options?.skipPoints 
    ? checkpoints.filter(cp => !options.skipPoints?.includes(cp.id))
    : checkpoints;
  
  const path = [
    filteredCheckpoints[0],
    filteredCheckpoints[9],
    filteredCheckpoints[4],
    filteredCheckpoints[1],
    filteredCheckpoints[10],
    filteredCheckpoints[3],
    filteredCheckpoints[2],
    filteredCheckpoints[11],
    filteredCheckpoints[5],
    filteredCheckpoints[6],
    filteredCheckpoints[8],
    filteredCheckpoints[7],
    filteredCheckpoints[0],
  ];
  
  let currentTime = new Date(startDate);
  let pointIndex = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    
    const segmentPoints = 20 + Math.floor(Math.random() * 10);
    
    for (let j = 0; j <= segmentPoints; j++) {
      const t = j / segmentPoints;
      const x = start.x + (end.x - start.x) * t + (Math.random() - 0.5) * 2;
      const y = start.y + (end.y - start.y) * t + (Math.random() - 0.5) * 2;
      
      let finalX = x;
      let finalY = y;
      
      if (options?.nearZones && Math.random() < 0.1) {
        const zones = generateForbiddenZones();
        const zone = zones[Math.floor(Math.random() * zones.length)];
        const centerX = zone.polygon.reduce((sum, p) => sum + p.x, 0) / zone.polygon.length;
        const centerY = zone.polygon.reduce((sum, p) => sum + p.y, 0) / zone.polygon.length;
        finalX = centerX + (Math.random() - 0.5) * 4;
        finalY = centerY + (Math.random() - 0.5) * 4;
      }
      
      const shouldMiss = options?.missingPoints && Math.random() < 0.05 && pointIndex > 10;
      const shouldDuplicate = options?.duplicatePoints && Math.random() < 0.03 && pointIndex > 5;
      
      if (!shouldMiss) {
        points.push({
          id: generateId(),
          shiftId,
          x: Math.max(0, Math.min(MAP_WIDTH, finalX)),
          y: 0,
          z: Math.max(0, Math.min(MAP_HEIGHT, finalY)),
          timestamp: currentTime.toISOString(),
          speed: 0.5 + Math.random() * 1.5,
          signalStrength: 70 + Math.random() * 30,
        });
        
        if (shouldDuplicate) {
          points.push({
            id: generateId(),
            shiftId,
            x: Math.max(0, Math.min(MAP_WIDTH, finalX + 0.1)),
            y: 0,
            z: Math.max(0, Math.min(MAP_HEIGHT, finalY + 0.1)),
            timestamp: currentTime.toISOString(),
            speed: 0.5 + Math.random() * 1.5,
            signalStrength: 70 + Math.random() * 30,
          });
        }
      }
      
      pointIndex++;
      currentTime = new Date(currentTime.getTime() + 15000);
      
      if (Math.random() < 0.1) {
        const stayDuration = 30000 + Math.random() * 120000;
        for (let k = 0; k < Math.floor(stayDuration / 15000); k++) {
          currentTime = new Date(currentTime.getTime() + 15000);
          points.push({
            id: generateId(),
            shiftId,
            x: Math.max(0, Math.min(MAP_WIDTH, finalX + (Math.random() - 0.5))),
            y: 0,
            z: Math.max(0, Math.min(MAP_HEIGHT, finalY + (Math.random() - 0.5))),
            timestamp: currentTime.toISOString(),
            speed: Math.random() * 0.1,
            signalStrength: 65 + Math.random() * 35,
          });
        }
      }
      
      if (currentTime > endDate) break;
    }
    
    if (currentTime > endDate) break;
  }
  
  return points;
};

const generateAlarms = (shiftId: string, points: { x: number; z: number; timestamp: string }[]) => {
  const alarms = [];
  const alarmCount = 2 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < alarmCount; i++) {
    const pointIndex = Math.floor(Math.random() * (points.length - 10)) + 5;
    const point = points[pointIndex];
    
    const levels: ('info' | 'warning' | 'critical')[] = ['info', 'warning', 'critical'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    
    const alarmTypes = [
      { code: 'MOT-001', description: '移动侦测告警' },
      { code: 'OBST-002', description: '障碍物检测' },
      { code: 'SIG-003', description: '信号异常' },
      { code: 'TEMP-004', description: '温度异常' },
      { code: 'BAT-005', description: '电池电量低' },
      { code: 'INV-006', description: '入侵检测' },
    ];
    
    const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];
    
    alarms.push({
      id: generateId(),
      shiftId,
      alarmCode: alarmType.code,
      description: alarmType.description,
      x: point.x + (Math.random() - 0.5) * 2,
      y: point.z + (Math.random() - 0.5) * 2,
      timestamp: point.timestamp,
      level,
    });
  }
  
  return alarms;
};

export const generatePatrolShifts = (): PatrolShift[] => {
  const dates = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11'];
  const shifts = ['夜班A', '夜班B'];
  
  const result: PatrolShift[] = [];
  
  dates.forEach((date, dateIndex) => {
    shifts.forEach((shiftName, shiftIndex) => {
      const id = `shift-${date}-${shiftName}`;
      const timeRange = shiftName === '夜班A'
        ? { start: '20:00:00', end: '23:59:59' }
        : { start: '00:00:00', end: '04:00:00' };
      
      const isLatest = dateIndex === dates.length - 1 && shiftIndex === shifts.length - 1;
      
      const trajectoryPoints = generateTrajectoryPoints(
        id,
        date,
        timeRange.start,
        timeRange.end,
        {
          missingPoints: isLatest,
          duplicatePoints: isLatest,
          nearZones: dateIndex >= 2,
          skipPoints: dateIndex === 1 && shiftIndex === 0 ? ['cp-7', 'cp-8'] : undefined,
        }
      );
      
      const alarms = generateAlarms(
        id,
        trajectoryPoints.map(p => ({ x: p.x, z: p.z, timestamp: p.timestamp }))
      );
      
      const actualStart = trajectoryPoints[0]?.timestamp || `${date}T${timeRange.start}`;
      const actualEnd = trajectoryPoints[trajectoryPoints.length - 1]?.timestamp || `${date}T${timeRange.end}`;
      
      result.push({
        id,
        date,
        shiftName,
        robotId: `ROBOT-${(shiftIndex % 2) + 1}`,
        startTime: actualStart,
        endTime: actualEnd,
        trajectoryPoints,
        alarms,
      });
    });
  });
  
  return result;
};

export const getMapBounds = () => ({
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  center: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
});
