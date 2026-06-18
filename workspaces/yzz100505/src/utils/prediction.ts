import QueueRecord, { QueueStatus, IQueueRecord } from '../models/QueueRecord';
import Vehicle, { IVehicle } from '../models/Vehicle';

export interface RoutePressurePrediction {
  route: string;
  currentQueueLength: number;
  averageWaitTime: number;
  averageCompressTime: number;
  estimatedWaitTime: number;
  pressureLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
  vehicles: Array<{
    plateNumber: string;
    driverName: string;
    queuePosition: number;
    status: QueueStatus;
    waitTime: number;
  }>;
}

export interface PredictionOptions {
  route?: string;
  lookbackHours?: number;
  compressCapacity?: number;
}

export interface HistoricalStats {
  averageWaitTime: number;
  averageCompressTime: number;
  averageTotalTime: number;
  sampleCount: number;
}

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_COMPRESS_CAPACITY = 1;

export async function getRoutePressurePrediction(
  options: PredictionOptions = {}
): Promise<RoutePressurePrediction[]> {
  const { route, lookbackHours = DEFAULT_LOOKBACK_HOURS, compressCapacity = DEFAULT_COMPRESS_CAPACITY } = options;

  const activeStatuses = [QueueStatus.WAITING, QueueStatus.WEIGHING, QueueStatus.COMPRESSING];

  let activeRecordsQuery = QueueRecord.find({
    status: { $in: activeStatuses }
  }).populate('vehicleId');

  if (route) {
    const vehiclesInRoute = await Vehicle.find({ route }).select('_id');
    const vehicleIds = vehiclesInRoute.map(v => v._id);
    activeRecordsQuery = activeRecordsQuery.where('vehicleId').in(vehicleIds);
  }

  const activeRecords = await activeRecordsQuery
    .sort({ queuePosition: 1, arrivalTime: 1 })
    .lean() as Array<IQueueRecord & { vehicleId: IVehicle }>;

  const historicalStats = await getHistoricalStats({ route, lookbackHours });

  const routeGroups = groupRecordsByRoute(activeRecords);

  const predictions: RoutePressurePrediction[] = [];

  for (const [routeName, records] of routeGroups.entries()) {
    const routeStats = await getRouteHistoricalStats(routeName, lookbackHours);
    const prediction = calculateRoutePrediction(
      routeName,
      records,
      routeStats,
      compressCapacity
    );
    predictions.push(prediction);
  }

  if (route && predictions.length === 0) {
    const emptyPrediction: RoutePressurePrediction = {
      route,
      currentQueueLength: 0,
      averageWaitTime: historicalStats.averageWaitTime,
      averageCompressTime: historicalStats.averageCompressTime,
      estimatedWaitTime: 0,
      pressureLevel: 'LOW',
      suggestedAction: '当前线路无排队车辆，运行正常',
      vehicles: []
    };
    predictions.push(emptyPrediction);
  }

  return predictions.sort((a, b) => b.currentQueueLength - a.currentQueueLength);
}

export async function getHistoricalStats(
  options: PredictionOptions = {}
): Promise<HistoricalStats> {
  const { route, lookbackHours = DEFAULT_LOOKBACK_HOURS } = options;

  const startTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  let query = QueueRecord.find({
    status: QueueStatus.COMPLETED,
    exitTime: { $gte: startTime }
  });

  if (route) {
    const vehiclesInRoute = await Vehicle.find({ route }).select('_id');
    const vehicleIds = vehiclesInRoute.map(v => v._id);
    query = query.where('vehicleId').in(vehicleIds);
  }

  const records = await query
    .select('waitDuration compressDuration totalDuration')
    .lean();

  if (records.length === 0) {
    return {
      averageWaitTime: 15,
      averageCompressTime: 10,
      averageTotalTime: 25,
      sampleCount: 0
    };
  }

  const totalWaitTime = records.reduce((sum, r) => sum + (r.waitDuration || 0), 0);
  const totalCompressTime = records.reduce((sum, r) => sum + (r.compressDuration || 0), 0);
  const totalTime = records.reduce((sum, r) => sum + (r.totalDuration || 0), 0);

  return {
    averageWaitTime: Math.round(totalWaitTime / records.length),
    averageCompressTime: Math.round(totalCompressTime / records.length),
    averageTotalTime: Math.round(totalTime / records.length),
    sampleCount: records.length
  };
}

