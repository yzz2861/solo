import type { TemperatureLog, SugarReading, FeedingRecord, AnomalySegment, AnomalyConfig, InflectionPoint } from '../types';
import { DEFAULT_ANOMALY_CONFIG, ANOMALY_TYPE_LABELS } from '../types';
import { addHours, getDuration } from './timeParser';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function detectHeatingTooFast(
  logs: TemperatureLog[],
  config: Partial<AnomalyConfig> = {}
): AnomalySegment[] {
  const fullConfig = { ...DEFAULT_ANOMALY_CONFIG, ...config };
  const { heatingThreshold, heatingWindowHours } = fullConfig;
  
  const anomalies: AnomalySegment[] = [];
  const sortedLogs = [...logs].filter(l => !l.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  if (sortedLogs.length < 2) return anomalies;
  
  let anomalyStart: Date | null = null;
  let maxHeatingRate = 0;
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const currentLog = sortedLogs[i];
    const windowEnd = addHours(currentLog.timestamp, heatingWindowHours);
    
    let maxTemp = currentLog.temperature;
    let maxTempTime = currentLog.timestamp;
    
    for (let j = i + 1; j < sortedLogs.length; j++) {
      if (sortedLogs[j].timestamp > windowEnd) break;
      if (sortedLogs[j].temperature > maxTemp) {
        maxTemp = sortedLogs[j].temperature;
        maxTempTime = sortedLogs[j].timestamp;
      }
    }
    
    const tempRise = maxTemp - currentLog.temperature;
    const timeDiff = (maxTempTime.getTime() - currentLog.timestamp.getTime()) / 3600000;
    const heatingRate = timeDiff > 0 ? tempRise / timeDiff : 0;
    
    if (tempRise >= heatingThreshold) {
      if (!anomalyStart) {
        anomalyStart = currentLog.timestamp;
      }
      maxHeatingRate = Math.max(maxHeatingRate, heatingRate);
      
      if (i === sortedLogs.length - 1 || (sortedLogs[i + 1].temperature - maxTemp) < heatingThreshold * 0.5) {
        const duration = getDuration(anomalyStart, maxTempTime);
        const severity = Math.min(10, Math.round(heatingRate * 2));
        anomalies.push({
          id: generateId(),
          type: 'heating_too_fast',
          startTime: anomalyStart,
          endTime: maxTempTime,
          severity,
          description: `${ANOMALY_TYPE_LABELS.heating_too_fast}：${duration.hours}小时${duration.minutes}分钟内升温${tempRise.toFixed(1)}°C，升温速率${heatingRate.toFixed(2)}°C/小时`,
          reviewed: false,
        });
        anomalyStart = null;
        maxHeatingRate = 0;
      }
    } else if (anomalyStart) {
      const duration = getDuration(anomalyStart, currentLog.timestamp);
      const severity = Math.min(10, Math.round(maxHeatingRate * 2));
      anomalies.push({
        id: generateId(),
        type: 'heating_too_fast',
        startTime: anomalyStart,
        endTime: currentLog.timestamp,
        severity,
        description: `${ANOMALY_TYPE_LABELS.heating_too_fast}：${duration.hours}小时${duration.minutes}分钟内升温${(currentLog.temperature - sortedLogs[sortedLogs.indexOf(currentLog) - 1]?.temperature || 0).toFixed(1)}°C，最大升温速率${maxHeatingRate.toFixed(2)}°C/小时`,
        reviewed: false,
      });
      anomalyStart = null;
      maxHeatingRate = 0;
    }
  }
  
  return mergeOverlappingAnomalies(anomalies);
}

