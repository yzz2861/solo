import { SprintRecord, BatchAnalysisResult, Filters } from '@/types';
import { calculateCorrection } from './correction';
import { detectOutliers } from './validation';
import { generateId } from './format';

export function analyzeRecords(records: SprintRecord[], filters: Filters): BatchAnalysisResult {
  const filtered = filterRecords(records, filters);
  
  const withCorrection = filtered
    .filter(r => !r.isExcluded)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(record => {
      const correction = calculateCorrection(record);
      return {
        ...record,
        correctedTime: correction?.correctedTime ?? record.rawTime,
      };
    });

  const missingWind = records.filter(r => r.windSpeed === undefined || r.windSpeed === null).length;
  const highErrorManual = records.filter(r => r.timingMethod === 'manual' && (r.manualError ?? 0.2) > 0.3).length;
  const outlierIds = detectOutliers(records);
  const outlierCount = outlierIds.length;
  const excludedRecords = records.filter(r => r.isExcluded).length;

  const trend = withCorrection;

  let improvement = 0;
  let improvementPercent = 0;
  let avgCorrectedTime = 0;
  let bestCorrectedTime = 0;

  if (trend.length >= 2) {
    const first = trend[0].correctedTime;
    const last = trend[trend.length - 1].correctedTime;
    improvement = first - last;
    improvementPercent = (improvement / first) * 100;
  }

  if (trend.length > 0) {
    avgCorrectedTime = trend.reduce((sum, r) => sum + r.correctedTime, 0) / trend.length;
    bestCorrectedTime = Math.min(...trend.map(r => r.correctedTime));
  }

  return {
    totalRecords: records.length,
    validRecords: withCorrection.length,
    excludedRecords,
    missingWind,
    highErrorManual,
    outlierCount,
    trend,
    improvement,
    improvementPercent,
    avgCorrectedTime,
    bestCorrectedTime,
  };
}

export function filterRecords(records: SprintRecord[], filters: Filters): SprintRecord[] {
  const outlierIds = filters.excludeOutliers ? detectOutliers(records) : [];

  return records.filter(record => {
    if (filters.eventType !== 'all' && record.event !== filters.eventType) {
      return false;
    }
    if (filters.excludeMissingWind && (record.windSpeed === undefined || record.windSpeed === null)) {
      return false;
    }
    if (filters.excludeHighError && record.timingMethod === 'manual' && (record.manualError ?? 0.2) > 0.3) {
      return false;
    }
    if (filters.excludeOutliers && outlierIds.includes(record.id)) {
      return false;
    }
    if (filters.excludeExcluded && record.isExcluded) {
      return false;
    }
    return true;
  });
}

export function generateWeekRecords(): SprintRecord[] {
  const today = new Date();
  const records: SprintRecord[] = [];
  const studentNames = ['张小明', '李华', '王芳', '陈强'];
  
  const baseTimes: Record<string, Record<string, number>> = {
    '张小明': { '100m': 12.5, '200m': 25.8 },
    '李华': { '100m': 11.8, '200m': 24.2 },
    '王芳': { '100m': 13.2, '200m': 27.5 },
    '陈强': { '100m': 12.0, '200m': 24.8 },
  };

  for (let day = 6; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];
    
    const windVariation = (Math.random() - 0.5) * 4;
    const tempVariation = 15 + Math.random() * 15;
    const altitude = 50 + Math.random() * 100;

    studentNames.forEach((name, idx) => {
      if (Math.random() > 0.3) {
        const events: Array<'100m' | '200m'> = Math.random() > 0.5 ? ['100m'] : ['100m', '200m'];
        
        events.forEach(event => {
          const baseTime = baseTimes[name][event];
          const improvement = (6 - day) * 0.02;
          const dailyVariation = (Math.random() - 0.5) * 0.3;
          const rawTime = +(baseTime - improvement + dailyVariation).toFixed(2);

          const hasWind = Math.random() > 0.15;
          const windSpeed = hasWind ? +(windVariation + (Math.random() - 0.5) * 1.5).toFixed(1) : undefined;

          const isManual = Math.random() > 0.6;
          const manualError = isManual ? +(0.15 + Math.random() * 0.2).toFixed(2) : undefined;

          records.push({
            id: generateId(),
            date: dateStr,
            event,
            rawTime,
            windSpeed,
            altitude: Math.round(altitude),
            temperature: Math.round(tempVariation),
            trackType: 'synthetic',
            timingMethod: isManual ? 'manual' : 'electronic',
            manualError,
            studentName: name,
            isExcluded: false,
          });
        });
      }
    });
  }

  return records;
}
