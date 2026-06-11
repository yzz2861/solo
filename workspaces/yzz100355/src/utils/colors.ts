import type { SeverityColor } from '@/types';

export const severityToColor = (severity: 'low' | 'medium' | 'high'): SeverityColor => {
  switch (severity) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    default:
      return 'primary';
  }
};

export const severityToHex = (severity: 'low' | 'medium' | 'high'): string => {
  switch (severity) {
    case 'low':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'high':
      return '#ef4444';
    default:
      return '#3b82f6';
  }
};

export const alarmLevelToColor = (level: 'info' | 'warning' | 'critical'): string => {
  switch (level) {
    case 'info':
      return '#3b82f6';
    case 'warning':
      return '#f59e0b';
    case 'critical':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

export const zoneTypeToColor = (type: string): string => {
  switch (type) {
    case 'pool':
      return '#06b6d4';
    case 'warehouse':
      return '#f59e0b';
    case 'restricted':
      return '#ef4444';
    case 'building':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
};

export const shiftColors = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export const getShiftColor = (index: number): string => {
  return shiftColors[index % shiftColors.length];
};

export const heatmapColor = (value: number, maxValue: number): string => {
  const normalized = value / maxValue;
  
  if (normalized < 0.25) {
    return `rgba(59, 130, 246, ${0.3 + normalized * 0.8})`;
  } else if (normalized < 0.5) {
    return `rgba(16, 185, 129, ${0.3 + normalized * 0.8})`;
  } else if (normalized < 0.75) {
    return `rgba(245, 158, 11, ${0.3 + normalized * 0.8})`;
  } else {
    return `rgba(239, 68, 68, ${0.3 + normalized * 0.8})`;
  }
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};
