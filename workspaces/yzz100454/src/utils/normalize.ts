import dayjs from 'dayjs';
import type {
  PublicToilet,
  InspectionRecord,
  CleaningRecord,
  PassengerFlow,
  Complaint,
  Alias,
} from '../types';

export function buildAliasMap(aliases: Alias[]): Map<string, string> {
  const map = new Map<string, string>();
  aliases.forEach((alias) => {
    map.set(alias.aliasName.toLowerCase(), alias.toiletId);
  });
  return map;
}

export function resolveToiletId(
  name: string,
  toilets: PublicToilet[],
  aliasMap: Map<string, string>
): string | null {
  const lowerName = name.toLowerCase();
  
  const exactMatch = toilets.find(
    (t) => t.name.toLowerCase() === lowerName
  );
  if (exactMatch) return exactMatch.id;
  
  const aliasMatch = aliasMap.get(lowerName);
  if (aliasMatch) return aliasMatch;
  
  const containsMatch = toilets.find((t) =>
    t.name.toLowerCase().includes(lowerName) ||
    lowerName.includes(t.name.toLowerCase())
  );
  if (containsMatch) return containsMatch.id;
  
  return null;
}

export function normalizeTimeSlot(time: string): string {
  const d = dayjs(time);
  return d.format('YYYY-MM-DD HH');
}

export function isCrossDay(startTime: string, endTime: string): boolean {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  return !start.isSame(end, 'day');
}

export function splitByDay(startTime: string, endTime: string): { date: string; hours: number[] }[] {
  const start = dayjs(startTime);
  const end = dayjs(endTime);
  const result: { date: string; hours: number[] }[] = [];
  
  let current = start.startOf('day');
  const endDay = end.startOf('day');
  
  while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
    const dayStart = current.isSame(start, 'day') ? start : current;
    const dayEnd = current.isSame(end, 'day') ? end : current.endOf('day');
    
    const hours: number[] = [];
    let h = dayStart.hour();
    const endHour = dayEnd.hour();
    
    while (h <= endHour) {
      hours.push(h);
      h++;
    }
    
    if (hours.length > 0) {
      result.push({
        date: current.format('YYYY-MM-DD'),
        hours,
      });
    }
    
    current = current.add(1, 'day');
  }
  
  return result;
}

export function deduplicateComplaints(complaints: Complaint[]): Complaint[] {
  const seen = new Set<string>();
  return complaints.filter((c) => {
    const key = `${c.toiletId}-${c.type}-${dayjs(c.complaintTime).format('YYYY-MM-DD')}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function isDeviceOffline(
  lastReportTime: string | undefined,
  offlineThresholdHours: number = 24
): boolean {
  if (!lastReportTime) return true;
  const hoursSince = dayjs().diff(dayjs(lastReportTime), 'hour');
  return hoursSince > offlineThresholdHours;
}

export function deduplicateCleaningRecords(records: CleaningRecord[]): CleaningRecord[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = `${r.toiletId}-${dayjs(r.checkinTime).format('YYYY-MM-DD HH')}-${r.cleaner}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export interface HourlyAggregate {
  toiletId: string;
  date: string;
  hour: number;
  passengerCount: number;
  cleaningCount: number;
  complaintCount: number;
  inspectionCount: number;
}

export function aggregateByHour(
  toilets: PublicToilet[],
  inspections: InspectionRecord[],
  cleanings: CleaningRecord[],
  passengerFlows: PassengerFlow[],
  complaints: Complaint[]
): HourlyAggregate[] {
  const map = new Map<string, HourlyAggregate>();
  
  const getKey = (toiletId: string, date: string, hour: number) =>
    `${toiletId}-${date}-${hour}`;
  
  toilets.forEach((toilet) => {
    const today = dayjs().format('YYYY-MM-DD');
    for (let h = 6; h <= 22; h++) {
      const key = getKey(toilet.id, today, h);
      map.set(key, {
        toiletId: toilet.id,
        date: today,
        hour: h,
        passengerCount: 0,
        cleaningCount: 0,
        complaintCount: 0,
        inspectionCount: 0,
      });
    }
  });
  
  passengerFlows.forEach((flow) => {
    const key = getKey(flow.toiletId, flow.flowDate, flow.hour);
    const agg = map.get(key);
    if (agg) {
      agg.passengerCount += flow.count;
    } else {
      map.set(key, {
        toiletId: flow.toiletId,
        date: flow.flowDate,
        hour: flow.hour,
        passengerCount: flow.count,
        cleaningCount: 0,
        complaintCount: 0,
        inspectionCount: 0,
      });
    }
  });
  
  cleanings.forEach((clean) => {
    const time = dayjs(clean.checkinTime);
    const key = getKey(clean.toiletId, time.format('YYYY-MM-DD'), time.hour());
    const agg = map.get(key);
    if (agg) {
      agg.cleaningCount += 1;
    }
  });
  
  const uniqueComplaints = complaints.filter((c) => !c.isDuplicate);
  uniqueComplaints.forEach((comp) => {
    const time = dayjs(comp.complaintTime);
    const key = getKey(comp.toiletId, time.format('YYYY-MM-DD'), time.hour());
    const agg = map.get(key);
    if (agg) {
      agg.complaintCount += 1;
    }
  });
  
  inspections.forEach((inspect) => {
    const time = dayjs(inspect.inspectTime);
    const key = getKey(inspect.toiletId, time.format('YYYY-MM-DD'), time.hour());
    const agg = map.get(key);
    if (agg) {
      agg.inspectionCount += 1;
    }
  });
  
  return Array.from(map.values());
}

export function aggregateByDay(
  hourlyData: HourlyAggregate[]
): Map<string, Omit<HourlyAggregate, 'hour'>> {
  const dailyMap = new Map<string, Omit<HourlyAggregate, 'hour'>>();
  
  hourlyData.forEach((h) => {
    const key = `${h.toiletId}-${h.date}`;
    const existing = dailyMap.get(key);
    
    if (existing) {
      existing.passengerCount += h.passengerCount;
      existing.cleaningCount += h.cleaningCount;
      existing.complaintCount += h.complaintCount;
      existing.inspectionCount += h.inspectionCount;
    } else {
      dailyMap.set(key, {
        toiletId: h.toiletId,
        date: h.date,
        passengerCount: h.passengerCount,
        cleaningCount: h.cleaningCount,
        complaintCount: h.complaintCount,
        inspectionCount: h.inspectionCount,
      });
    }
  });
  
  return dailyMap;
}
