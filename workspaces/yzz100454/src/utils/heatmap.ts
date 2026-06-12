import type {
  HeatmapPoint,
  PublicToilet,
  ThresholdConfig,
  AnomalyType,
  AnomalyDetail,
  DailyStats,
} from '../types';
import type { HourlyAggregate } from './normalize';
import { isDeviceOffline } from './normalize';

export const DEFAULT_THRESHOLD: ThresholdConfig = {
  minCleaningPerHour: 0.3,
  highComplaintThreshold: 2,
  missingCheckinDays: 2,
  deviceOfflineHours: 24,
  heatLevelWeights: {
    passenger: 0.5,
    cleaning: -0.3,
    complaint: 0.4,
  },
};

export function calculateHeatLevel(
  passengerCount: number,
  cleaningCount: number,
  complaintCount: number,
  maxPassenger: number
): 1 | 2 | 3 | 4 | 5 {
  if (maxPassenger === 0) return 1;

  const normalizedPassenger = passengerCount / maxPassenger;
  const normalizedCleaning = Math.min(cleaningCount / 3, 1);
  const normalizedComplaint = Math.min(complaintCount / 3, 1);

  const score =
    normalizedPassenger * 0.5 +
    (1 - normalizedCleaning) * 0.3 +
    normalizedComplaint * 0.4;

  if (score < 0.2) return 1;
  if (score < 0.4) return 2;
  if (score < 0.6) return 3;
  if (score < 0.8) return 4;
  return 5;
}

export function getHeatColor(level: 1 | 2 | 3 | 4 | 5): string {
  const colors = {
    1: '#22c55e',
    2: '#84cc16',
    3: '#eab308',
    4: '#f97316',
    5: '#ef4444',
  };
  return colors[level];
}

export function getHeatLabel(level: 1 | 2 | 3 | 4 | 5): string {
  const labels = {
    1: '正常',
    2: '良好',
    3: '一般',
    4: '较高',
    5: '高压',
  };
  return labels[level];
}

export function generateHeatmapPoints(
  toilets: PublicToilet[],
  hourlyData: HourlyAggregate[],
  date: string,
  hour: number
): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];

  const hourData = hourlyData.filter(
    (d) => d.date === date && d.hour === hour
  );

  const dataMap = new Map<string, HourlyAggregate>();
  hourData.forEach((d) => dataMap.set(d.toiletId, d));

  const maxPassenger = Math.max(
    ...hourData.map((d) => d.passengerCount),
    1
  );

  toilets.forEach((toilet) => {
    const data = dataMap.get(toilet.id) || {
      toiletId: toilet.id,
      date,
      hour,
      passengerCount: 0,
      cleaningCount: 0,
      complaintCount: 0,
      inspectionCount: 0,
    };

    const heatLevel = calculateHeatLevel(
      data.passengerCount,
      data.cleaningCount,
      data.complaintCount,
      maxPassenger
    );

    const anomalies = detectAnomalies(
      toilet,
      data,
      hourlyData,
      DEFAULT_THRESHOLD
    );

    points.push({
      toiletId: toilet.id,
      toiletName: toilet.name,
      latitude: toilet.latitude,
      longitude: toilet.longitude,
      timeSlot: `${date} ${String(hour).padStart(2, '0')}:00`,
      heatLevel,
      passengerCount: data.passengerCount,
      cleaningCount: data.cleaningCount,
      complaintCount: data.complaintCount,
      inspectionCount: data.inspectionCount,
      anomalies,
    });
  });

  return points;
}

function detectAnomalies(
  toilet: PublicToilet,
  hourData: HourlyAggregate,
  allHourlyData: HourlyAggregate[],
  threshold: ThresholdConfig
): AnomalyType[] {
  const anomalies: AnomalyType[] = [];

  if (hourData.passengerCount > 50 && hourData.cleaningCount < 1) {
    anomalies.push('high_flow_low_clean');
  }

  if (hourData.complaintCount >= threshold.highComplaintThreshold) {
    const toiletInspections = allHourlyData.filter(
      (d) =>
        d.toiletId === toilet.id &&
        d.date === hourData.date &&
        d.inspectionCount > 0
    );
    const hasNormalInspection = toiletInspections.some((d) => d.inspectionCount > 0);
    if (hasNormalInspection) {
      anomalies.push('high_complaint_normal_inspection');
    }
  }

  if (isDeviceOffline(toilet.lastReportTime, threshold.deviceOfflineHours)) {
    anomalies.push('device_offline');
  }

  return anomalies;
}

