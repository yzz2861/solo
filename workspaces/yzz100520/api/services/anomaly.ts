import type {
  AnomalyLevel,
  AnomalyPoint,
  Building,
  BuildingAnomalyDetail,
  BuildingAnomalySummary,
  Holiday,
  Occupancy,
  RepairRecord,
  SuspectedLeakWindow,
  WaterReading,
} from '../../shared/types';
import {
  getBuildings,
  getHolidays,
  getOccupancies,
  getRepairs,
  getWaterReadings,
} from '../data/store';

export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function isBuildingOnHoliday(buildingId: number, date: string, holidays: Holiday[]): boolean {
  return holidays.some(h => {
    const applies = h.buildingIds.length === 0 || h.buildingIds.includes(buildingId);
    return applies && dateInRange(date, h.startDate, h.endDate);
  });
}

function calcBaseline(readings: WaterReading[], period: 'day' | 'night', occupancies: Occupancy[]): number {
  const periodReadings = readings.filter(r => r.period === period);
  if (periodReadings.length === 0) return 0;
  const consumptions = periodReadings
    .map(r => {
      const occ = occupancies.find(o => o.date === r.readingDate);
      if (occ?.isVacant) return null;
      return r.consumption;
    })
    .filter((v): v is number => v != null && v >= 0);
  if (consumptions.length === 0) return 0;
  const sorted = [...consumptions].sort((a, b) => a - b);
  const mid = sorted.slice(Math.floor(sorted.length * 0.15), Math.ceil(sorted.length * 0.85));
  if (mid.length === 0) return sorted[Math.floor(sorted.length / 2)];
  return mid.reduce((a, b) => a + b, 0) / mid.length;
}

export function levelOf(deviation: number, period: 'day' | 'night'): AnomalyLevel {
  const threshold = period === 'night' ? 0.5 : 0.6;
  if (deviation >= threshold * 2) return 'severe';
  if (deviation >= threshold) return 'warning';
  return 'normal';
}

export function detectAnomalies(
  buildingId: number,
  readings: WaterReading[],
  occupancies: Occupancy[],
  repairs: RepairRecord[],
  holidays: Holiday[],
): AnomalyPoint[] {
  const baselineDay = calcBaseline(readings, 'day', occupancies);
  const baselineNight = calcBaseline(readings, 'night', occupancies);
  const result: AnomalyPoint[] = [];

  const sortedReadings = [...readings].sort(
    (a, b) => a.readingDate.localeCompare(b.readingDate) || a.period.localeCompare(b.period),
  );

  for (const r of sortedReadings) {
    if (isBuildingOnHoliday(buildingId, r.readingDate, holidays)) continue;
    const occ = occupancies.find(o => o.date === r.readingDate);
    const baseline = r.period === 'day' ? baselineDay : baselineNight;
    const expected = occ?.isVacant ? 0.5 : baseline;
    const deviation = expected > 0 ? (r.consumption - expected) / expected : r.consumption;
    const level = levelOf(deviation, r.period);

    let reason: string | undefined;
    if (r.isMeterChange) reason = '水表换表，读数已重置';
    else if (r.isReversed) reason = '读数倒挂（本次读数低于上次，可能人工录入错误或水表倒转）';
    else if (occ?.isVacant) reason = '楼栋空置期但仍有用水';
    else if (level !== 'normal') {
      const lastRepair = repairs
        .filter(rr => rr.repairDate && rr.repairDate < r.readingDate)
        .sort((a, b) => (b.repairDate || '').localeCompare(a.repairDate || ''))[0];
      if (lastRepair && r.readingDate <= addDays(lastRepair.repairDate!, 14)) {
        reason = `维修后（${lastRepair.repairDate}）仍存在异常流量`;
      } else if (r.period === 'night') {
        reason = '夜间持续不归零，疑似漏水';
      }
    }

    result.push({
      date: r.readingDate,
      period: r.period,
      consumption: r.consumption,
      expectedConsumption: Math.round(expected * 10) / 10,
      deviation: Math.round(deviation * 100) / 100,
      anomalyLevel: level,
      reason,
    });
  }
  return result;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function findSuspectedLeaks(anomalies: AnomalyPoint[]): SuspectedLeakWindow[] {
  const nights = anomalies.filter(a => a.period === 'night' && a.anomalyLevel !== 'normal');
  const windows: SuspectedLeakWindow[] = [];
  if (nights.length === 0) return windows;

  nights.sort((a, b) => a.date.localeCompare(b.date));

  let current: string[] = [nights[0].date];
  let sum = nights[0].consumption;

  for (let i = 1; i < nights.length; i++) {
    const prev = nights[i - 1].date;
    const curr = nights[i].date;
    if (curr === addDays(prev, 1)) {
      current.push(curr);
      sum += nights[i].consumption;
    } else {
      if (current.length >= 3) {
        windows.push(makeWindow(current, sum));
      }
      current = [curr];
      sum = nights[i].consumption;
    }
  }
  if (current.length >= 3) windows.push(makeWindow(current, sum));

  return windows.sort((a, b) => b.daysCount * b.avgNightConsumption - a.daysCount * a.avgNightConsumption);
}

function makeWindow(dates: string[], sum: number): SuspectedLeakWindow {
  const avg = Math.round((sum / dates.length) * 10) / 10;
  let probability: 'high' | 'medium' | 'low' = 'medium';
  if (dates.length >= 7 && avg >= 8) probability = 'high';
  else if (dates.length < 4 && avg < 5) probability = 'low';
  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    daysCount: dates.length,
    avgNightConsumption: avg,
    probability,
  };
}

