import type { Dish, DishRecord, DailyRecord, WasteAnalysis, PrepSuggestion, WeeklyErrorAnalysis, Unit, Weather } from '@/types';

export function toKg(qty: number, unit: Unit, dish: Dish): number {
  if (unit === 'kg') return qty;
  return qty * dish.conversionFactor;
}

export function fromKg(kg: number, unit: Unit, dish: Dish): number {
  if (unit === 'kg') return kg;
  return kg / dish.conversionFactor;
}

export function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

export function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

export function computeWasteRate(record: DishRecord, dish: Dish, allRecords: DishRecord[]): WasteAnalysis {
  const preparedKg = toKg(record.preparedQty, record.preparedUnit, dish);

  let leftoverKg: number;
  let isEstimated = false;

  if (record.missingWeight || record.leftoverQty === null) {
    isEstimated = true;
    const recent = allRecords
      .filter(r => r.dishId === dish.id && r.leftoverQty !== null && !r.missingWeight && r.date < record.date)
      .slice(-7);
    if (recent.length > 0) {
      const avgRate = recent.reduce((acc, r) => {
        const prepKg = toKg(r.preparedQty, r.preparedUnit, dish);
        const leftKg = toKg(r.leftoverQty!, r.leftoverUnit!, dish);
        return acc + (leftKg / prepKg);
      }, 0) / recent.length;
      leftoverKg = preparedKg * avgRate;
    } else {
      leftoverKg = preparedKg * 0.2;
    }
  } else {
    leftoverKg = toKg(record.leftoverQty, record.leftoverUnit!, dish);
  }

  const wasteRate = preparedKg > 0 ? (leftoverKg / preparedKg) * 100 : 0;
  const wastedCost = leftoverKg * dish.unitCost;

  return {
    date: record.date,
    dishId: dish.id,
    dishName: dish.name,
    wasteRate,
    wastedKg: leftoverKg,
    wastedCost,
    isEstimated,
    note: record.missingReason,
  };
}

export function computeAllWaste(dailyRecords: DailyRecord[], dishes: Dish[]): WasteAnalysis[] {
  const allDishRecords = dailyRecords.flatMap(d => d.dishRecords);
  const results: WasteAnalysis[] = [];

  for (const daily of dailyRecords) {
    for (const rec of daily.dishRecords) {
      const dish = dishes.find(d => d.id === rec.dishId || d.aliases.includes(rec.dishId));
      if (dish) {
        results.push(computeWasteRate(rec, dish, allDishRecords));
      }
    }
  }
  return results;
}

const WEATHER_FACTORS: Record<Weather, number> = {
  sunny: 1.0,
  rainy: 1.15,
  cloudy: 1.05,
  snowy: 1.1,
};

export function generatePrepSuggestions(
  dailyRecords: DailyRecord[],
  dishes: Dish[],
  tomorrowWeather: Weather,
  tomorrowOccupancy: number,
  tomorrowGroupGuests: number,
): PrepSuggestion[] {
  const suggestions: PrepSuggestion[] = [];
  const sorted = [...dailyRecords].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-14);

  if (recent.length === 0) {
    return dishes.map(d => ({
      dishId: d.id,
      dishName: d.name,
      suggestedQty: 0,
      suggestedUnit: d.defaultUnit,
      historicalAvg: 0,
      adjustmentReason: 'trend',
      confidence: 'low' as const,
    }));
  }

  const avgOccupancy = recent.reduce((s, r) => s + r.occupancyRate, 0) / recent.length;

  for (const dish of dishes) {
    const consumptions: number[] = [];
    const wasteRates: number[] = [];

    for (const daily of recent) {
      const rec = daily.dishRecords.find(r => r.dishId === dish.id);
      if (rec && !rec.missingWeight && rec.leftoverQty !== null) {
        const prepKg = toKg(rec.preparedQty, rec.preparedUnit, dish);
        const leftKg = toKg(rec.leftoverQty, rec.leftoverUnit!, dish);
        const consumed = Math.max(0, prepKg - leftKg);
        consumptions.push(consumed);
        wasteRates.push(leftKg / prepKg);
      }
    }

    if (consumptions.length === 0) {
      suggestions.push({
        dishId: dish.id,
        dishName: dish.name,
        suggestedQty: 0,
        suggestedUnit: dish.defaultUnit,
        historicalAvg: 0,
        adjustmentReason: 'trend',
        confidence: 'low',
      });
      continue;
    }

    const avgConsumption = consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
    const avgWasteRate = wasteRates.reduce((a, b) => a + b, 0) / wasteRates.length;
    const basePrep = avgConsumption / (1 - Math.min(avgWasteRate, 0.5));

    const weatherFactor = WEATHER_FACTORS[tomorrowWeather];
    const occupancyFactor = avgOccupancy > 0 ? tomorrowOccupancy / avgOccupancy : 1;
    const groupExtra = tomorrowGroupGuests * 0.15;

    let trendFactor = 1;
    let reason: PrepSuggestion['adjustmentReason'] = 'trend';
    if (wasteRates.length >= 3) {
      const last3 = wasteRates.slice(-3);
      const avg3 = last3.reduce((a, b) => a + b, 0) / 3;
      if (avg3 > 0.35) {
        trendFactor = 0.9;
        reason = 'trend';
      } else if (avg3 < 0.1) {
        trendFactor = 1.05;
      }
    }

    if (tomorrowWeather === 'rainy' || tomorrowWeather === 'snowy') reason = 'weather';
    else if (Math.abs(occupancyFactor - 1) > 0.15) reason = 'occupancy';
    else if (tomorrowGroupGuests > 10) reason = 'group';

    const suggestedKg = Math.max(0, basePrep * weatherFactor * occupancyFactor * trendFactor + groupExtra);
    const suggestedQty = fromKg(suggestedKg, dish.defaultUnit, dish);
    const historicalQty = fromKg(basePrep, dish.defaultUnit, dish);

    const cv = consumptions.length > 1
      ? Math.sqrt(consumptions.reduce((s, c) => s + Math.pow(c - avgConsumption, 2), 0) / consumptions.length) / avgConsumption
      : 0.5;

    const confidence = cv < 0.15 ? 'high' : cv < 0.3 ? 'medium' : 'low';

    suggestions.push({
      dishId: dish.id,
      dishName: dish.name,
      suggestedQty,
      suggestedUnit: dish.defaultUnit,
      historicalAvg: historicalQty,
      adjustmentReason: reason,
      confidence,
    });
  }

  return suggestions;
}

