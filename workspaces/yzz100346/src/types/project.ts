import type { BaseDevice } from './devices';
import type { Risk, SafetySettings } from './safety';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  safetySettings: SafetySettings;
  devices: BaseDevice[];
  risks: Risk[];
}

export interface HistoryEntry {
  id: string;
  projectId: string;
  timestamp: number;
  action: string;
  description: string;
  snapshot: Project;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deviceCount: number;
  riskCount: number;
  criticalRiskCount: number;
}

export type HistoryAction = 
  | 'addDevice'
  | 'removeDevice'
  | 'updateDevice'
  | 'moveDevice'
  | 'updateSafetySettings'
  | 'loadProject'
  | 'rollback';

export const getHistoryActionLabel = (action: HistoryAction): string => {
  switch (action) {
    case 'addDevice':
      return '添加设备';
    case 'removeDevice':
      return '删除设备';
    case 'updateDevice':
      return '更新设备';
    case 'moveDevice':
      return '移动设备';
    case 'updateSafetySettings':
      return '更新安全设置';
    case 'loadProject':
      return '加载方案';
    case 'rollback':
      return '回滚版本';
  }
};

export const createNewProject = (name: string = '未命名方案'): Project => {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    safetySettings: {
      maxHoistLoad: 500,
      minAudienceDistance: 2,
      maxLoadVariance: 0.3,
    },
    devices: [],
    risks: [],
  };
};

export const createProjectSummary = (project: Project): ProjectSummary => {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    deviceCount: project.devices.length,
    riskCount: project.risks.length,
    criticalRiskCount: project.risks.filter(r => r.level === 'critical').length,
  };
};