export function detectLowTempTooLong(
  logs: TemperatureLog[],
  config: Partial<AnomalyConfig> = {}
): AnomalySegment[] {
  const fullConfig = { ...DEFAULT_ANOMALY_CONFIG, ...config };
  const { lowTempThreshold, lowTempDurationHours } = fullConfig;
  
  const anomalies: AnomalySegment[] = [];
  const sortedLogs = [...logs].filter(l => !l.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  if (sortedLogs.length < 2) return anomalies;
  
  let lowStart: Date | null = null;
  let minTemp = Infinity;
  let belowThresholdCount = 0;
  
  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];
    
    if (log.temperature < lowTempThreshold) {
      if (!lowStart) {
        lowStart = log.timestamp;
      }
      minTemp = Math.min(minTemp, log.temperature);
      belowThresholdCount++;
      
      if (i === sortedLogs.length - 1) {
        const duration = getDuration(lowStart, log.timestamp);
        const totalHours = duration.hours + duration.minutes / 60;
        
        if (totalHours >= lowTempDurationHours) {
          const severity = Math.min(10, Math.round(totalHours));
          anomalies.push({
            id: generateId(),
            type: 'low_temp_too_long',
            startTime: lowStart,
            endTime: log.timestamp,
            severity,
            description: `${ANOMALY_TYPE_LABELS.low_temp_too_long}：温度低于${lowTempThreshold}°C持续${duration.hours}小时${duration.minutes}分钟，最低温度${minTemp.toFixed(1)}°C`,
            reviewed: false,
          });
        }
      }
    } else {
      if (lowStart) {
        const duration = getDuration(lowStart, sortedLogs[i - 1].timestamp);
        const totalHours = duration.hours + duration.minutes / 60;
        
        if (totalHours >= lowTempDurationHours) {
          const severity = Math.min(10, Math.round(totalHours));
          anomalies.push({
            id: generateId(),
            type: 'low_temp_too_long',
            startTime: lowStart,
            endTime: sortedLogs[i - 1].timestamp,
            severity,
            description: `${ANOMALY_TYPE_LABELS.low_temp_too_long}：温度低于${lowTempThreshold}°C持续${duration.hours}小时${duration.minutes}分钟，最低温度${minTemp.toFixed(1)}°C`,
            reviewed: false,
          });
        }
        lowStart = null;
        minTemp = Infinity;
        belowThresholdCount = 0;
      }
    }
  }
  
  return anomalies;
}

