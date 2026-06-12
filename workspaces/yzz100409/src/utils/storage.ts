import type { DailyRecord, WeeklySummary } from '../../shared/types';

const STORAGE_KEY = 'greenhouse_irrigation_records_v1';

export const loadRecords = (): DailyRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveRecords = (records: DailyRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('保存失败', e);
  }
};

export const saveDailyRecord = (record: DailyRecord): DailyRecord[] => {
  const records = loadRecords();
  const idx = records.findIndex((r) => r.date === record.date);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...record };
  } else {
    records.push(record);
  }
  records.sort((a, b) => a.date.localeCompare(b.date));
  saveRecords(records);
  return records;
};

export const updateActualIrrigation = (
  date: string,
  actual: number | null,
  note?: string
): DailyRecord[] => {
  const records = loadRecords();
  const idx = records.findIndex((r) => r.date === date);
  if (idx >= 0) {
    records[idx].actualIrrigation = actual;
    if (note !== undefined) records[idx].note = note;
    saveRecords(records);
  }
  return records;
};

export const getRecordsByWeek = (date: string): DailyRecord[] => {
  const records = loadRecords();
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return records.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= monday.getTime() && t <= sunday.getTime();
  });
};

export const getWeekStart = (date: string): string => {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  return monday.toISOString().slice(0, 10);
};

export const getWeeklySummary = (date: string): WeeklySummary => {
  const records = getRecordsByWeek(date);
  const weekStart = getWeekStart(date);

  let totalSuggested = 0;
  let totalActual = 0;
  const daily = records.map((r) => {
    totalSuggested += r.result.grossIrrigation;
    if (r.actualIrrigation !== null) totalActual += r.actualIrrigation;
    return {
      date: r.date,
      suggested: r.result.grossIrrigation,
      actual: r.actualIrrigation,
      diff:
        r.actualIrrigation !== null
          ? Number((r.actualIrrigation - r.result.grossIrrigation).toFixed(2))
          : null,
    };
  });

  const hasActual = daily.some((d) => d.actual !== null);
  const deviationPercent =
    hasActual && totalSuggested > 0
      ? Number((((totalActual - totalSuggested) / totalSuggested) * 100).toFixed(1))
      : 0;

  let advice = '本周数据不足，请先回填每天的实际灌水量。';
  if (hasActual) {
    if (deviationPercent < -15) {
      advice = `本周实际灌溉比建议少 ${Math.abs(deviationPercent)}%，有节水成效，但需留意是否出现萎蔫，如中午叶片打卷应增加浇水量。`;
    } else if (deviationPercent < -5) {
      advice = `本周实际灌溉比建议少 ${Math.abs(deviationPercent)}%，整体合理，继续保持并观察作物状态。`;
    } else if (deviationPercent <= 5) {
      advice = `本周灌溉偏差仅 ${deviationPercent}%，与建议高度一致，执行良好！`;
    } else if (deviationPercent <= 15) {
      advice = `本周实际灌溉比建议多 ${deviationPercent}%，注意避免过量，膨果期水大会导致裂果，建议减少5%~10%。`;
    } else {
      advice = `本周实际灌溉比建议多 ${deviationPercent}%，偏多明显！请检查是否有渗漏或阀门未关严，谨防裂果和根腐。`;
    }
  }

  return {
    weekStart,
    totalSuggested: Number(totalSuggested.toFixed(2)),
    totalActual: Number(totalActual.toFixed(2)),
    deviationPercent,
    advice,
    dailyRecords: daily,
  };
};
