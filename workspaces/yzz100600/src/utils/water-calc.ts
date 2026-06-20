import type {
  InputParams,
  CalculationResult,
  CalculationWarnings,
  VolumeUnit,
  FlowUnit,
} from '@/types/water-tower';

export const toLiters = (value: number, unit: VolumeUnit): number => {
  switch (unit) {
    case 'ton':
      return value * 1000;
    case 'cubicMeter':
      return value * 1000;
    case 'liter':
      return value;
  }
};

export const toLpm = (value: number, unit: FlowUnit): number => {
  switch (unit) {
    case 'lpm':
      return value;
    case 'lph':
      return value / 60;
    case 'tph':
      return (value * 1000) / 60;
    case 'cmh':
      return (value * 1000) / 60;
  }
};

export const formatTimeOfDay = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const getTimePeriod = (date: Date): string => {
  const h = date.getHours();
  if (h >= 0 && h < 5) return '凌晨';
  if (h >= 5 && h < 9) return '清晨';
  if (h >= 9 && h < 12) return '上午';
  if (h >= 12 && h < 14) return '中午';
  if (h >= 14 && h < 18) return '下午';
  if (h >= 18 && h < 22) return '晚上';
  return '深夜';
};

export const formatDuration = (minutes: number): string => {
  const total = Math.ceil(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
};

export const formatDurationWithSeconds = (minutes: number): string => {
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}时`);
  if (m > 0) parts.push(`${m}分`);
  if (s > 0 || parts.length === 0) parts.push(`${s}秒`);
  return parts.join('');
};

const parseHHmm = (str: string): { hours: number; minutes: number } | null => {
  if (!str) return null;
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
};

const getMorningPeakDate = (timeStr: string): Date => {
  const parsed = parseHHmm(timeStr) || { hours: 7, minutes: 0 };
  const now = new Date();
  const peak = new Date(now);
  peak.setHours(parsed.hours, parsed.minutes, 0, 0);

  if (peak.getTime() <= now.getTime()) {
    peak.setDate(peak.getDate() + 1);
  }
  return peak;
};

export function calculateFillTime(params: InputParams): CalculationResult {
  const warnings: CalculationWarnings = {
    levelExceeded: false,
    zeroFlow: false,
    excessiveUsage: false,
    flowRateZero: false,
    messages: [],
  };

  const tankCapacityLiters = toLiters(params.tankCapacity, params.tankCapacityUnit);

  let currentLiters: number;
  if (params.currentLevelType === 'percent') {
    currentLiters = (params.currentWaterLevel / 100) * tankCapacityLiters;
  } else {
    currentLiters = toLiters(params.currentWaterLevel, params.currentLevelUnit);
  }

  let targetLiters: number;
  if (params.targetLevelType === 'percent') {
    targetLiters = (params.targetWaterLevel / 100) * tankCapacityLiters;
  } else {
    targetLiters = toLiters(params.targetWaterLevel, params.targetLevelUnit);
  }

  if (targetLiters > tankCapacityLiters) {
    targetLiters = tankCapacityLiters;
  }

  if (currentLiters >= targetLiters) {
    warnings.levelExceeded = true;
    warnings.messages.push('当前水位已达到或超过目标水位，无需补水');
  }

  const nominalFlowLpm = toLpm(params.pumpFlowRate, params.pumpFlowUnit);

  if (nominalFlowLpm <= 0) {
    warnings.flowRateZero = true;
    warnings.messages.push('水泵标称流量为零或非法，请检查水泵设备');
  }

  const requiredLiters = Math.max(0, targetLiters - currentLiters);

  const pipeLossRatio =
    params.pipeLossType === 'percent' ? params.pipeLoss / 100 : params.pipeLoss;
  const pipeLossAmount = nominalFlowLpm * Math.max(0, Math.min(1, pipeLossRatio));

  const concurrentUsageLpm = toLpm(params.concurrentUsage, params.concurrentUsageUnit);

  if (nominalFlowLpm > 0 && concurrentUsageLpm > nominalFlowLpm * 0.5) {
    warnings.excessiveUsage = true;
    warnings.messages.push(
      `高峰同时用水过大（${(concurrentUsageLpm / nominalFlowLpm * 100).toFixed(1)}%标称流量），建议错峰补水或增开水泵`,
    );
  }

  const netFlowLpm = nominalFlowLpm * (1 - pipeLossRatio) - concurrentUsageLpm;

  if (netFlowLpm <= 0 && !warnings.flowRateZero) {
    warnings.zeroFlow = true;
    warnings.messages.push(
      '扣除管损和同时用水后净流量≤0，当前条件无法完成补水，请降损耗或减用水',
    );
  }

  const fillMinutesExact = netFlowLpm > 0 ? requiredLiters / netFlowLpm : 0;
  const fillMinutesRounded = Math.ceil(fillMinutesExact);

  const morningPeak = getMorningPeakDate(params.morningPeakTime);
  const latestStartTime = new Date(morningPeak.getTime() - fillMinutesRounded * 60 * 1000);
  const latestStartDisplay = formatTimeOfDay(latestStartTime);
  const latestStartPeriod = getTimePeriod(latestStartTime);

  const conservativeBufferPct = 15;
  const conservativeMinutes = Math.ceil(fillMinutesExact * (1 + conservativeBufferPct / 100));
  const conservativeStartTime = new Date(
    morningPeak.getTime() - conservativeMinutes * 60 * 1000,
  );
  const conservativeStartDisplay = formatTimeOfDay(conservativeStartTime);
  const conservativeStartPeriod = getTimePeriod(conservativeStartTime);

  const hasBlockingError =
    warnings.levelExceeded || warnings.zeroFlow || warnings.flowRateZero;

  return {
    tankCapacityLiters,
    currentLiters,
    targetLiters,
    requiredLiters,

    nominalFlowLpm,
    pipeLossAmount,
    pipeLossRatio,
    concurrentUsageLpm,
    netFlowLpm,

    fillMinutesExact,
    fillMinutesRounded,
    fillDurationDisplay: formatDuration(fillMinutesExact),

    latestStartTime,
    latestStartDisplay,
    latestStartPeriod,

    conservativeBufferPct,
    conservativeMinutes,
    conservativeStartTime,
    conservativeStartDisplay,
    conservativeStartPeriod,

    warnings,
    hasBlockingError,
  };
}

export const formatLiters = (liters: number): string => {
  if (liters >= 1000) {
    const tons = liters / 1000;
    return `${tons.toFixed(tons >= 100 ? 0 : tons >= 10 ? 1 : 2)} 吨`;
  }
  return `${liters.toFixed(liters >= 100 ? 0 : 1)} 升`;
};

export const formatLpm = (lpm: number): string => {
  if (lpm >= 1000 / 60) {
    const tph = (lpm * 60) / 1000;
    return `${tph.toFixed(tph >= 100 ? 0 : tph >= 10 ? 1 : 2)} t/h`;
  }
  return `${lpm.toFixed(lpm >= 100 ? 0 : lpm >= 10 ? 1 : 2)} L/min`;
};

export const genId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
