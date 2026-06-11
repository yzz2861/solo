import type { FermentationBatch, TemperatureLog, SugarReading, FeedingRecord, AnomalySegment, TastingNote } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function generateTemperatureLogs(
  baseDate: Date,
  durationHours: number,
  startTemp: number,
  pattern: 'normal' | 'heating_too_fast' | 'low_temp' | 'mixed'
): TemperatureLog[] {
  const logs: TemperatureLog[] = [];
  const totalMinutes = durationHours * 60;
  let currentTemp = startTemp;
  
  for (let i = 0; i < totalMinutes; i += 5) {
    const timestamp = addMinutes(baseDate, i);
    let temp = currentTemp;
    
    if (pattern === 'normal') {
      temp = startTemp + Math.sin(i / 120) * 0.5 + (i / totalMinutes) * 2;
    } else if (pattern === 'heating_too_fast') {
      if (i < totalMinutes * 0.2) {
        temp = startTemp + (i / (totalMinutes * 0.2)) * 5;
      } else {
        temp = startTemp + 5 + Math.sin(i / 60) * 0.3;
      }
    } else if (pattern === 'low_temp') {
      if (i < totalMinutes * 0.3) {
        temp = startTemp + (i / (totalMinutes * 0.3)) * 1.5;
      } else if (i < totalMinutes * 0.6) {
        temp = startTemp + 1.5 - (i - totalMinutes * 0.3) / 60;
      } else {
        temp = startTemp - 0.5 + Math.sin(i / 120) * 0.3;
      }
    } else if (pattern === 'mixed') {
      if (i < totalMinutes * 0.15) {
        temp = startTemp + (i / (totalMinutes * 0.15)) * 4;
      } else if (i < totalMinutes * 0.4) {
        temp = startTemp + 4 + Math.sin(i / 60) * 0.5;
      } else if (i < totalMinutes * 0.6) {
        temp = startTemp + 4 - (i - totalMinutes * 0.4) / 30;
      } else {
        temp = startTemp + Math.sin(i / 120) * 0.5 + (i - totalMinutes * 0.6) / 120;
      }
    }
    
    logs.push({
      id: generateId(),
      timestamp,
      temperature: Math.round(temp * 10) / 10,
      isBadRow: false,
      rawValue: `${timestamp.toISOString()},${temp.toFixed(1)}`,
    });
    
    currentTemp = temp;
  }
  
  logs[Math.floor(logs.length * 0.7)] = {
    ...logs[Math.floor(logs.length * 0.7)],
    isBadRow: true,
    temperature: 0,
  };
  
  return logs;
}

function generateSugarReadings(
  baseDate: Date,
  durationHours: number,
  startBrix: number,
  hasDrop: boolean = true
): SugarReading[] {
  const readings: SugarReading[] = [];
  const intervalHours = 8;
  const totalReadings = Math.floor(durationHours / intervalHours);
  
  for (let i = 0; i <= totalReadings; i++) {
    const timestamp = addHours(baseDate, i * intervalHours);
    const brix = hasDrop 
      ? startBrix - (i / totalReadings) * (startBrix - 5) + (Math.random() - 0.5) * 0.5
      : startBrix + (Math.random() - 0.5) * 0.3;
    
    const originalValue = brix.toFixed(1);
    const originalUnit = i % 3 === 0 ? '%' : 'Brix';
    readings.push({
      id: generateId(),
      timestamp,
      brix: Math.round(brix * 10) / 10,
      originalUnit,
      originalValue,
      isBadRow: false,
      rawValue: `${timestamp.toISOString()},${originalValue}`,
    });
  }
  
  if (readings.length > 2) {
    readings[1] = {
      ...readings[1],
      isBadRow: true,
      brix: 0,
    };
  }
  
  return readings;
}

function generateFeedingRecords(baseDate: Date, durationHours: number): FeedingRecord[] {
  const records: FeedingRecord[] = [];
  const feedTimes = [0, 24, 48, 72];
  
  for (const hour of feedTimes) {
    if (hour < durationHours) {
      const feedType = hour === 0 ? '酵母' : hour === 24 ? '白砂糖' : hour === 48 ? '营养盐' : '酵母';
      const amount = hour === 0 ? 0.5 : hour === 24 ? 50 : hour === 48 ? 0.2 : 0.3;
      const unit = 'kg';
      const timestamp = addHours(baseDate, hour);
      records.push({
        id: generateId(),
        timestamp,
        type: feedType,
        feedType,
        amount,
        unit,
        notes: '',
        isBadRow: false,
        rawValue: `${timestamp.toISOString()},${feedType},${amount},${unit}`,
      });
    }
  }
  
  return records;
}

