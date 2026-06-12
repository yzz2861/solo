import type {
  TemperaturePoint,
  TemperatureUnit,
  FiringPlan,
  PlanSegment,
  FiringSegment,
  SegmentType,
  DeviationPoint,
  DeviationSeverity,
  SpecialEvent,
  FiringRecord,
} from '../types';

export const formatTimestamp = (ts: number, withTime = true): string => {
  const d = new Date(ts);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!withTime) return dateStr;
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
};

export const formatHours = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h} 小时 ${m} 分` : `${h} 小时`;
};

export const formatTemp = (t: number, unit: TemperatureUnit = 'C', withUnit = true): string => {
  const formatted = Math.round(t * 10) / 10;
  return withUnit ? `${formatted} ${unit === 'C' ? '℃' : '℉'}` : `${formatted}`;
};

export const celsiusToFahrenheit = (c: number): number => (c * 9) / 5 + 32;
export const fahrenheitToCelsius = (f: number): number => ((f - 32) * 5) / 9;

export const toCelsius = (temp: number, unit: TemperatureUnit): number =>
  unit === 'C' ? temp : fahrenheitToCelsius(temp);

export const generateId = (): string => Math.random().toString(36).slice(2, 10);

export const detectTemperatureUnit = (values: number[]): TemperatureUnit => {
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (max > 500 || avg > 200) return 'C';
  if (max < 400 && avg < 200) return 'F';
  return max > 250 ? 'C' : 'F';
};

export const calculateRates = (points: TemperaturePoint[]): TemperaturePoint[] => {
  return points.map((p, i, arr) => {
    if (i === 0 || i === arr.length - 1) {
      return { ...p, rate: 0 };
    }
    const prev = arr[i - 1];
    const next = arr[i + 1];
    const dt = (next.timestamp - prev.timestamp) / 3_600_000;
    if (dt === 0) return { ...p, rate: 0 };
    const rate = (next.temperature - prev.temperature) / dt;
    return { ...p, rate: Math.round(rate * 10) / 10 };
  });
};

export const segmentTypeNames: Record<SegmentType, string> = {
  heating: '升温段',
  holding: '保温段',
  cooling: '降温段',
};

export const segmentTypeColors: Record<SegmentType, string> = {
  heating: 'fire-500',
  holding: 'temp-peak',
  cooling: 'temp-cool',
};

export const severityColors: Record<DeviationSeverity, string> = {
  low: 'bg-green-100 text-green-700 border-green-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  high: 'bg-red-100 text-red-700 border-red-300',
};

export const detectEvents = (points: TemperaturePoint[], startAt: number): SpecialEvent[] => {
  const events: SpecialEvent[] = [];
  const medianInterval =
    points.length > 2
      ? (points[points.length - 1].timestamp - points[0].timestamp) / (points.length - 1)
      : 60_000;

  for (let i = 1; i < points.length; i++) {
    const gap = points[i].timestamp - points[i - 1].timestamp;
    if (gap > medianInterval * 5) {
      events.push({
        id: generateId(),
        timestamp: points[i - 1].timestamp,
        timeHours: (points[i - 1].timestamp - startAt) / 3_600_000,
        type: 'log_gap',
        title: '日志断点',
        description: `数据中断 ${Math.round(gap / 60000)} 分钟，可能是温控器暂停记录`,
        durationMinutes: Math.round(gap / 60000),
      });
    }
  }

  for (let i = 1; i < points.length; i++) {
    const d1 = new Date(points[i - 1].timestamp);
    const d2 = new Date(points[i].timestamp);
    if (d1.getDate() !== d2.getDate()) {
      const midnight = new Date(d2);
      midnight.setHours(0, 0, 0, 0);
      events.push({
        id: generateId(),
        timestamp: midnight.getTime(),
        timeHours: (midnight.getTime() - startAt) / 3_600_000,
        type: 'overnight',
        title: '跨夜烧成',
        description: `跨过零点，日期从 ${formatTimestamp(d1.getTime(), true)} 进入 ${formatTimestamp(d2.getTime(), true)}`,
      });
    }
  }

  return events;
};

export const generateTargetCurve = (
  plan: FiringPlan,
  points: TemperaturePoint[],
  startAt: number,
): { timeHours: number; temperature: number }[] => {
  const result: { timeHours: number; temperature: number }[] = [];

  points.forEach((p) => {
    const timeHours = (p.timestamp - startAt) / 3_600_000;
    let temp = 0;
    let found = false;

    for (let i = 0; i < plan.segments.length; i++) {
      const seg = plan.segments[i];
      if (timeHours >= seg.startTime && timeHours <= seg.endTime) {
        const segDuration = seg.endTime - seg.startTime;
        const progress = segDuration > 0 ? (timeHours - seg.startTime) / segDuration : 0;
        temp = seg.startTemp + (seg.endTemp - seg.startTemp) * progress;
        found = true;
        break;
      }
    }

    if (!found) {
      const lastSeg = plan.segments[plan.segments.length - 1];
      if (timeHours > lastSeg.endTime) {
        temp = lastSeg.endTemp;
      } else {
        const firstSeg = plan.segments[0];
        const segDuration = firstSeg.endTime - firstSeg.startTime;
        const progress = segDuration > 0 ? (timeHours - firstSeg.startTime) / segDuration : 0;
        temp = firstSeg.startTemp + (firstSeg.endTemp - firstSeg.startTemp) * Math.max(0, progress);
      }
    }

    result.push({ timeHours, temperature: Math.round(temp * 10) / 10 });
  });

  return result;
};

export const identifySegments = (
  points: TemperaturePoint[],
  plan: FiringPlan,
  targetPoints: { timeHours: number; temperature: number }[],
  startAt: number,
): FiringSegment[] => {
  if (points.length < 3) return [];

  const windowSize = Math.min(5, Math.floor(points.length / 20) || 3);
  const smoothRates: number[] = [];

  for (let i = 0; i < points.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
      if (j > 0) {
        const dt = (points[j].timestamp - points[j - 1].timestamp) / 3_600_000;
        if (dt > 0) {
          sum += (points[j].temperature - points[j - 1].temperature) / dt;
          count++;
        }
      }
    }
    smoothRates.push(count > 0 ? sum / count : 0);
  }

  const HEAT_THRESHOLD = 15;
  const COOL_THRESHOLD = -15;
  const HOLD_TEMP_MIN = 200;
  const HOLD_RATE_THRESHOLD = 10;

  const rawSegments: { type: SegmentType; startIdx: number; endIdx: number }[] = [];
  let currentType: SegmentType | null = null;
  let startIdx = 0;

  for (let i = 0; i < points.length; i++) {
    const rate = smoothRates[i];
    const temp = points[i].temperature;

    let type: SegmentType;
    if (rate > HEAT_THRESHOLD) {
      type = 'heating';
    } else if (rate < COOL_THRESHOLD) {
      type = 'cooling';
    } else if (Math.abs(rate) <= HOLD_RATE_THRESHOLD && temp >= HOLD_TEMP_MIN) {
      type = 'holding';
    } else if (rate >= 0) {
      type = 'heating';
    } else {
      type = 'cooling';
    }

    if (type !== currentType) {
      if (currentType !== null) {
        rawSegments.push({ type: currentType, startIdx, endIdx: i - 1 });
      }
      currentType = type;
      startIdx = i;
    }
  }

  if (currentType !== null && startIdx < points.length) {
    rawSegments.push({ type: currentType, startIdx, endIdx: points.length - 1 });
  }

  const MIN_POINTS = 4;
  const merged: typeof rawSegments = [];
  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    if (seg.endIdx - seg.startIdx + 1 < MIN_POINTS && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.endIdx = seg.endIdx;
      if (merged.length > 1) {
        const pPrev = merged[merged.length - 2];
        if (pPrev.type === prev.type) {
          pPrev.endIdx = prev.endIdx;
          merged.pop();
        }
      }
    } else {
      merged.push({ ...seg });
    }
  }

  const result: FiringSegment[] = merged.map((rs, index) => {
    const startPoint = points[rs.startIdx];
    const endPoint = points[rs.endIdx];
    const durationHours = (endPoint.timestamp - startPoint.timestamp) / 3_600_000;
    const tempChange = endPoint.temperature - startPoint.temperature;
    const rate = durationHours > 0 ? tempChange / durationHours : 0;

    const deviations: DeviationPoint[] = [];
    for (let i = rs.startIdx; i <= rs.endIdx; i++) {
      const actual = points[i].temperature;
      const target = targetPoints[i]?.temperature ?? actual;
      const diff = actual - target;
      const percent = target !== 0 ? Math.abs((diff / target) * 100) : 0;
      let severity: DeviationSeverity = 'low';
      if (percent > 15) severity = 'high';
      else if (percent > 5) severity = 'medium';

      deviations.push({
        timestamp: points[i].timestamp,
        timeHours: (points[i].timestamp - startAt) / 3_600_000,
        actualTemp: actual,
        targetTemp: target,
        difference: diff,
        percentage: percent,
        severity,
      });
    }

    const maxDeviation = deviations.reduce(
      (max, d) => (Math.abs(d.difference) > Math.abs(max.difference) ? d : max),
      deviations[0],
    );
    const avgDeviation =
      deviations.reduce((s, d) => s + Math.abs(d.difference), 0) / deviations.length;

    let grade: 'A' | 'B' | 'C' | 'D' = 'A';
    const avgPercent = avgDeviation / (maxDeviation?.targetTemp || 1000) * 100;
    if (avgPercent > 10) grade = 'D';
    else if (avgPercent > 5) grade = 'C';
    else if (avgPercent > 2) grade = 'B';

    let targetRate: number | undefined;
    for (const ps of plan.segments) {
      const segStart = (startPoint.timestamp - startAt) / 3_600_000;
      const segEnd = (endPoint.timestamp - startAt) / 3_600_000;
      if (segStart <= ps.endTime && segEnd >= ps.startTime) {
        targetRate = ps.rate;
        break;
      }
    }

    return {
      id: generateId(),
      type: rs.type,
      index,
      startIndex: rs.startIdx,
      endIndex: rs.endIdx,
      startTime: (startPoint.timestamp - startAt) / 3_600_000,
      endTime: (endPoint.timestamp - startAt) / 3_600_000,
      startTemp: startPoint.temperature,
      endTemp: endPoint.temperature,
      durationHours: Math.max(durationHours, 0.01),
      tempChange,
      rate: Math.round(rate * 10) / 10,
      targetRate,
      deviations,
      maxDeviationValue: maxDeviation?.difference ?? 0,
      maxDeviationTime: maxDeviation?.timestamp ?? startPoint.timestamp,
      avgDeviation: Math.round(avgDeviation * 10) / 10,
      grade,
    };
  });

  return result;
};

export const findTopDeviations = (segments: FiringSegment[], topN = 5): DeviationPoint[] => {
  const allDevs = segments.flatMap((s) => s.deviations);
  return allDevs
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, topN);
};

export const computeOverallGrade = (segments: FiringSegment[]): 'A' | 'B' | 'C' | 'D' => {
  if (segments.length === 0) return 'C';
  const gradeScores: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  const avg =
    segments.reduce((s, seg) => s + (gradeScores[seg.grade || 'C'] || 2), 0) / segments.length;
  if (avg >= 3.5) return 'A';
  if (avg >= 2.5) return 'B';
  if (avg >= 1.5) return 'C';
  return 'D';
};

export const buildCompleteRecord = (
  name: string,
  points: TemperaturePoint[],
  plan: FiringPlan,
  unit: TemperatureUnit,
): FiringRecord => {
  const startAt = points[0].timestamp;
  const endAt = points[points.length - 1].timestamp;
  const durationHours = (endAt - startAt) / 3_600_000;

  const pointsWithRates = calculateRates(points);
  const targetPoints = generateTargetCurve(plan, pointsWithRates, startAt);
  const segments = identifySegments(pointsWithRates, plan, targetPoints, startAt);
  const events = detectEvents(pointsWithRates, startAt);
  const maxDeviation = findTopDeviations(segments, 5);
  const overallGrade = computeOverallGrade(segments);

  const heatingSegs = segments.filter((s) => s.type === 'heating');
  const holdingSegs = segments.filter((s) => s.type === 'holding');
  const coolingSegs = segments.filter((s) => s.type === 'cooling');

  const avgHeatingRate =
    heatingSegs.length > 0
      ? heatingSegs.reduce((s, seg) => s + seg.rate, 0) / heatingSegs.length
      : 0;
  const totalHoldingHours = holdingSegs.reduce((s, seg) => s + seg.durationHours, 0);
  const avgCoolingRate =
    coolingSegs.length > 0
      ? coolingSegs.reduce((s, seg) => s + seg.rate, 0) / coolingSegs.length
      : 0;

  const peakPoint = points.reduce((peak, p) => (p.temperature > peak.temperature ? p : peak), points[0]);
  const allDevs = segments.flatMap((s) => s.deviations);
  const avgDeviation = allDevs.length > 0
    ? allDevs.reduce((s, d) => s + Math.abs(d.difference), 0) / allDevs.length
    : 0;
  const maxDev = maxDeviation[0] ? Math.abs(maxDeviation[0].difference) : 0;
  const highDevCount = allDevs.filter((d) => d.severity === 'high').length;
  const overnight = events.some((e) => e.type === 'overnight');
  const logGaps = events.filter((e) => e.type === 'log_gap').length;

  return {
    id: generateId(),
    name,
    startAt,
    endAt,
    durationHours,
    unit,
    logPoints: pointsWithRates,
    targetPoints,
    plan,
    segments,
    events,
    batches: [],
    maxDeviation,
    overallGrade,
    summary: {
      avgHeatingRate: Math.round(avgHeatingRate * 10) / 10,
      totalHoldingHours: Math.round(totalHoldingHours * 10) / 10,
      avgCoolingRate: Math.round(avgCoolingRate * 10) / 10,
      peakTemp: peakPoint.temperature,
      peakTime: (peakPoint.timestamp - startAt) / 3_600_000,
      avgDeviation: Math.round(avgDeviation * 10) / 10,
      maxDeviation: Math.round(maxDev * 10) / 10,
      deviationPeriods: highDevCount,
      overnight,
      logGaps,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};
