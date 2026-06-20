import {
  SprintRecord,
  CorrectionResult,
  EVENT_DISTANCES,
  TIMING_CORRECTIONS,
  TRACK_FACTORS,
} from '@/types';

const WIND_COEFFICIENT = 0.001;
const BASE_TEMPERATURE = 20;
const ALTITUDE_SCALE = 8500;
const WIND_LIMIT = 2.0;
const HIGH_MANUAL_ERROR = 0.3;

export function calculateCorrection(record: Partial<SprintRecord>): CorrectionResult | null {
  if (!record.rawTime || !record.event) {
    return null;
  }

  const rawTime = record.rawTime;
  const event = record.event;
  const distance = EVENT_DISTANCES[event];
  const velocity = distance / rawTime;

  const warnings: string[] = [];
  const factors: string[] = [];

  const windSpeed = record.windSpeed;
  let windCorrection = 0;
  if (windSpeed !== undefined && windSpeed !== null) {
    windCorrection = WIND_COEFFICIENT * windSpeed * distance / velocity;
    if (Math.abs(windSpeed) > WIND_LIMIT) {
      warnings.push(`风速 ${windSpeed > 0 ? '+' : ''}${windSpeed.toFixed(1)} m/s 超过±2.0m/s，不适合正式比赛比较`);
    }
    if (windSpeed > 0) {
      factors.push(`顺风 +${windSpeed.toFixed(1)} m/s，成绩被提升，修正后加 ${windCorrection.toFixed(3)}s`);
    } else if (windSpeed < 0) {
      factors.push(`逆风 ${windSpeed.toFixed(1)} m/s，成绩受影响，修正后减 ${Math.abs(windCorrection).toFixed(3)}s`);
    }
  } else {
    warnings.push('风速数据缺失，无法进行精确风阻修正');
  }

  const altitude = record.altitude ?? 0;
  const altitudeFactor = Math.exp(-altitude / ALTITUDE_SCALE);
  const altitudeCorrection = rawTime * (1 - altitudeFactor) * 0.5;
  if (altitude > 0) {
    factors.push(`海拔 ${altitude}m，空气稀薄阻力小，修正后加 ${altitudeCorrection.toFixed(3)}s`);
  } else if (altitude < 0) {
    factors.push(`海拔 ${altitude}m，空气稠密阻力大，修正后减 ${Math.abs(altitudeCorrection).toFixed(3)}s`);
  }

  const temperature = record.temperature ?? BASE_TEMPERATURE;
  const tempFactor = (BASE_TEMPERATURE + 273.15) / (temperature + 273.15);
  const tempCorrection = rawTime * (1 - tempFactor) * 0.3;
  if (temperature > BASE_TEMPERATURE) {
    factors.push(`温度 ${temperature}°C，空气密度低，修正后加 ${tempCorrection.toFixed(3)}s`);
  } else if (temperature < BASE_TEMPERATURE) {
    factors.push(`温度 ${temperature}°C，空气密度高，修正后减 ${Math.abs(tempCorrection).toFixed(3)}s`);
  }

  const trackType = record.trackType ?? 'synthetic';
  const trackFactor = TRACK_FACTORS[trackType];
  const trackCorrection = rawTime * (trackFactor - 1);
  if (trackType !== 'synthetic') {
    factors.push(`${trackType === 'cinder' ? '煤渣' : trackType === 'dirt' ? '土' : '聚氨酯'}跑道，阻力${trackFactor > 1 ? '大' : '小'}，修正${trackCorrection > 0 ? '加' : '减'} ${Math.abs(trackCorrection).toFixed(3)}s`);
  }

  const timingMethod = record.timingMethod ?? 'electronic';
  let timingCorrection = 0;
  if (timingMethod === 'manual') {
    timingCorrection = -TIMING_CORRECTIONS[event];
    const manualError = record.manualError ?? 0.2;
    if (manualError > HIGH_MANUAL_ERROR) {
      warnings.push(`手计误差估计 ${manualError}s，误差较大，不适合精确比较`);
    }
    factors.push(`手计时，扣除 ${Math.abs(timingCorrection).toFixed(2)}s 反应时差`);
  }

  const totalCorrection = windCorrection + altitudeCorrection + tempCorrection + trackCorrection + timingCorrection;
  const correctedTime = rawTime + totalCorrection;

  const isComparable = warnings.length === 0;

  return {
    originalTime: rawTime,
    correctedTime: Math.max(0, correctedTime),
    totalCorrection,
    breakdown: {
      wind: windCorrection,
      altitude: altitudeCorrection,
      temperature: tempCorrection,
      track: trackCorrection,
      timing: timingCorrection,
    },
    isComparable,
    warnings,
    factors,
  };
}

export function formatTime(seconds: number, decimals: number = 2): string {
  return seconds.toFixed(decimals);
}

export function parseTimeString(timeStr: string): number | null {
  const cleaned = timeStr.trim().replace(/秒|s$/gi, '');
  
  if (cleaned.includes('.')) {
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) return num;
  }
  
  if (cleaned.includes('\'') || cleaned.includes('"')) {
    const parts = cleaned.split(/['"]/);
    let total = 0;
    if (parts.length >= 1) total += parseFloat(parts[0]) * 60 || 0;
    if (parts.length >= 2) total += parseFloat(parts[1]) || 0;
    if (total > 0) return total;
  }
  
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) {
    return num;
  }
  
  return null;
}

export function parseWindSpeed(windStr: string): number | undefined {
  const cleaned = windStr.trim().replace(/m\/s|米\/秒/gi, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;
  return num;
}

export function getWindDirectionText(windSpeed: number): string {
  if (windSpeed > 0) return '顺风';
  if (windSpeed < 0) return '逆风';
  return '无风';
}

export function getImprovementText(originalTime: number, correctedTime: number): { improved: boolean; text: string; diff: number } {
  const diff = originalTime - correctedTime;
  const improved = diff > 0;
  return {
    improved,
    diff: Math.abs(diff),
    text: improved ? `进步 ${Math.abs(diff).toFixed(3)} 秒` : `慢了 ${Math.abs(diff).toFixed(3)} 秒`,
  };
}