export function detectFeedingNoResponse(
  logs: TemperatureLog[],
  readings: SugarReading[],
  feedings: FeedingRecord[],
  config: Partial<AnomalyConfig> = {}
): AnomalySegment[] {
  const fullConfig = { ...DEFAULT_ANOMALY_CONFIG, ...config };
  const { feedingResponseHours, feedingMinChange } = fullConfig;
  
  const anomalies: AnomalySegment[] = [];
  const sortedLogs = [...logs].filter(l => !l.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedReadings = [...readings].filter(r => !r.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  for (const feeding of feedings) {
    const responseEnd = addHours(feeding.timestamp, feedingResponseHours);
    
    const tempLogsInWindow = sortedLogs.filter(
      l => l.timestamp >= feeding.timestamp && l.timestamp <= responseEnd
    );
    
    const sugarReadingsInWindow = sortedReadings.filter(
      r => r.timestamp >= feeding.timestamp && r.timestamp <= responseEnd
    );
    
    let tempChanged = false;
    let sugarChanged = false;
    
    if (tempLogsInWindow.length >= 2) {
      const firstTemp = tempLogsInWindow[0].temperature;
      const lastTemp = tempLogsInWindow[tempLogsInWindow.length - 1].temperature;
      tempChanged = Math.abs(lastTemp - firstTemp) >= feedingMinChange;
    }
    
    if (sugarReadingsInWindow.length >= 2) {
      const firstSugar = sugarReadingsInWindow[0].brix;
      const lastSugar = sugarReadingsInWindow[sugarReadingsInWindow.length - 1].brix;
      sugarChanged = Math.abs(lastSugar - firstSugar) >= feedingMinChange;
    }
    
    if (!tempChanged && !sugarChanged) {
      const endTime = tempLogsInWindow.length > 0 
        ? tempLogsInWindow[tempLogsInWindow.length - 1].timestamp
        : responseEnd;
      
      anomalies.push({
        id: generateId(),
        type: 'feeding_no_response',
        startTime: feeding.timestamp,
        endTime,
        severity: 7,
        description: `${ANOMALY_TYPE_LABELS.feeding_no_response}：${feeding.type}投料后${feedingResponseHours}小时内温度和糖度均无明显变化`,
        reviewed: false,
      });
    }
  }
  
  return anomalies;
}

export function detectAllAnomalies(
  logs: TemperatureLog[],
  readings: SugarReading[],
  feedings: FeedingRecord[],
  config: Partial<AnomalyConfig> = {}
): AnomalySegment[] {
  const heatingAnomalies = detectHeatingTooFast(logs, config);
  const lowTempAnomalies = detectLowTempTooLong(logs, config);
  const feedingAnomalies = detectFeedingNoResponse(logs, readings, feedings, config);
  
  return [...heatingAnomalies, ...lowTempAnomalies, ...feedingAnomalies]
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function mergeOverlappingAnomalies(anomalies: AnomalySegment[]): AnomalySegment[] {
  if (anomalies.length <= 1) return anomalies;
  
  const sorted = [...anomalies].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const merged: AnomalySegment[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    if (current.startTime <= last.endTime) {
      merged[merged.length - 1] = {
        ...last,
        endTime: new Date(Math.max(last.endTime.getTime(), current.endTime.getTime())),
        severity: Math.max(last.severity, current.severity),
        description: `${last.description}；${current.description}`,
      };
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

export function detectInflectionPoints(
  logs: TemperatureLog[],
  readings: SugarReading[]
): InflectionPoint[] {
  const points: InflectionPoint[] = [];
  const sortedLogs = [...logs].filter(l => !l.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sortedReadings = [...readings].filter(r => !r.isBadRow).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  for (let i = 1; i < sortedLogs.length - 1; i++) {
    const prev = sortedLogs[i - 1];
    const curr = sortedLogs[i];
    const next = sortedLogs[i + 1];
    
    const prevDiff = curr.temperature - prev.temperature;
    const nextDiff = next.temperature - curr.temperature;
    
    if (prevDiff > 0 && nextDiff < 0 && Math.abs(prevDiff) > 0.5 && Math.abs(nextDiff) > 0.5) {
      points.push({
        timestamp: curr.timestamp,
        value: curr.temperature,
        type: 'peak',
        valueType: 'temperature',
        description: `温度峰值 ${curr.temperature.toFixed(1)}°C`,
      });
    } else if (prevDiff < 0 && nextDiff > 0 && Math.abs(prevDiff) > 0.5 && Math.abs(nextDiff) > 0.5) {
      points.push({
        timestamp: curr.timestamp,
        value: curr.temperature,
        type: 'valley',
        valueType: 'temperature',
        description: `温度谷值 ${curr.temperature.toFixed(1)}°C`,
      });
    } else if (Math.abs(nextDiff - prevDiff) > 1) {
      points.push({
        timestamp: curr.timestamp,
        value: curr.temperature,
        type: 'sudden_change',
        valueType: 'temperature',
        description: `温度突变 ${(nextDiff - prevDiff).toFixed(1)}°C`,
      });
    }
  }
  
  for (let i = 1; i < sortedReadings.length - 1; i++) {
    const prev = sortedReadings[i - 1];
    const curr = sortedReadings[i];
    const next = sortedReadings[i + 1];
    
    const prevDiff = curr.brix - prev.brix;
    const nextDiff = next.brix - curr.brix;
    
    if (Math.abs(nextDiff - prevDiff) > 1) {
      points.push({
        timestamp: curr.timestamp,
        value: curr.brix,
        type: 'sudden_change',
        valueType: 'sugar',
        description: `糖度突变 ${(nextDiff - prevDiff).toFixed(1)}°Bx`,
      });
    }
  }
  
  return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function calculateRiskLevel(anomalies: AnomalySegment[]): number {
  if (anomalies.length === 0) return 0;
  
  let riskScore = 0;
  for (const anomaly of anomalies) {
    const typeWeight = anomaly.type === 'heating_too_fast' ? 3 
      : anomaly.type === 'feeding_no_response' ? 2.5 
      : 2;
    riskScore += anomaly.severity * typeWeight;
  }
  
  return Math.min(100, Math.round(riskScore * 2));
}
