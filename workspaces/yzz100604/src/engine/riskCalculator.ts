import type {
  RiskInput,
  RiskResult,
  RiskLevel,
  FactorItem,
  WarningItem,
  CalcTrace,
  TempUnit,
} from './types';
import {
  FORMULA_VERSION,
  TEMP_THRESHOLDS,
  HUMIDITY_THRESHOLDS,
  WIND_THRESHOLDS,
  PRECIP_WEIGHTS,
  SALT_MAX_OFFSET,
  SALT_DECAY_HOURS,
  RISK_LEVEL_RANGES,
} from './thresholds';
import { tempToCelsius, windToMs, clamp, roundTo } from './unitConversions';
import { predictReviewTime } from './reviewPredictor';

const estimateRoadTemp = (airC: number, windMs: number, humidity: number): number => {
  const windChill = windMs >= 3 ? -1 * (windMs / 10) : 0;
  const humidityEffect = humidity >= 90 ? -0.5 : humidity >= 70 ? -0.2 : 0;
  return roundTo(airC + windChill + humidityEffect - 1, 1);
};

const calcTempScore = (airC: number, roadC: number): number => {
  let score = 0;
  const avgTemp = (airC + roadC) / 2;

  if (avgTemp <= TEMP_THRESHOLDS.DANGER_MAX) {
    score = 25;
  } else if (avgTemp <= TEMP_THRESHOLDS.WARNING_MAX) {
    const ratio = (TEMP_THRESHOLDS.WARNING_MAX - avgTemp) / (TEMP_THRESHOLDS.WARNING_MAX - TEMP_THRESHOLDS.DANGER_MAX);
    score = 18 + ratio * 7;
  } else if (avgTemp <= TEMP_THRESHOLDS.CAUTION_MAX) {
    const ratio = (TEMP_THRESHOLDS.CAUTION_MAX - avgTemp) / (TEMP_THRESHOLDS.CAUTION_MAX - TEMP_THRESHOLDS.WARNING_MAX);
    score = 10 + ratio * 8;
  } else if (avgTemp < TEMP_THRESHOLDS.SAFE_MIN) {
    const ratio = (TEMP_THRESHOLDS.SAFE_MIN - avgTemp) / (TEMP_THRESHOLDS.SAFE_MIN - TEMP_THRESHOLDS.CAUTION_MAX);
    score = 2 + ratio * 8;
  } else {
    score = 0;
  }

  if (roadC <= 0) score += 3;
  if (airC <= 0) score += 2;

  return clamp(roundTo(score, 1), 0, 25);
};

const calcHumidityScore = (humidity: number): number => {
  let score = 0;
  if (humidity >= HUMIDITY_THRESHOLDS.HIGH) {
    score = 20;
  } else if (humidity >= HUMIDITY_THRESHOLDS.MEDIUM) {
    const ratio = (humidity - HUMIDITY_THRESHOLDS.MEDIUM) / (HUMIDITY_THRESHOLDS.HIGH - HUMIDITY_THRESHOLDS.MEDIUM);
    score = 10 + ratio * 10;
  } else if (humidity >= HUMIDITY_THRESHOLDS.LOW) {
    const ratio = (humidity - HUMIDITY_THRESHOLDS.LOW) / (HUMIDITY_THRESHOLDS.MEDIUM - HUMIDITY_THRESHOLDS.LOW);
    score = 3 + ratio * 7;
  } else {
    score = 0;
  }
  return clamp(roundTo(score, 1), 0, 20);
};

