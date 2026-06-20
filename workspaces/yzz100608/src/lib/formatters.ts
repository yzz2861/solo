import { roundTo, roundToSignificant, getBestPowerUnit, convertWToPower, getBestTimeUnit, convertSToDuration } from './units';

export function formatNumber(value: number, decimals: number = 2): string {
  if (!isFinite(value)) return '-';
  if (Math.abs(value) < 0.000001) return '0';
  return roundTo(value, decimals).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberSignificant(value: number, sigFigs: number = 3): string {
  if (!isFinite(value)) return '-';
  return roundToSignificant(value, sigFigs).toLocaleString('zh-CN');
}

export function formatPowerWatts(watts: number, decimals: number = 2): string {
  if (!isFinite(watts) || watts <= 0) return '0 W';
  const unit = getBestPowerUnit(watts);
  const converted = convertWToPower(watts, unit);
  const displayDecimals = unit === 'W' ? (converted >= 10 ? 1 : 2) : unit === 'mW' ? 1 : 0;
  return `${formatNumber(converted, displayDecimals)} ${unit}`;
}

export function formatDurationSeconds(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '0 s';
  const unit = getBestTimeUnit(seconds);
  const converted = convertSToDuration(seconds, unit);
  const decimals = unit === 'ms' ? 0 : unit === 's' ? (converted < 10 ? 1 : 0) : unit === 'min' ? 1 : 2;
  return `${formatNumber(converted, decimals)} ${unit}`;
}

export function formatDurationHoursDetailed(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return '0 小时';

  if (hours < 1 / 60) {
    const minutes = hours * 60;
    if (minutes < 1) {
      const seconds = Math.round(minutes * 60);
      return `${seconds} 秒`;
    }
    return `${formatNumber(minutes, 1)} 分钟`;
  }

  if (hours < 1) {
    const totalMinutes = Math.round(hours * 60);
    const mins = totalMinutes % 60;
    return `${mins} 分钟`;
  }

  if (hours < 48) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (m === 0) return `${h} 小时`;
    return `${h} 小时 ${m} 分钟`;
  }

  if (hours < 24 * 365) {
    const totalHours = Math.round(hours);
    const days = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    if (h === 0) return `${days} 天`;
    return `${days} 天 ${h} 小时`;
  }

  const years = hours / (24 * 365);
  return `${formatNumber(years, 1)} 年`;
}

export function formatDurationHoursCompact(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return '0h';

  if (hours < 1 / 60) {
    const minutes = hours * 60;
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    return `${formatNumber(minutes, 1)}min`;
  }

  if (hours < 1) {
    return `${formatNumber(hours * 60, 0)}min`;
  }

  if (hours < 48) {
    return `${formatNumber(hours, 1)}h`;
  }

  const days = hours / 24;
  if (days < 365) {
    return `${formatNumber(days, 1)}d`;
  }

  return `${formatNumber(days / 365, 1)}y`;
}

export function formatPercent(value: number, decimals: number = 1, withSign: boolean = false): string {
  if (!isFinite(value)) return '-';
  const prefix = withSign && value > 0 ? '+' : '';
  return `${prefix}${formatNumber(value, decimals)}%`;
}

export function formatWh(wh: number, decimals: number = 2): string {
  if (!isFinite(wh) || wh <= 0) return '0 Wh';
  if (wh >= 1000) {
    return `${formatNumber(wh / 1000, decimals)} kWh`;
  }
  if (wh < 1) {
    return `${formatNumber(wh * 1000, 0)} mWh`;
  }
  return `${formatNumber(wh, decimals)} Wh`;
}

export function formatmAh(mah: number): string {
  if (!isFinite(mah) || mah <= 0) return '0 mAh';
  if (mah >= 10000) {
    return `${formatNumber(mah / 1000, 2)} Ah`;
  }
  return `${formatNumber(mah, 0)} mAh`;
}

export function formatTemperature(celsius: number): string {
  if (!isFinite(celsius)) return '-';
  const prefix = celsius > 0 ? '' : '';
  return `${prefix}${formatNumber(celsius, 0)}℃`;
}

export function formatJoules(joules: number): string {
  if (!isFinite(joules) || joules <= 0) return '0 J';
  if (joules >= 1000) {
    return `${formatNumber(joules / 1000, 2)} kJ`;
  }
  if (joules < 0.001) {
    return `${formatNumber(joules * 1000000, 0)} μJ`;
  }
  if (joules < 1) {
    return `${formatNumber(joules * 1000, 1)} mJ`;
  }
  return `${formatNumber(joules, 2)} J`;
}

export function getSeverityColor(percent: number): string {
  const abs = Math.abs(percent);
  if (abs < 10) return 'var(--success)';
  if (abs < 25) return 'var(--warning)';
  return 'var(--danger)';
}

export function getSeverityBgClass(percent: number): string {
  const abs = Math.abs(percent);
  if (abs < 10) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (abs < 25) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}
