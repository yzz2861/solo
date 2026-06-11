export const COLORS = {
  background: {
    primary: '#1a1d23',
    secondary: '#23272f',
    tertiary: '#2d323b',
    panel: 'rgba(35, 39, 47, 0.95)',
  },
  border: {
    default: '#3a4150',
    hover: '#4a5568',
    active: '#3b82f6',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  devices: {
    stage: '#8b5a2b',
    lightRig: '#c0c0c0',
    speaker: '#1a1a1a',
    hoistPoint: '#3b82f6',
    audienceArea: 'rgba(59, 130, 246, 0.3)',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
  },
} as const;

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  lightRig: '灯架',
  speaker: '音箱',
  hoistPoint: '吊点',
  audienceArea: '观众区',
  stage: '舞台',
};

export const DEVICE_TYPE_COLORS: Record<string, string> = {
  lightRig: '#c0c0c0',
  speaker: '#1a1a1a',
  hoistPoint: '#3b82f6',
  audienceArea: '#60a5fa',
  stage: '#8b5a2b',
};