async function getRouteHistoricalStats(
  route: string,
  lookbackHours: number
): Promise<HistoricalStats> {
  return getHistoricalStats({ route, lookbackHours });
}

function groupRecordsByRoute(
  records: Array<IQueueRecord & { vehicleId: IVehicle }>
): Map<string, Array<IQueueRecord & { vehicleId: IVehicle }>> {
  const routeMap = new Map<string, Array<IQueueRecord & { vehicleId: IVehicle }>>();

  for (const record of records) {
    const routeName = record.vehicleId?.route || '未分配线路';
    if (!routeMap.has(routeName)) {
      routeMap.set(routeName, []);
    }
    routeMap.get(routeName)!.push(record);
  }

  return routeMap;
}

function calculateRoutePrediction(
  route: string,
  records: Array<IQueueRecord & { vehicleId: IVehicle }>,
  stats: HistoricalStats,
  compressCapacity: number
): RoutePressurePrediction {
  const currentQueueLength = records.length;
  const waitingVehicles = records.filter(r => r.status === QueueStatus.WAITING);
  const processingVehicles = records.filter(
    r => r.status === QueueStatus.WEIGHING || r.status === QueueStatus.COMPRESSING
  );

  const estimatedWaitTime = calculateEstimatedWaitTime(
    waitingVehicles.length,
    processingVehicles.length,
    stats.averageCompressTime,
    compressCapacity
  );

  const pressureLevel = determinePressureLevel(currentQueueLength, estimatedWaitTime);

  const vehiclesInfo = records.map(record => {
    const arrivalTime = new Date(record.arrivalTime).getTime();
    const waitTime = Math.round((Date.now() - arrivalTime) / 60000);
    return {
      plateNumber: record.vehicleId?.plateNumber || '未知',
      driverName: record.vehicleId?.driverName || '未知',
      queuePosition: record.queuePosition,
      status: record.status,
      waitTime
    };
  });

  return {
    route,
    currentQueueLength,
    averageWaitTime: stats.averageWaitTime,
    averageCompressTime: stats.averageCompressTime,
    estimatedWaitTime,
    pressureLevel,
    suggestedAction: getSuggestedAction(pressureLevel, currentQueueLength),
    vehicles: vehiclesInfo
  };
}

function calculateEstimatedWaitTime(
  waitingCount: number,
  processingCount: number,
  averageCompressTime: number,
  capacity: number
): number {
  if (waitingCount === 0) return 0;

  const effectiveProcessTime = averageCompressTime || 10;
  const processingSlots = Math.max(1, capacity);

  const processingWait = Math.ceil(processingCount / processingSlots) * effectiveProcessTime;
  const waitingWait = Math.ceil(waitingCount / processingSlots) * effectiveProcessTime;

  return Math.round(processingWait * 0.5 + waitingWait);
}

function determinePressureLevel(queueLength: number, estimatedWaitTime: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (queueLength === 0 || estimatedWaitTime < 15) {
    return 'LOW';
  } else if (estimatedWaitTime < 30) {
    return 'MEDIUM';
  } else if (estimatedWaitTime < 60) {
    return 'HIGH';
  } else {
    return 'CRITICAL';
  }
}

function getSuggestedAction(pressureLevel: string, queueLength: number): string {
  if (queueLength === 0) {
    return '当前线路无排队车辆，运行正常';
  }

  switch (pressureLevel) {
    case 'LOW':
      return '排队压力较低，运行正常';
    case 'MEDIUM':
      return '排队压力中等，建议关注后续车辆进站情况';
    case 'HIGH':
      return '排队压力较高，建议通知后续车辆晚点进站';
    case 'CRITICAL':
      return '排队压力严重！建议立即调度，通知后续车辆延迟进站或临时分流';
    default:
      return '请关注排队情况';
  }
}

export function calculateQueuePosition(currentMaxPosition: number | null): number {
  if (currentMaxPosition === null || currentMaxPosition === undefined) {
    return 1;
  }
  return currentMaxPosition + 1;
}

export async function recalculateQueuePositions(): Promise<void> {
  const activeStatuses = [QueueStatus.WAITING, QueueStatus.WEIGHING];

  const records = await QueueRecord.find({
    status: { $in: activeStatuses }
  }).sort({ arrivalTime: 1 });

  for (let i = 0; i < records.length; i++) {
    records[i].queuePosition = i + 1;
    await records[i].save();
  }
}
