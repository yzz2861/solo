import { AnomalyNote, Measurement, ThresholdConfig } from '../types';

function generateId(): string {
  return `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyNote[];
  hasSignificantAnomaly: boolean;
}

export function detectAnomalies(
  current: Measurement,
  previous: Measurement | null,
  config: ThresholdConfig
): AnomalyDetectionResult {
  const anomalies: AnomalyNote[] = [];
  let hasSignificantAnomaly = false;

  if (!previous) {
    return { anomalies, hasSignificantAnomaly: false };
  }

  const tempDiff = Math.abs(current.temperature - previous.temperature);
  if (tempDiff > config.tempDiffThreshold) {
    anomalies.push({
      id: generateId(),
      type: 'temp_diff',
      description: `与上次测量温度差异 ${tempDiff.toFixed(1)}℃，超过阈值 ${config.tempDiffThreshold}℃，可能影响数据对比，建议结合温度修正参考`,
    });
    hasSignificantAnomaly = true;
  }

  if (current.tool !== previous.tool) {
    anomalies.push({
      id: generateId(),
      type: 'tool_change',
      description: `测量工具由「${previous.tool}」变更为「${current.tool}」，数据波动可能由工具差异造成`,
    });
  }

  if (current.surveyor !== previous.surveyor) {
    anomalies.push({
      id: generateId(),
      type: 'surveyor_change',
      description: `测量人由「${previous.surveyor}」变更为「${current.surveyor}」`,
    });
  }

  if (current.photoAngle !== previous.photoAngle) {
    anomalies.push({
      id: generateId(),
      type: 'angle_change',
      description: `照片角度由「${previous.photoAngle}」变更为「${current.photoAngle}」，请确认测量位置一致`,
    });
  }

  const widthDiff = Math.abs(current.widthMm - previous.widthMm);
  const hasMeasurementChange =
    current.tool !== previous.tool || current.surveyor !== previous.surveyor;

  if (widthDiff > config.widthFluctuation && hasMeasurementChange) {
    anomalies.push({
      id: generateId(),
      type: 'width_fluctuation',
      description: `宽度变化 ${widthDiff.toFixed(2)} mm，且测量方式有变更，建议结合照片复核是否为真实增长`,
    });
    hasSignificantAnomaly = true;
  }

  if (current.widthUnit !== previous.widthUnit) {
    anomalies.push({
      id: generateId(),
      type: 'unit_conversion',
      description: `记录单位由「${previous.widthUnit}」变更为「${current.widthUnit}」，已自动换算为毫米统一存储`,
    });
  }

  return { anomalies, hasSignificantAnomaly };
}

export function summarizeAnomalies(anomalies: AnomalyNote[]): string {
  if (anomalies.length === 0) {
    return '无异常';
  }
  return anomalies.map((a) => a.description).join('；');
}

export function hasTempDiffAnomaly(anomalies: AnomalyNote[]): boolean {
  return anomalies.some((a) => a.type === 'temp_diff');
}

export function hasMeasurementChangeAnomaly(
  anomalies: AnomalyNote[]
): boolean {
  return anomalies.some(
    (a) => a.type === 'tool_change' || a.type === 'surveyor_change'
  );
}
