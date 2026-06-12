export type AlertLevel = 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  deviceId?: string;
  relatedDeviceIds?: string[];
  suggestion?: string;
}