function generateAnomalies(
  startTime: Date,
  durationHours: number,
  pattern: 'normal' | 'heating_too_fast' | 'low_temp' | 'mixed'
): AnomalySegment[] {
  const anomalies: AnomalySegment[] = [];
  
  if (pattern === 'heating_too_fast' || pattern === 'mixed') {
    anomalies.push({
      id: generateId(),
      type: 'heating_too_fast',
      startTime: addHours(startTime, 0),
      endTime: addHours(startTime, durationHours * 0.15),
      severity: 8,
      description: '升温太快：约18小时内升温5.2°C，升温速率0.29°C/小时',
      reviewed: false,
    });
  }
  
  if (pattern === 'low_temp' || pattern === 'mixed') {
    anomalies.push({
      id: generateId(),
      type: 'low_temp_too_long',
      startTime: addHours(startTime, durationHours * 0.4),
      endTime: addHours(startTime, durationHours * 0.65),
      severity: 6,
      description: '低温拖太久：温度低于25°C持续约6小时，最低温度23.8°C',
      reviewed: false,
    });
  }
  
  if (pattern === 'mixed') {
    anomalies.push({
      id: generateId(),
      type: 'feeding_no_response',
      startTime: addHours(startTime, 48),
      endTime: addHours(startTime, 50),
      severity: 7,
      description: '补料无响应：营养盐投料后2小时内温度和糖度均无明显变化',
      reviewed: false,
    });
  }
  
  return anomalies;
}

function generateTastingNote(hasAnomalies: boolean): TastingNote {
  if (hasAnomalies) {
    return {
      id: generateId(),
      conclusion: '酸味偏重，风味不够纯净。可能是由于发酵前期升温过快，酵母活性不稳定导致的。建议下次适当控制升温速率，保持在0.5°C/小时以内。',
      treatment: '已采取措施：1. 开启冷水循环降温 2. 补充少量酵母营养剂 3. 延长发酵时间24小时',
      score: 72,
      createdAt: new Date(),
      author: '李师傅',
    };
  } else {
    return {
      id: generateId(),
      conclusion: '风味正常，果香浓郁，酒体平衡。温度控制良好，糖度下降平稳。',
      treatment: '无需特殊处理，按常规流程进行后发酵',
      score: 90,
      createdAt: new Date(),
      author: '李师傅',
    };
  }
}

export function generateSampleBatches(): FermentationBatch[] {
  const now = new Date();
  
  const batchConfigs = [
    {
      tankNo: '1号',
      startDate: addHours(now, -72),
      durationHours: 72,
      startTemp: 25,
      startBrix: 18.5,
      pattern: 'mixed' as const,
      tasting: true,
    },
    {
      tankNo: '1号',
      startDate: addHours(now, -180),
      durationHours: 96,
      startTemp: 24.5,
      startBrix: 19.2,
      pattern: 'heating_too_fast' as const,
      tasting: true,
    },
    {
      tankNo: '2号',
      startDate: addHours(now, -96),
      durationHours: 96,
      startTemp: 25.5,
      startBrix: 17.8,
      pattern: 'low_temp' as const,
      tasting: true,
    },
    {
      tankNo: '2号',
      startDate: addHours(now, -220),
      durationHours: 84,
      startTemp: 26,
      startBrix: 18.8,
      pattern: 'normal' as const,
      tasting: true,
    },
    {
      tankNo: '3号',
      startDate: addHours(now, -36),
      durationHours: 48,
      startTemp: 25.2,
      startBrix: 19.0,
      pattern: 'normal' as const,
      tasting: false,
    },
  ];
  
  const batches: FermentationBatch[] = [];
  
  for (let i = 0; i < batchConfigs.length; i++) {
    const config = batchConfigs[i];
    const endDate = addHours(config.startDate, config.durationHours);
    const isOngoing = endDate > now;
    
    const temperatureLogs = generateTemperatureLogs(
      config.startDate,
      isOngoing ? (now.getTime() - config.startDate.getTime()) / 3600000 : config.durationHours,
      config.startTemp,
      config.pattern
    );
    
    const sugarReadings = generateSugarReadings(
      config.startDate,
      isOngoing ? (now.getTime() - config.startDate.getTime()) / 3600000 : config.durationHours,
      config.startBrix,
      config.pattern !== 'low_temp'
    );
    
    const feedingRecords = generateFeedingRecords(
      config.startDate,
      isOngoing ? (now.getTime() - config.startDate.getTime()) / 3600000 : config.durationHours
    );
    
    const anomalies = generateAnomalies(
      config.startDate,
      config.durationHours,
      config.pattern
    );
    
    const hasAnomalies = config.pattern !== 'normal';
    
    const batch: FermentationBatch = {
      id: generateId(),
      tankNo: config.tankNo,
      batchNo: `${config.tankNo.replace(/[^\d]/g, '')}-${config.startDate.getFullYear()}${String(config.startDate.getMonth() + 1).padStart(2, '0')}${String(config.startDate.getDate()).padStart(2, '0')}-${i + 1}`,
      startTime: config.startDate,
      endTime: isOngoing ? undefined : endDate,
      status: isOngoing ? 'ongoing' : (config.tasting ? 'tasted' : 'completed'),
      riskLevel: hasAnomalies ? (config.pattern === 'mixed' ? 85 : config.pattern === 'heating_too_fast' ? 70 : 55) : 15,
      temperatureLogs,
      sugarReadings,
      feedingRecords,
      anomalies,
      tastingNote: config.tasting ? generateTastingNote(hasAnomalies) : undefined,
    };
    
    batches.push(batch);
  }
  
  return batches;
}
