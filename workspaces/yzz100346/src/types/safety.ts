import type { DeviceType, BaseDevice } from './devices';

export type RiskLevel = 'critical' | 'warning' | 'info';
export type RiskType = 'overload' | 'tooClose' | 'unbalanced' | 'weightMissing';

export interface SafetySettings {
  maxHoistLoad: number;
  minAudienceDistance: number;
  maxLoadVariance: number;
}

export interface Risk {
  id: string;
  type: RiskType;
  level: RiskLevel;
  deviceId: string;
  deviceType: DeviceType;
  description: string;
  suggestion: string;
  value?: number;
  threshold?: number;
}

export interface HoistLoad {
  hoistPointId: string;
  deviceId: string;
  weight: number;
  distance: number;
}

export interface DeviceDistance {
  deviceId: string;
  audienceAreaId: string;
  distance: number;
}

export interface LoadDistribution {
  hoistPointId: string;
  totalLoad: number;
  percentage: number;
}

export const getRiskLevelColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    case 'info':
      return '#3b82f6';
  }
};

export const getRiskLevelLabel = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return '严重';
    case 'warning':
      return '警告';
    case 'info':
      return '提示';
  }
};

export const getRiskTypeLabel = (type: RiskType): string => {
  switch (type) {
    case 'overload':
      return '超载';
    case 'tooClose':
      return '距离过近';
    case 'unbalanced':
      return '分布不均';
    case 'weightMissing':
      return '重量缺失';
  }
};

export const hasRisk = (device: BaseDevice, risks: Risk[]): boolean => {
  return risks.some(r => r.deviceId === device.id);
};

export const getDeviceRisks = (deviceId: string, risks: Risk[]): Risk[] => {
  return risks.filter(r => r.deviceId === deviceId);
};

export const getHighestRiskLevel = (deviceId: string, risks: Risk[]): RiskLevel | null => {
  const deviceRisks = getDeviceRisks(deviceId, risks);
  if (deviceRisks.length === 0) return null;
  
  if (deviceRisks.some(r => r.level === 'critical')) return 'critical';
  if (deviceRisks.some(r => r.level === 'warning')) return 'warning';
  return 'info';
};