export function getAnomalyDetails(
  toilets: PublicToilet[],
  hourlyData: HourlyAggregate[],
  threshold: ThresholdConfig
): AnomalyDetail[] {
  const details: AnomalyDetail[] = [];

  const dailyMap = new Map<string, Map<number, HourlyAggregate[]>>();
  hourlyData.forEach((d) => {
    if (!dailyMap.has(d.toiletId)) {
      dailyMap.set(d.toiletId, new Map());
    }
    const toiletMap = dailyMap.get(d.toiletId)!;
    const dayKey = new Date(d.date).getDate();
    if (!toiletMap.has(dayKey)) {
      toiletMap.set(dayKey, []);
    }
    toiletMap.get(dayKey)!.push(d);
  });

  toilets.forEach((toilet) => {
    const toiletData = dailyMap.get(toilet.id);
    if (!toiletData) return;

    const totalPassenger = Array.from(toiletData.values())
      .flat()
      .reduce((sum, d) => sum + d.passengerCount, 0);
    const totalCleaning = Array.from(toiletData.values())
      .flat()
      .reduce((sum, d) => sum + d.cleaningCount, 0);
    const totalComplaint = Array.from(toiletData.values())
      .flat()
      .reduce((sum, d) => sum + d.complaintCount, 0);
    const daysWithCleaning = toiletData.size;
    const totalDays = 7;

    if (totalPassenger > 500 && totalCleaning < totalDays * 3) {
      details.push({
        type: 'high_flow_low_clean',
        toiletId: toilet.id,
        toiletName: toilet.name,
        description: `客流${totalPassenger}人次但仅保洁${totalCleaning}次，保洁频次不足`,
        severity: totalPassenger > 1000 ? 'high' : 'medium',
        data: { passengerCount: totalPassenger, cleaningCount: totalCleaning },
      });
    }

    if (totalComplaint >= threshold.highComplaintThreshold * 3) {
      details.push({
        type: 'high_complaint_normal_inspection',
        toiletId: toilet.id,
        toiletName: toilet.name,
        description: `本周投诉${totalComplaint}起，但巡检记录显示正常，需关注`,
        severity: totalComplaint > 10 ? 'high' : 'medium',
        data: { complaintCount: totalComplaint },
      });
    }

    if (daysWithCleaning < totalDays - threshold.missingCheckinDays) {
      const missingDays = totalDays - daysWithCleaning;
      details.push({
        type: 'missing_checkin',
        toiletId: toilet.id,
        toiletName: toilet.name,
        description: `连续${missingDays}天缺打卡`,
        severity: missingDays > 4 ? 'high' : 'medium',
        data: { missingDays },
      });
    }

    if (isDeviceOffline(toilet.lastReportTime, threshold.deviceOfflineHours)) {
      details.push({
        type: 'device_offline',
        toiletId: toilet.id,
        toiletName: toilet.name,
        description: '客流计设备离线',
        severity: 'medium',
        data: { lastReportTime: toilet.lastReportTime },
      });
    }
  });

  return details;
}

export function calculateDailyStats(
  toilets: PublicToilet[],
  hourlyData: HourlyAggregate[],
  date: string
): DailyStats {
  const dayData = hourlyData.filter((d) => d.date === date);

  const totalPassengers = dayData.reduce((sum, d) => sum + d.passengerCount, 0);
  const totalCleanings = dayData.reduce((sum, d) => sum + d.cleaningCount, 0);
  const totalComplaints = dayData.reduce((sum, d) => sum + d.complaintCount, 0);
  const totalInspections = dayData.reduce((sum, d) => sum + d.inspectionCount, 0);

  const offlineDevices = toilets.filter(
    (t) => !t.isOnline
  ).length;

  const heatmapPoints = generateHeatmapPoints(toilets, hourlyData, date, 12);
  const anomalyCount = heatmapPoints.filter(
    (p) => p.anomalies.length > 0
  ).length;

  return {
    date,
    totalPassengers,
    totalCleanings,
    totalComplaints,
    totalInspections,
    offlineDevices,
    anomalyCount,
  };
}

export function getHighFlowLowCleanToilets(
  heatmapPoints: HeatmapPoint[],
  topN: number = 10
): HeatmapPoint[] {
  return [...heatmapPoints]
    .sort((a, b) => b.passengerCount - a.passengerCount)
    .filter((p) => p.cleaningCount < 1)
    .slice(0, topN);
}

export function getHighComplaintToilets(
  heatmapPoints: HeatmapPoint[],
  topN: number = 10
): HeatmapPoint[] {
  return [...heatmapPoints]
    .sort((a, b) => b.complaintCount - a.complaintCount)
    .slice(0, topN);
}
