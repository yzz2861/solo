import { RiskLevel, ThresholdConfig } from '../types';

export interface ThresholdCheckResult {
  riskLevel: RiskLevel;
  warnings: string[];
  isOverWarningRate: boolean;
  isOverDangerRate: boolean;
  isOverWarningWidth: boolean;
  isOverDangerWidth: boolean;
}

export function determineRiskLevel(
  growthRate: number,
  currentWidth: number,
  config: ThresholdConfig
): RiskLevel {
  if (growthRate > config.dangerRate || currentWidth > config.dangerWidth) {
    return 'danger';
  }
  if (growthRate > config.warningRate || currentWidth > config.warningWidth) {
    return 'warning';
  }
  return 'normal';
}

export function generateWarnings(
  growthRate: number,
  currentWidth: number,
  config: ThresholdConfig
): string[] {
  const warnings: string[] = [];

  if (growthRate > config.dangerRate) {
    warnings.push(
      `增长速率 ${growthRate.toFixed(3)} mm/季度 已超过封控阈值 ${config.dangerRate} mm/季度`
    );
  } else if (growthRate > config.warningRate) {
    warnings.push(
      `增长速率 ${growthRate.toFixed(3)} mm/季度 已超过注意阈值 ${config.warningRate} mm/季度`
    );
  }

  if (currentWidth > config.dangerWidth) {
    warnings.push(
      `当前宽度 ${currentWidth.toFixed(2)} mm 已超过封控阈值 ${config.dangerWidth} mm`
    );
  } else if (currentWidth > config.warningWidth) {
    warnings.push(
      `当前宽度 ${currentWidth.toFixed(2)} mm 已超过注意阈值 ${config.warningWidth} mm`
    );
  }

  return warnings;
}

export function checkThresholds(
  growthRate: number,
  currentWidth: number,
  config: ThresholdConfig
): ThresholdCheckResult {
  const isOverWarningRate = growthRate > config.warningRate;
  const isOverDangerRate = growthRate > config.dangerRate;
  const isOverWarningWidth = currentWidth > config.warningWidth;
  const isOverDangerWidth = currentWidth > config.dangerWidth;

  const riskLevel = determineRiskLevel(growthRate, currentWidth, config);
  const warnings = generateWarnings(growthRate, currentWidth, config);

  return {
    riskLevel,
    warnings,
    isOverWarningRate,
    isOverDangerRate,
    isOverWarningWidth,
    isOverDangerWidth,
  };
}
