import type { SensorInput, IrrigationWindow } from '../../shared/types';

export const suggestIrrigationWindows = (
  input: SensorInput,
  grossIrrigation: number
): IrrigationWindow[] => {
  const T = input.temperature ?? 25;
  const rad = input.radiation ?? 250;
  const wind = input.wind ?? 0.5;
  const windows: IrrigationWindow[] = [];

  const hot = T >= 30;
  const veryHot = T >= 35;
  const windy = wind >= 1.5;
  const strongSun = rad >= 400;

  if (grossIrrigation <= 0.3) {
    return [
      {
        startHour: -1,
        endHour: -1,
        reason: '今日土壤水分充足，可暂缓灌溉，次日再评估',
        priority: 'primary',
      },
    ];
  }

  const primaryReasonBuilder = () => {
    const parts: string[] = [];
    if (veryHot) parts.push('气温超35℃');
    if (hot) parts.push('气温高');
    if (strongSun) parts.push('光照强');
    if (windy) parts.push('有风');
    const suffix = parts.length ? `（${parts.join('、')}，蒸发快）` : '（气温适中，蒸发损失小）';
    return `清晨水温与地温接近，减少根际胁迫${suffix}`;
  };

  windows.push({
    startHour: 5,
    endHour: 7,
    reason: primaryReasonBuilder(),
    priority: 'primary',
  });

  if (veryHot || (hot && windy) || grossIrrigation > 8) {
    windows.push({
      startHour: 18,
      endHour: 20,
      reason: veryHot
        ? '高温日需分两次灌溉，傍晚补墒降低根温，避免次日萎蔫'
        : '单次水量偏大，建议分两次灌溉以减少深层渗漏',
      priority: 'secondary',
    });
  }

  if (strongSun && T >= 28) {
    windows.push({
      startHour: 12,
      endHour: 12,
      reason: '正午高温强光照下建议轻喷5~10分钟微喷（降温增湿），避免正午大量灌水',
      priority: 'secondary',
    });
  }

  return windows;
};