export function analyzeWeeklyErrors(
  wasteAnalyses: WasteAnalysis[],
  dishes: Dish[],
  weeks = 4,
): WeeklyErrorAnalysis[] {
  const results: WeeklyErrorAnalysis[] = [];
  const today = new Date();
  const currentWeek = getWeekNumber(formatDate(today));

  for (const dish of dishes) {
    const dishWastes = wasteAnalyses.filter(w => w.dishId === dish.id && !w.isEstimated);
    const weekMap = new Map<number, number[]>();

    for (const w of dishWastes) {
      const wn = getWeekNumber(w.date);
      if (wn > currentWeek - weeks && wn <= currentWeek) {
        if (!weekMap.has(wn)) weekMap.set(wn, []);
        weekMap.get(wn)!.push(w.wasteRate);
      }
    }

    const weekRates: { week: number; avg: number }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const wn = currentWeek - i;
      const rates = weekMap.get(wn) || [];
      const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      weekRates.push({ week: wn, avg });
    }

    if (weekRates.length === 0) continue;

    const recentWeeks = weekRates.slice(-4);
    const allAvgs = recentWeeks.map(w => w.avg).filter(v => v > 0);
    if (allAvgs.length === 0) continue;

    const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
    const weeklyVariance = allAvgs.length > 1
      ? Math.sqrt(allAvgs.reduce((s, v) => s + Math.pow(v - overallAvg, 2), 0) / allAvgs.length) / overallAvg
      : 0;

    const anomalyDates = dishWastes
      .filter(w => w.wasteRate > 60)
      .map(w => w.date)
      .slice(0, 5);

    let isSystematic = false;
    if (overallAvg > 30 && weeklyVariance < 0.15 && allAvgs.length >= 3) {
      isSystematic = true;
    }

    let errorTrend: WeeklyErrorAnalysis['errorTrend'] = 'stable';
    if (weekRates.length >= 2) {
      const first = weekRates[0].avg;
      const last = weekRates[weekRates.length - 1].avg;
      if (last > first * 1.2) errorTrend = 'increasing';
      else if (last < first * 0.8) errorTrend = 'decreasing';
    }

    results.push({
      dishId: dish.id,
      dishName: dish.name,
      weekNumber: currentWeek,
      avgErrorRate: overallAvg,
      errorTrend,
      isSystematic,
      anomalyDates,
    });
  }

  return results;
}

export function classifyErrorReason(daily: DailyRecord): string {
  if (daily.specialNote && (daily.specialNote.includes('取消') || daily.specialNote.includes('团队'))) {
    return '团队客变动';
  }
  if (daily.weather === 'rainy' || daily.weather === 'snowy') {
    return '天气因素';
  }
  if (daily.groupGuests > 30) {
    return '团队客影响';
  }
  return '估算偏差';
}
