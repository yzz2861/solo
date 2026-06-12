export const formatNumber = (num: number, digits: number = 1): string => {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const formatPercent = (rate: number, digits: number = 1): string => {
  return `${(rate * 100).toFixed(digits)}%`;
};

export const formatCurrency = (amount: number, digits: number = 2): string => {
  return `¥${amount.toFixed(digits)}`;
};

export const formatKwh = (kwh: number, digits: number = 1): string => {
  return `${kwh.toFixed(digits)}kWh`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const formatVehicleModel = (model: string): string => {
  return model || '未知车型';
};

export const getPriceTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    peak: '峰段',
    flat: '平段',
    valley: '谷段',
    promotion: '促销',
  };
  return map[type] || type;
};

export const getPriceTypeColor = (type: string): string => {
  const map: Record<string, string> = {
    peak: 'bg-warning-orange',
    flat: 'bg-warning-yellow',
    valley: 'bg-electric-green',
    promotion: 'bg-purple-500',
  };
  return map[type] || 'bg-neutral-slate-dark';
};

export const getPeakLevelLabel = (level: string): string => {
  const map: Record<string, string> = {
    low: '低峰',
    medium: '平峰',
    high: '高峰',
    critical: '极峰',
  };
  return map[level] || level;
};

export const getPeakLevelColor = (level: string): string => {
  const map: Record<string, string> = {
    low: 'bg-electric-green/20 text-electric-green',
    medium: 'bg-warning-yellow/20 text-warning-yellow',
    high: 'bg-warning-orange/20 text-warning-orange',
    critical: 'bg-red-500/20 text-red-400',
  };
  return map[level] || 'bg-neutral-slate-dark/20 text-neutral-slate-dark';
};
