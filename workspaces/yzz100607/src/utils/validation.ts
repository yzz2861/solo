import type { DrainageInput, Warning } from '@/types';
import { toMmPerMin } from './unitConversion';

export function validateInput(input: DrainageInput): Warning[] {
  const warnings: Warning[] = [];

  if (input.slope <= 0) {
    warnings.push({
      type: 'slope',
      level: 'danger',
      message: '坡度为零或负数，雨水无法自然排放，必须调整坡度！',
    });
  } else if (input.slope < 3) {
    warnings.push({
      type: 'slope',
      level: 'warning',
      message: `当前坡度${input.slope}‰小于推荐最小值3‰，排水不畅风险较高。`,
    });
  }

  const rainfallMmMin = toMmPerMin(input.rainfallIntensity, input.rainfallUnit);
  if (rainfallMmMin < 0.5) {
    warnings.push({
      type: 'rainfall',
      level: 'info',
      message: '雨强偏小，请确认当地设计暴雨强度是否正确。',
    });
  } else if (rainfallMmMin > 5) {
    warnings.push({
      type: 'rainfall',
      level: 'warning',
      message: '雨强超出常用范围（0.5-5 mm/min），请核实数据准确性。',
    });
  }

  if (input.drainBlocked) {
    warnings.push({
      type: 'drain',
      level: 'danger',
      message: '排水口被遮挡，排水能力降低50%，建议清理或增设排水口。',
    });
  }

  if (input.lengthUnit !== input.widthUnit) {
    warnings.push({
      type: 'unit',
      level: 'info',
      message: `长度单位(${input.lengthUnit})与宽度单位(${input.widthUnit})不一致，系统已自动换算。`,
    });
  }

  if (input.drainCount <= 0) {
    warnings.push({
      type: 'drain',
      level: 'danger',
      message: '排水口数量必须大于0！',
    });
  }

  if (input.drainDiameter <= 0) {
    warnings.push({
      type: 'drain',
      level: 'danger',
      message: '排水口口径必须大于0！',
    });
  }

  if (input.length <= 0) {
    warnings.push({
      type: 'unit',
      level: 'danger',
      message: '雨棚长度必须大于0！',
    });
  }

  if (input.width <= 0) {
    warnings.push({
      type: 'unit',
      level: 'danger',
      message: '雨棚宽度必须大于0！',
    });
  }

  if (input.rainfallIntensity <= 0) {
    warnings.push({
      type: 'rainfall',
      level: 'danger',
      message: '设计雨强必须大于0！',
    });
  }

  return warnings;
}

export function getDangerWarnings(warnings: Warning[]): Warning[] {
  return warnings.filter((w) => w.level === 'danger');
}

export function getWarningWarnings(warnings: Warning[]): Warning[] {
  return warnings.filter((w) => w.level === 'warning');
}

export function getInfoWarnings(warnings: Warning[]): Warning[] {
  return warnings.filter((w) => w.level === 'info');
}
