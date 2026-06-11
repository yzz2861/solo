import type { FermentationBatch, TemperatureLog, SugarReading, FeedingRecord, BatchStatus } from '../types';
import { detectAllAnomalies, calculateRiskLevel } from './anomalyDetector';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function matchAndCreateBatches(
  temperatureLogs: TemperatureLog[],
  sugarReadings: SugarReading[],
  feedingRecords: FeedingRecord[]
): FermentationBatch[] {
  const batches: FermentationBatch[] = [];
  
  const tankNumbers = new Set<string>();
  temperatureLogs.forEach(l => l.tankNo && tankNumbers.add(l.tankNo));
  sugarReadings.forEach(r => r.tankNo && tankNumbers.add(r.tankNo));
  feedingRecords.forEach(f => f.tankNo && tankNumbers.add(f.tankNo));
  
  if (tankNumbers.size === 0) {
    tankNumbers.add('1号');
  }
  
  for (const tankNo of tankNumbers) {
    const tankTempLogs = temperatureLogs.filter(l => !l.tankNo || l.tankNo === tankNo);
    const tankSugarReadings = sugarReadings.filter(r => !r.tankNo || r.tankNo === tankNo);
    const tankFeedingRecords = feedingRecords.filter(f => !f.tankNo || f.tankNo === tankNo);
    
    const allTimes = [
      ...tankTempLogs.map(l => l.timestamp),
      ...tankSugarReadings.map(r => r.timestamp),
      ...tankFeedingRecords.map(f => f.timestamp),
    ].sort((a, b) => a.getTime() - b.getTime());
    
    if (allTimes.length === 0) continue;
    
    const batchGroups = groupIntoBatches(allTimes);
    
    let batchCounter = 1;
    for (const group of batchGroups) {
      const startTime = group.startTime;
      const endTime = group.endTime;
      
      const batchTempLogs = tankTempLogs.filter(
        l => l.timestamp >= startTime && l.timestamp <= endTime
      );
      const batchSugarReadings = tankSugarReadings.filter(
        r => r.timestamp >= startTime && r.timestamp <= endTime
      );
      const batchFeedingRecords = tankFeedingRecords.filter(
        f => f.timestamp >= startTime && f.timestamp <= endTime
      );
      
      if (batchTempLogs.length === 0 && batchSugarReadings.length === 0) continue;
      
      const anomalies = detectAllAnomalies(batchTempLogs, batchSugarReadings, batchFeedingRecords);
      const riskLevel = calculateRiskLevel(anomalies);
      
      const status: BatchStatus = endTime < new Date() 
        ? (anomalies.length > 0 ? 'completed' : 'tasted')
        : 'ongoing';
      
      const batchNo = `${tankNo.replace(/[^\d]/g, '')}-${startTime.getFullYear()}${String(startTime.getMonth() + 1).padStart(2, '0')}${String(startTime.getDate()).padStart(2, '0')}-${batchCounter++}`;
      
      batches.push({
        id: generateId(),
        tankNo,
        batchNo,
        startTime,
        endTime,
        status,
        riskLevel,
        temperatureLogs: batchTempLogs,
        sugarReadings: batchSugarReadings,
        feedingRecords: batchFeedingRecords,
        anomalies,
      });
    }
  }
  
  return batches.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

function groupIntoBatches(times: Date[]): { startTime: Date; endTime: Date }[] {
  if (times.length === 0) return [];
  
  const groups: { startTime: Date; endTime: Date }[] = [];
  const maxGapHours = 12;
  
  let currentStart = times[0];
  let currentEnd = times[0];
  
  for (let i = 1; i < times.length; i++) {
    const gapHours = (times[i].getTime() - currentEnd.getTime()) / 3600000;
    
    if (gapHours > maxGapHours) {
      groups.push({ startTime: currentStart, endTime: currentEnd });
      currentStart = times[i];
      currentEnd = times[i];
    } else {
      currentEnd = times[i];
    }
  }
  
  groups.push({ startTime: currentStart, endTime: currentEnd });
  
  return groups;
}

export function mergeBatches(existingBatches: FermentationBatch[], newBatches: FermentationBatch[]): FermentationBatch[] {
  const merged = [...existingBatches];
  
  for (const newBatch of newBatches) {
    const existingIndex = merged.findIndex(
      b => b.tankNo === newBatch.tankNo && b.batchNo === newBatch.batchNo
    );
    
    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      merged[existingIndex] = {
        ...existing,
        temperatureLogs: [...existing.temperatureLogs, ...newBatch.temperatureLogs],
        sugarReadings: [...existing.sugarReadings, ...newBatch.sugarReadings],
        feedingRecords: [...existing.feedingRecords, ...newBatch.feedingRecords],
        endTime: newBatch.endTime || existing.endTime,
        status: newBatch.status,
      };
      
      const anomalies = detectAllAnomalies(
        merged[existingIndex].temperatureLogs,
        merged[existingIndex].sugarReadings,
        merged[existingIndex].feedingRecords
      );
      merged[existingIndex].anomalies = anomalies;
      merged[existingIndex].riskLevel = calculateRiskLevel(anomalies);
    } else {
      merged.push(newBatch);
    }
  }
  
  return merged.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export function getBatchTimeRange(batch: FermentationBatch): { start: Date; end: Date } {
  const allTimes = [
    batch.startTime,
    batch.endTime,
    ...batch.temperatureLogs.map(l => l.timestamp),
    ...batch.sugarReadings.map(r => r.timestamp),
    ...batch.feedingRecords.map(f => f.timestamp),
  ].filter(Boolean) as Date[];
  
  return {
    start: new Date(Math.min(...allTimes.map(t => t.getTime()))),
    end: new Date(Math.max(...allTimes.map(t => t.getTime()))),
  };
}
