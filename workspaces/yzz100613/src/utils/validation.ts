import { SprintRecord, EventType } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRecord(record: Partial<SprintRecord>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.event) {
    errors.push('请选择项目');
  }

  if (record.rawTime === undefined || record.rawTime === null) {
    errors.push('请输入成绩');
  } else {
    const { valid: timeValid, warning: timeWarning } = validateTime(record.rawTime, record.event);
    if (!timeValid) {
      errors.push('成绩不在合理范围内');
    }
    if (timeWarning) {
      warnings.push(timeWarning);
    }
  }

  if (record.windSpeed !== undefined && record.windSpeed !== null) {
    const { valid: windValid, warning: windWarning } = validateWindSpeed(record.windSpeed);
    if (!windValid) {
      errors.push('风速不在合理范围内');
    }
    if (windWarning) {
      warnings.push(windWarning);
    }
  } else {
    warnings.push('风速数据缺失');
  }

  if (record.altitude !== undefined && record.altitude !== null) {
    if (!validateAltitude(record.altitude)) {
      errors.push('海拔不在合理范围内');
    }
  }

  if (record.temperature !== undefined && record.temperature !== null) {
    if (!validateTemperature(record.temperature)) {
      errors.push('温度不在合理范围内');
    }
  }

  if (record.timingMethod === 'manual' && record.manualError !== undefined) {
    if (record.manualError > 0.3) {
      warnings.push('手计误差较大，不适合精确比较');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateTime(time: number, event?: EventType): { valid: boolean; warning?: string } {
  let minTime = 5;
  let maxTime = 60;
  
  if (event === '100m') {
    minTime = 8;
    maxTime = 25;
  } else if (event === '200m') {
    minTime = 15;
    maxTime = 50;
  }

  if (time < minTime || time > maxTime) {
    return { valid: false };
  }

  if (time < minTime + 1) {
    return { valid: true, warning: '成绩非常快，请确认数据正确性' };
  }

  return { valid: true };
}

export function validateWindSpeed(wind: number): { valid: boolean; warning?: string } {
  if (wind < -10 || wind > 10) {
    return { valid: false };
  }
  if (Math.abs(wind) > 2.0) {
    return { valid: true, warning: '风速超过±2.0m/s，不适合正式比较' };
  }
  return { valid: true };
}

export function validateAltitude(altitude: number): boolean {
  return altitude >= -500 && altitude <= 5000;
}

export function validateTemperature(temp: number): boolean {
  return temp >= -30 && temp <= 50;
}

export function isOutlier(time: number, times: number[]): boolean {
  if (times.length < 3) return false;
  
  const sorted = [...times].sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
  const std = Math.sqrt(variance);
  
  if (std === 0) return false;
  
  const zScore = Math.abs((time - mean) / std);
  return zScore > 2.5;
}

export function detectOutliers(records: SprintRecord[]): string[] {
  const outlierIds: string[] = [];
  
  const byEvent: Record<string, SprintRecord[]> = {};
  records.forEach(r => {
    if (!byEvent[r.event]) byEvent[r.event] = [];
    byEvent[r.event].push(r);
  });

  Object.values(byEvent).forEach(eventRecords => {
    const times = eventRecords.map(r => r.rawTime);
    eventRecords.forEach(r => {
      if (isOutlier(r.rawTime, times)) {
        outlierIds.push(r.id);
      }
    });
  });

  return outlierIds;
}
