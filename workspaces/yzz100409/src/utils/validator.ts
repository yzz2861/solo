import type {
  SensorInput,
  ValidationWarning,
  ValidationWarningType,
} from '../../shared/types';

const addWarning = (
  list: ValidationWarning[],
  type: ValidationWarningType,
  field: keyof SensorInput,
  message: string,
  factor: number
) => {
  list.push({ type, field, message, conservativeFactor: factor });
};

export const detectHumidityJump = (
  current: number | null,
  previous: number | null
): boolean => {
  if (current === null || previous === null) return false;
  return Math.abs(current - previous) > 30;
};

export const validateInputs = (
  input: SensorInput
): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];

  if (input.temperature === null) {
    addWarning(warnings, 'missing', 'temperature', '气温传感器缺测，已用25℃估算', 1.08);
  } else if (input.temperature < 0 || input.temperature > 50) {
    addWarning(warnings, 'out_of_range', 'temperature', `气温${input.temperature.toFixed(1)}℃超出合理范围（0~50℃）`, 1.1);
  }

  if (input.humidity === null) {
    addWarning(warnings, 'missing', 'humidity', '湿度传感器缺测，已用60%估算', 1.1);
  } else if (input.humidity < 0 || input.humidity > 100) {
    addWarning(warnings, 'out_of_range', 'humidity', `湿度${input.humidity}%超出0~100%范围`, 1.1);
  } else if (detectHumidityJump(input.humidity, input.humidityPrevious)) {
    addWarning(
      warnings,
      'jump',
      'humidity',
      `湿度跳变≥30%（上次${input.humidityPrevious}% → 本次${input.humidity}%），已保守处理`,
      1.12
    );
  }

  if (input.radiation === null) {
    addWarning(warnings, 'missing', 'radiation', '光照传感器缺测，已用250W/m²估算', 1.12);
  } else if (input.radiation < 0 || input.radiation > 1200) {
    addWarning(warnings, 'out_of_range', 'radiation', `光照${input.radiation.toFixed(0)}W/m²超出合理范围`, 1.08);
  }

  if (input.wind === null) {
    addWarning(warnings, 'missing', 'wind', '风速传感器缺测，已用0.5m/s估算', 1.05);
  } else if (input.wind < 0 || input.wind > 10) {
    addWarning(warnings, 'out_of_range', 'wind', `风速${input.wind.toFixed(1)}m/s超出合理范围`, 1.05);
  }

  if (input.cropStage === null) {
    addWarning(warnings, 'stage_unselected', 'cropStage', '未选择作物阶段，按番茄全期平均Kc×1.15保守估算', 1.15);
  }

  if (input.soilMoisture === null) {
    addWarning(warnings, 'missing', 'soilMoisture', '土壤湿度缺测，假设为田间持水量的60%', 1.1);
  } else if (input.soilMoisture < 5 || input.soilMoisture > 55) {
    addWarning(warnings, 'out_of_range', 'soilMoisture', `土壤湿度${input.soilMoisture.toFixed(1)}体积%超出合理范围`, 1.05);
  }

  return warnings;
};

export const getConservativeFactor = (
  warnings: ValidationWarning[]
): number => {
  if (warnings.length === 0) return 1;
  return warnings.reduce((acc, w) => acc * (w.conservativeFactor - 1) + 1, 1);
};