export function summarizeBuildingAnomaly(
  building: Building,
  readings: WaterReading[],
  anomalies: AnomalyPoint[],
  repairs: RepairRecord[],
  holidays: Holiday[],
): BuildingAnomalySummary {
  const nightAnomalies = anomalies.filter(a => a.period === 'night');
  const recentAnomalies = nightAnomalies.slice(-14);
  const severeCount = nightAnomalies.filter(a => a.anomalyLevel === 'severe').length;
  const warnCount = nightAnomalies.filter(a => a.anomalyLevel === 'warning').length;

  let level: AnomalyLevel = 'normal';
  if (severeCount >= 3 || (severeCount >= 1 && recentAnomalies.length >= 5)) level = 'severe';
  else if (warnCount >= 5 || recentAnomalies.length >= 3) level = 'warning';

  const peak = nightAnomalies.reduce((m, a) => Math.max(m, a.consumption), 0);
  const anomalyDays = new Set(anomalies.filter(a => a.anomalyLevel !== 'normal').map(a => a.date)).size;

  const dates = [...new Set(nightAnomalies.filter(a => a.anomalyLevel !== 'normal').map(a => a.date))].sort();
  let consecutive = 0;
  if (dates.length > 0) {
    let cur = 1;
    consecutive = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] === addDays(dates[i - 1], 1)) {
        cur++;
        consecutive = Math.max(consecutive, cur);
      } else {
        cur = 1;
      }
    }
  }

  const lastRepair = repairs
    .filter(r => r.repairDate)
    .sort((a, b) => (b.repairDate || '').localeCompare(a.repairDate || ''))[0];

  const today = new Date().toISOString().slice(0, 10);
  const isOnHoliday = isBuildingOnHoliday(building.id, today, holidays);

  return {
    buildingId: building.id,
    buildingName: building.name,
    buildingCode: building.code,
    anomalyLevel: level,
    nightPeakConsumption: peak,
    anomalyDays,
    consecutiveAnomalyDays: consecutive,
    lastRepairDate: lastRepair?.repairDate || null,
    isOnHoliday,
  };
}

export function getAnomalyOverview(excludeHoliday: boolean = true): BuildingAnomalySummary[] {
  const buildings = getBuildings();
  const holidays = getHolidays();
  const result: BuildingAnomalySummary[] = [];

  for (const b of buildings) {
    const readings = getWaterReadings(b.id);
    const occupancies = getOccupancies(b.id);
    const repairs = getRepairs(b.id);
    const anomalies = detectAnomalies(b.id, readings, occupancies, repairs, holidays);
    const summary = summarizeBuildingAnomaly(b, readings, anomalies, repairs, holidays);
    if (excludeHoliday && summary.isOnHoliday) continue;
    result.push(summary);
  }

  return result.sort((a, b) => {
    const scoreA = (a.anomalyLevel === 'severe' ? 100 : a.anomalyLevel === 'warning' ? 50 : 0) + a.nightPeakConsumption * 2 + a.consecutiveAnomalyDays * 5;
    const scoreB = (b.anomalyLevel === 'severe' ? 100 : b.anomalyLevel === 'warning' ? 50 : 0) + b.nightPeakConsumption * 2 + b.consecutiveAnomalyDays * 5;
    return scoreB - scoreA;
  });
}

export function getBuildingAnomalyDetail(buildingId: number): BuildingAnomalyDetail | null {
  const building = getBuildings().find(b => b.id === buildingId);
  if (!building) return null;
  const holidays = getHolidays();
  const readings = getWaterReadings(buildingId);
  const occupancies = getOccupancies(buildingId);
  const repairs = getRepairs(buildingId);
  const anomalies = detectAnomalies(buildingId, readings, occupancies, repairs, holidays);
  const summary = summarizeBuildingAnomaly(building, readings, anomalies, repairs, holidays);
  const suspectedLeaks = findSuspectedLeaks(anomalies);
  return {
    ...summary,
    readings,
    anomalyPoints: anomalies,
    repairs,
    suspectedLeaks,
  };
}
