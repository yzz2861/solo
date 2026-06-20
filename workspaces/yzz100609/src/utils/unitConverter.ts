export function parseDuration(minutes: number, seconds: number): number {
  return minutes * 60 + seconds;
}

export function formatDuration(totalSeconds: number): { minutes: number; seconds: number } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return { minutes, seconds };
}

export function formatDurationString(totalSeconds: number): string {
  const { minutes, seconds } = formatDuration(totalSeconds);
  if (minutes === 0) return `${seconds}秒`;
  if (seconds === 0) return `${minutes}分`;
  return `${minutes}分${seconds}秒`;
}

export function litersToCubicMeters(liters: number): number {
  return liters / 1000;
}

export function cubicMetersToLiters(m3: number): number {
  return m3 * 1000;
}

export function calculateDoorArea(width: number, height: number): number {
  return width * height;
}

export function validateInput(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export interface WarningInfo {
  type: 'warning' | 'danger';
  field: string;
  message: string;
}

export function checkWarnings(
  avgOpenDuration: number,
  ambientHumidity: number,
  deltaT: number
): WarningInfo[] {
  const warnings: WarningInfo[] = [];

  if (avgOpenDuration > 300) {
    warnings.push({
      type: 'danger',
      field: 'avgOpenDuration',
      message: `平均开门时长 ${formatDurationString(avgOpenDuration)}，超过5分钟！冷气大量流失，建议控制在3分钟以内`,
    });
  } else if (avgOpenDuration > 180) {
    warnings.push({
      type: 'warning',
      field: 'avgOpenDuration',
      message: `平均开门时长 ${formatDurationString(avgOpenDuration)}，偏长，建议缩短开门时间`,
    });
  }

  if (ambientHumidity > 85) {
    warnings.push({
      type: 'danger',
      field: 'ambientHumidity',
      message: `外界湿度 ${ambientHumidity}%，非常高！大量水汽进入将导致结霜严重、潜热负荷剧增`,
    });
  } else if (ambientHumidity > 70) {
    warnings.push({
      type: 'warning',
      field: 'ambientHumidity',
      message: `外界湿度 ${ambientHumidity}%，偏高，注意结霜和潜热负荷增加`,
    });
  }

  if (deltaT > 40) {
    warnings.push({
      type: 'danger',
      field: 'deltaT',
      message: `内外温差 ${deltaT.toFixed(1)}°C，极大温差下开门热交换非常剧烈，务必缩短开门时间`,
    });
  } else if (deltaT > 25) {
    warnings.push({
      type: 'warning',
      field: 'deltaT',
      message: `内外温差 ${deltaT.toFixed(1)}°C，温差较大，注意控制开门时长`,
    });
  }

  return warnings;
}
