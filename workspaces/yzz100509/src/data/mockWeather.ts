import type { WeatherRecord, RainfallLevel } from '@/types';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const today = new Date(2026, 5, 18);
today.setHours(0, 0, 0, 0);

const records: WeatherRecord[] = [];

const rainSegments: Record<string, Record<number, { level: RainfallLevel; mm: number; stopHours?: number }>> = {
  '2026-06-05': {
    13: { level: 'light', mm: 0.8 },
    14: { level: 'moderate', mm: 3.5 },
    15: { level: 'heavy', mm: 12.3 },
    16: { level: 'heavy', mm: 15.7 },
    17: { level: 'moderate', mm: 4.2, stopHours: 3 },
    18: { level: 'light', mm: 1.1 },
    19: { level: 'light', mm: 0.5 },
  },
  '2026-06-08': {
    0: { level: 'light', mm: 0.3 },
    1: { level: 'light', mm: 0.6 },
    2: { level: 'moderate', mm: 2.8 },
    3: { level: 'moderate', mm: 3.1 },
    4: { level: 'light', mm: 0.9 },
    5: { level: 'light', mm: 0.4 },
    8: { level: 'light', mm: 0.7 },
    9: { level: 'moderate', mm: 2.4 },
    10: { level: 'moderate', mm: 3.6 },
    11: { level: 'light', mm: 1.2, stopHours: 5 },
    14: { level: 'light', mm: 0.5 },
    15: { level: 'light', mm: 0.8 },
  },
  '2026-06-12': {
    6: { level: 'light', mm: 0.6 },
    7: { level: 'moderate', mm: 4.1 },
    8: { level: 'heavy', mm: 18.5 },
    9: { level: 'heavy', mm: 22.3, stopHours: 2 },
    10: { level: 'moderate', mm: 3.8 },
    11: { level: 'light', mm: 1.3 },
  },
  '2026-06-15': {
    3: { level: 'light', mm: 0.4 },
    4: { level: 'light', mm: 0.7 },
    5: { level: 'moderate', mm: 2.9 },
    6: { level: 'moderate', mm: 3.4 },
    7: { level: 'heavy', mm: 14.6 },
    8: { level: 'heavy', mm: 16.8 },
    9: { level: 'heavy', mm: 11.2 },
    10: { level: 'moderate', mm: 4.5 },
    11: { level: 'moderate', mm: 3.1 },
    12: { level: 'light', mm: 1.4 },
    13: { level: 'light', mm: 0.8, stopHours: 4 },
    18: { level: 'light', mm: 0.5 },
    19: { level: 'moderate', mm: 2.7 },
    20: { level: 'light', mm: 1.1 },
  },
  '2026-06-17': {
    9: { level: 'light', mm: 0.6 },
    10: { level: 'moderate', mm: 3.2, stopHours: 2 },
    11: { level: 'light', mm: 0.9 },
    16: { level: 'light', mm: 0.5 },
    17: { level: 'moderate', mm: 2.8 },
    18: { level: 'light', mm: 1.0, stopHours: 1 },
  },
};

const missingHours: Set<string> = new Set([
  '2026-06-04-3',
  '2026-06-04-11',
  '2026-06-06-7',
  '2026-06-06-19',
  '2026-06-07-14',
  '2026-06-09-2',
  '2026-06-09-22',
  '2026-06-10-16',
  '2026-06-11-5',
  '2026-06-11-23',
  '2026-06-13-10',
  '2026-06-13-20',
  '2026-06-14-1',
  '2026-06-14-12',
  '2026-06-16-8',
  '2026-06-16-17',
  '2026-06-17-4',
]);

for (let i = 13; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  const dateStr = formatDate(d);

  for (let h = 0; h < 24; h++) {
    const key = `${dateStr}-${h}`;
    const isMissing = missingHours.has(key);

    if (isMissing) {
      records.push({
        date: dateStr,
        hour: h,
        rainfallLevel: 'sunny',
        rainfallMm: 0,
        rainStopTime: null,
        dataMissing: true,
      });
      continue;
    }

    const dayRain = rainSegments[dateStr];
    if (dayRain && dayRain[h]) {
      const r = dayRain[h];
      let stopTime: Date | null = null;
      if (r.stopHours !== undefined) {
        stopTime = new Date(d);
        stopTime.setHours(h + r.stopHours, 30, 0, 0);
      }
      records.push({
        date: dateStr,
        hour: h,
        rainfallLevel: r.level,
        rainfallMm: r.mm,
        rainStopTime: stopTime,
        dataMissing: false,
      });
    } else {
      records.push({
        date: dateStr,
        hour: h,
        rainfallLevel: 'sunny',
        rainfallMm: 0,
        rainStopTime: null,
        dataMissing: false,
      });
    }
  }
}

export const mockWeather: WeatherRecord[] = records;