const calcWindScore = (windMs: number, airC: number): number => {
  let baseScore = 0;
  if (windMs >= WIND_THRESHOLDS.STRONG) {
    baseScore = 20;
  } else if (windMs >= WIND_THRESHOLDS.MEDIUM) {
    const ratio = (windMs - WIND_THRESHOLDS.MEDIUM) / (WIND_THRESHOLDS.STRONG - WIND_THRESHOLDS.MEDIUM);
    baseScore = 10 + ratio * 10;
  } else if (windMs >= WIND_THRESHOLDS.LIGHT) {
    const ratio = (windMs - WIND_THRESHOLDS.LIGHT) / (WIND_THRESHOLDS.MEDIUM - WIND_THRESHOLDS.LIGHT);
    baseScore = 3 + ratio * 7;
  } else {
    baseScore = 0;
  }

  if (airC <= 0) baseScore *= 1.2;
  if (airC <= -5) baseScore *= 1.1;

  return clamp(roundTo(baseScore, 1), 0, 20);
};

const calcSaltMitigation = (
  saltAmount: number,
  lastSaltHours: number | undefined,
  airC: number,
): { score: number; correctionApplied: boolean } => {
  if (saltAmount <= 0) return { score: 0, correctionApplied: false };

  let baseMitigation = (saltAmount / 200) * SALT_MAX_OFFSET;

  let decayFactor = 1;
  let correctionApplied = false;
  if (lastSaltHours && lastSaltHours > 0) {
    decayFactor = Math.max(0, 1 - lastSaltHours / SALT_DECAY_HOURS);
    if (airC < 0 && lastSaltHours > 2) {
      decayFactor *= 0.7;
      correctionApplied = true;
    }
  }

  const finalScore = roundTo(baseMitigation * decayFactor, 1);
  return { score: clamp(finalScore, 0, SALT_MAX_OFFSET), correctionApplied };
};

const mapScoreToLevel = (score: number): RiskLevel => {
  if (score >= RISK_LEVEL_RANGES.danger[0]) return 'danger';
  if (score >= RISK_LEVEL_RANGES.warning[0]) return 'warning';
  if (score >= RISK_LEVEL_RANGES.caution[0]) return 'caution';
  return 'safe';
};

