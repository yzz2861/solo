import type { DryingParams, ValidationWarning } from '@/types';

export function validateParams(params: Partial<DryingParams>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (params.weight !== undefined) {
    if (params.weight <= 0) {
      warnings.push({
        type: 'error',
        field: 'weight',
        message: '物料重量必须大于0',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'weight',
      message: '请输入物料重量',
    });
  }

  if (params.initialMoisture !== undefined) {
    if (params.initialMoisture <= 0 || params.initialMoisture >= 100) {
      warnings.push({
        type: 'error',
        field: 'initialMoisture',
        message: '初始含水率应在0-100%之间',
      });
    }
    if (params.initialMoisture > 0 && params.initialMoisture < 1) {
      warnings.push({
        type: 'warning',
        field: 'initialMoisture',
        message: '检测到数值小于1，您是想输入小数形式吗？如0.6表示60%，请确认单位',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'initialMoisture',
      message: '请输入初始含水率',
    });
  }

  if (params.targetMoisture !== undefined) {
    if (params.targetMoisture <= 0 || params.targetMoisture >= 100) {
      warnings.push({
        type: 'error',
        field: 'targetMoisture',
        message: '目标含水率应在0-100%之间',
      });
    }
    if (params.targetMoisture > 0 && params.targetMoisture < 1) {
      warnings.push({
        type: 'warning',
        field: 'targetMoisture',
        message: '检测到数值小于1，您是想输入小数形式吗？如0.12表示12%，请确认单位',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'targetMoisture',
      message: '请输入目标含水率',
    });
  }

  if (
    params.initialMoisture !== undefined &&
    params.targetMoisture !== undefined &&
    params.initialMoisture > 0 &&
    params.targetMoisture > 0
  ) {
    if (params.targetMoisture >= params.initialMoisture) {
      warnings.push({
        type: 'error',
        field: 'targetMoisture',
        message: '目标含水率不能高于或等于初始含水率，否则不需要烘干',
      });
    }
  }

  if (params.temperature !== undefined) {
    if (params.temperature <= 0) {
      warnings.push({
        type: 'error',
        field: 'temperature',
        message: '烘房温度必须大于0℃',
      });
    }
    if (params.temperature > 120) {
      warnings.push({
        type: 'warning',
        field: 'temperature',
        message: '温度过高（超过120℃），可能影响物料品质，也存在安全隐患，请确认',
      });
    }
    if (params.temperature > 90) {
      warnings.push({
        type: 'info',
        field: 'temperature',
        message: '温度较高，适合快速排湿，但注意后期降温',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'temperature',
      message: '请输入烘房温度',
    });
  }

  if (params.airFlow !== undefined) {
    if (params.airFlow < 0) {
      warnings.push({
        type: 'error',
        field: 'airFlow',
        message: '风量不能为负数',
      });
    }
    if (params.airFlow === 0) {
      warnings.push({
        type: 'warning',
        field: 'airFlow',
        message: '风量为0或未填写，烘干效率会很低，建议开启排风',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'airFlow',
      message: '风量缺失，将按保守值估算，建议填写实际风量以获得更准确结果',
    });
  }

  if (params.ambientHumidity !== undefined) {
    if (params.ambientHumidity < 0 || params.ambientHumidity > 100) {
      warnings.push({
        type: 'error',
        field: 'ambientHumidity',
        message: '环境湿度应在0-100%之间',
      });
    }
    if (params.ambientHumidity > 80) {
      warnings.push({
        type: 'info',
        field: 'ambientHumidity',
        message: '环境湿度很高（雨天或回南天），烘干时间会明显增加',
      });
    }
  } else {
    warnings.push({
      type: 'warning',
      field: 'ambientHumidity',
      message: '请输入环境湿度',
    });
  }

  return warnings;
}

export function hasErrors(warnings: ValidationWarning[]): boolean {
  return warnings.some((w) => w.type === 'error');
}

export function getWarningsByField(
  warnings: ValidationWarning[],
  field: string
): ValidationWarning[] {
  return warnings.filter((w) => w.field === field);
}
