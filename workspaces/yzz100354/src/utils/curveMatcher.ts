import type { FermentationBatch, CurveFeature, SimilarBatchResult, TemperatureLog, SugarReading } from '../types';

function normalize(data: number[]): number[] {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data.map(v => (v - min) / range);
}

function resample(data: { timestamp: Date; value: number }[], targetLength: number = 50): number[] {
  if (data.length === 0) return Array(targetLength).fill(0);
  if (data.length === 1) return Array(targetLength).fill(data[0].value);
  
  const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const startTime = sorted[0].timestamp.getTime();
  const endTime = sorted[sorted.length - 1].timestamp.getTime();
  const duration = endTime - startTime || 1;
  
  const result: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const targetTime = startTime + (duration * i) / (targetLength - 1);
    
    let leftIdx = 0;
    let rightIdx = sorted.length - 1;
    
    for (let j = 0; j < sorted.length; j++) {
      if (sorted[j].timestamp.getTime() <= targetTime) {
        leftIdx = j;
      }
      if (sorted[j].timestamp.getTime() >= targetTime) {
        rightIdx = j;
        break;
      }
    }
    
    if (leftIdx === rightIdx) {
      result.push(sorted[leftIdx].value);
    } else {
      const leftTime = sorted[leftIdx].timestamp.getTime();
      const rightTime = sorted[rightIdx].timestamp.getTime();
      const t = (targetTime - leftTime) / (rightTime - leftTime || 1);
      result.push(sorted[leftIdx].value + t * (sorted[rightIdx].value - sorted[leftIdx].value));
    }
  }
  
  return result;
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
}

function dtwDistance(seq1: number[], seq2: number[]): number {
  const n = seq1.length;
  const m = seq2.length;
  
  const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
      dtw[i][j] = cost + Math.min(
        dtw[i - 1][j],
        dtw[i][j - 1],
        dtw[i - 1][j - 1]
      );
    }
  }
  
  return dtw[n][m];
}

export function extractCurveFeatures(batch: FermentationBatch): CurveFeature {
  const tempLogs = batch.temperatureLogs.filter(l => !l.isBadRow);
  const sugarReadings = batch.sugarReadings.filter(r => !r.isBadRow);
  
  const tempValues = tempLogs.map(l => l.temperature);
  const sugarValues = sugarReadings.map(r => r.brix);
  
  const avgTemp = tempValues.length > 0 
    ? tempValues.reduce((a, b) => a + b, 0) / tempValues.length 
    : 0;
  
  let tempTrend = 0;
  if (tempValues.length >= 2) {
    const firstHalf = tempValues.slice(0, Math.floor(tempValues.length / 2));
    const secondHalf = tempValues.slice(Math.floor(tempValues.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    tempTrend = secondAvg - firstAvg;
  }
  
  let sugarDropRate = 0;
  if (sugarValues.length >= 2) {
    const firstSugar = sugarValues[0];
    const lastSugar = sugarValues[sugarValues.length - 1];
    const startTime = sugarReadings[0].timestamp.getTime();
    const endTime = sugarReadings[sugarReadings.length - 1].timestamp.getTime();
    const durationHours = (endTime - startTime) / 3600000;
    if (durationHours > 0) {
      sugarDropRate = (firstSugar - lastSugar) / durationHours;
    }
  }
  
  const resampledTemp = resample(
    tempLogs.map(l => ({ timestamp: l.timestamp, value: l.temperature })),
    50
  );
  const resampledSugar = resample(
    sugarReadings.map(r => ({ timestamp: r.timestamp, value: r.brix })),
    50
  );
  
  const normalizedTemp = normalize(resampledTemp);
  const normalizedSugar = normalize(resampledSugar);
  
  const featureVector = [...normalizedTemp, ...normalizedSugar, avgTemp / 50, tempTrend / 10, sugarDropRate * 10];
  
  return {
    avgTemp,
    tempTrend,
    sugarDropRate,
    featureVector,
  };
}

export function calculateSimilarity(features1: number[], features2: number[]): number {
  const cosSim = cosineSimilarity(features1, features2);
  
  const len = Math.floor(Math.min(features1.length, features2.length) / 2);
  const seq1 = features1.slice(0, len);
  const seq2 = features2.slice(0, len);
  const dtw = dtwDistance(seq1, seq2);
  const dtwSim = 1 / (1 + dtw);
  
  return (cosSim * 0.6 + dtwSim * 0.4);
}

export function findSimilarBatches(
  targetBatch: FermentationBatch,
  allBatches: FermentationBatch[],
  topK: number = 5
): SimilarBatchResult[] {
  const targetFeatures = extractCurveFeatures(targetBatch);
  
  const results: SimilarBatchResult[] = [];
  
  for (const batch of allBatches) {
    if (batch.id === targetBatch.id) continue;
    if (batch.temperatureLogs.length === 0) continue;
    
    const batchFeatures = extractCurveFeatures(batch);
    const similarity = calculateSimilarity(
      targetFeatures.featureVector,
      batchFeatures.featureVector
    );
    
    if (similarity > 0.5) {
      results.push({
        batchId: batch.id,
        similarity,
      });
    }
  }
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export function getBatchStats(batch: FermentationBatch) {
  const tempLogs = batch.temperatureLogs.filter(l => !l.isBadRow);
  const sugarReadings = batch.sugarReadings.filter(r => !r.isBadRow);
  
  const temps = tempLogs.map(l => l.temperature);
  const sugars = sugarReadings.map(r => r.brix);
  
  return {
    avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
    maxTemp: temps.length > 0 ? Math.max(...temps) : 0,
    minTemp: temps.length > 0 ? Math.min(...temps) : 0,
    initialSugar: sugars.length > 0 ? sugars[0] : 0,
    finalSugar: sugars.length > 0 ? sugars[sugars.length - 1] : 0,
    sugarConsumed: sugars.length > 1 ? sugars[0] - sugars[sugars.length - 1] : 0,
    tempLogsCount: tempLogs.length,
    sugarReadingsCount: sugarReadings.length,
    feedingCount: batch.feedingRecords.length,
    anomalyCount: batch.anomalies.length,
    durationHours: batch.endTime 
      ? (batch.endTime.getTime() - batch.startTime.getTime()) / 3600000
      : (Date.now() - batch.startTime.getTime()) / 3600000,
  };
}