export const calculateRisk = (input: RiskInput): RiskResult => {
  const warnings: WarningItem[] = [];
  let missingDataFallback: string | null = null;

  const airC = roundTo(tempToCelsius(input.airTemp, input.airTempUnit), 1);
  let roadC: number;

  const roadTempUnit: TempUnit = input.roadTempUnit ?? 'C';
  if (input.roadTempMissing || input.roadTemp == null) {
    roadC = estimateRoadTemp(airC, windToMs(input.windSpeed, input.windUnit), input.humidity);
    missingDataFallback = `基于气温(${airC}℃)、风速(${roundTo(windToMs(input.windSpeed, input.windUnit), 1)}m/s)、湿度(${input.humidity}%)估算路表温度`;
    warnings.push({
      type: 'warning',
      code: 'MISSING_ROAD_TEMP',
      message: '巡查车路表温度数据缺失，已使用替代算法估算',
      suggestion: '建议尽快派遣巡查车实测路表温度后重新评估',
    });
  } else {
    roadC = roundTo(tempToCelsius(input.roadTemp, roadTempUnit), 1);
  }

  const windMs = roundTo(windToMs(input.windSpeed, input.windUnit), 2);
  const humidity = clamp(input.humidity, 0, 100);
  const precipWeight = PRECIP_WEIGHTS[input.precipitation];
  const saltAmount = clamp(input.saltAmount, 0, 200);

  const tempScore = calcTempScore(airC, roadC);
  const humidityScore = calcHumidityScore(humidity);
  const windScore = calcWindScore(windMs, airC);
  const precipScore = clamp(precipWeight * 0.8, 0, 20);
  const { score: saltScore, correctionApplied } = calcSaltMitigation(saltAmount, input.lastSaltHours, airC);

  if (correctionApplied) {
    warnings.push({
      type: 'warning',
      code: 'SALT_DECAYING',
      message: '撒盐后持续降温，除冰效果存在衰减风险',
      suggestion: '如条件允许，建议追加撒盐量或缩短复查间隔',
    });
  }

  if (input.precipitation === 'freezing_rain' && airC <= 0) {
    warnings.push({
      type: 'danger',
      code: 'FREEZING_RAIN_ALERT',
      message: '冻雨天气且气温低于0℃，路面将快速结冰',
      suggestion: '立即启动最高优先级撒盐作业，必要时封闭交通',
    });
  }

  if (airC <= -5 && humidity >= 90) {
    warnings.push({
      type: 'info',
      code: 'BLACK_ICE_RISK',
      message: '低温高湿条件，存在黑冰（暗冰）隐蔽风险',
      suggestion: '巡查时重点关注桥面阴影区域、坡道、弯道等易结冰部位',
    });
  }

  const rawScore = tempScore + humidityScore + windScore + precipScore - saltScore;
  const finalScore = roundTo(clamp(rawScore, 0, 100), 1);
  const level = mapScoreToLevel(finalScore);
  const reviewMinutes = predictReviewTime(level, windMs, precipWeight, finalScore);

  const precipScore20 = roundTo(precipScore, 1);
  const tempW = 25;
  const humidW = 20;
  const windW = 20;
  const precipW = 20;
  const saltW = saltScore;

  const rawFactors: Omit<FactorItem, 'highlight'>[] = [
    { name: '气温/路表', weight: tempW, contribution: tempScore, value: `${airC}℃/${roadC}℃` },
    { name: '湿度', weight: humidW, contribution: humidityScore, value: `${humidity}%` },
    { name: '风速风寒', weight: windW, contribution: windScore, value: `${windMs}m/s` },
    { name: '降水类型', weight: precipW, contribution: precipScore20, value: input.precipitation },
  ];

  if (saltW > 0) {
    rawFactors.push({ name: '撒盐抵消', weight: 15, contribution: -saltW, value: `${saltAmount}g/㎡` });
  }

  const totalAbs = rawFactors.reduce((sum, f) => sum + Math.abs(f.contribution), 0) || 1;
  const sortedFactors = [...rawFactors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const keyFactors: FactorItem[] = sortedFactors
    .slice(0, 4)
    .map((f, idx) => ({
      ...f,
      highlight: idx < 3 && Math.abs(f.contribution) / totalAbs > 0.15,
    }));

  if (saltW > 0 && saltW >= SALT_MAX_OFFSET * 0.7) {
    warnings.push({
      type: 'info',
      code: 'HIGH_SALT_AMOUNT',
      message: '撒盐量接近上限阈值，请注意环境影响评估',
      suggestion: '优先采用机械除冰+适量撒盐结合的方式，避免过度用盐',
    });
  }

  if (level === 'danger') {
    warnings.unshift({
      type: 'danger',
      code: 'URGENT_ACTION',
      message: '桥面处于高度结冰风险状态',
      suggestion: '立即启动应急响应，调度最近撒盐车赶往现场，同步通知交管部门',
    });
  }

  const calcTrace: CalcTrace = {
    formulaVersion: FORMULA_VERSION,
    normalizedParams: {
      airTemp_C: airC,
      roadTemp_C: roadC,
      humidity_pct: humidity,
      windSpeed_mps: windMs,
      precipWeight,
      saltAmount_gsm: saltAmount,
      lastSaltHours: input.lastSaltHours ?? 0,
    },
    intermediateScores: {
      tempScore,
      humidityScore,
      windScore,
      precipScore: precipScore20,
      saltMitigation: -saltScore,
      rawScore: roundTo(rawScore, 1),
      finalScore,
    },
    thresholdsUsed: {
      temp: TEMP_THRESHOLDS,
      humidity: HUMIDITY_THRESHOLDS,
      wind: WIND_THRESHOLDS,
      precip: PRECIP_WEIGHTS,
      riskRanges: RISK_LEVEL_RANGES,
    },
    saltCorrectionApplied: correctionApplied,
    missingDataFallback,
  };

  return {
    level,
    score: finalScore,
    reviewMinutes,
    urgent: level === 'danger' || (level === 'warning' && finalScore >= 68),
    keyFactors,
    warnings,
    calcTrace,
    timestamp: Date.now(),
  };
};
