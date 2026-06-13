import { Measurement } from '../types';

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  trendLinePoints: { x: number; y: number }[];
}

export interface GrowthAnalysis {
  growthRatePerQuarter: number;
  growthRatePerYear: number;
  rSquared: number;
  intercept: number;
  totalGrowth: number;
  measurementPeriodDays: number;
  predictedNextQuarter: number;
  predictedNextYear: number;
  trendLinePoints: { x: number; y: number }[];
}

function dateToDays(dateStr: string): number {
  const date = new Date(dateStr);
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

function daysToQuarters(days: number): number {
  return days / 91.25;
}

export function linearRegression(
  data: { x: number; y: number }[]
): RegressionResult {
  const n = data.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: data[0]?.y || 0,
      rSquared: 0,
      trendLinePoints: data.map((d) => ({ x: d.x, y: d.y })),
    };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return {
      slope: 0,
      intercept: sumY / n,
      rSquared: 0,
      trendLinePoints: data.map((d) => ({ x: d.x, y: sumY / n })),
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const ssTotal = sumYY - (sumY * sumY) / n;
  const ssResidual =
    sumYY - slope * sumXY - intercept * sumY;
  const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  const trendLinePoints = data.map((d) => ({
    x: d.x,
    y: slope * d.x + intercept,
  }));

  return {
    slope: Number(slope.toFixed(6)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    trendLinePoints,
  };
}

export function analyzeGrowthTrend(
  measurements: Measurement[]
): GrowthAnalysis | null {
  if (measurements.length < 2) {
    return null;
  }

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.measureDate).getTime() - new Date(b.measureDate).getTime()
  );

  const firstDate = dateToDays(sorted[0].measureDate);
  const dataPoints = sorted.map((m) => ({
    x: daysToQuarters(dateToDays(m.measureDate) - firstDate),
    y: m.widthMm,
  }));

  const regression = linearRegression(dataPoints);
  const lastX = dataPoints[dataPoints.length - 1].x;
  const lastY = dataPoints[dataPoints.length - 1].y;
  const firstY = dataPoints[0].y;

  const measurementPeriodDays =
    dateToDays(sorted[sorted.length - 1].measureDate) -
    dateToDays(sorted[0].measureDate);

  const totalGrowth = lastY - firstY;
  const predictedNextQuarter = regression.slope * (lastX + 1) + regression.intercept;
  const predictedNextYear = regression.slope * (lastX + 4) + regression.intercept;

  return {
    growthRatePerQuarter: Number(regression.slope.toFixed(4)),
    growthRatePerYear: Number((regression.slope * 4).toFixed(4)),
    rSquared: regression.rSquared,
    intercept: regression.intercept,
    totalGrowth: Number(totalGrowth.toFixed(4)),
    measurementPeriodDays,
    predictedNextQuarter: Number(predictedNextQuarter.toFixed(4)),
    predictedNextYear: Number(predictedNextYear.toFixed(4)),
    trendLinePoints: regression.trendLinePoints,
  };
}

export function formatRSquaredInterpretation(rSquared: number): string {
  if (rSquared >= 0.9) {
    return '趋势非常显著';
  }
  if (rSquared >= 0.7) {
    return '趋势较为显著';
  }
  if (rSquared >= 0.5) {
    return '存在一定趋势';
  }
  if (rSquared >= 0.3) {
    return '趋势不明显';
  }
  return '数据波动较大，无明显趋势';
}
