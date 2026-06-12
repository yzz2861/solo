import type { Visitor, Handover, Alert, CurrentUser } from '../types';

const STORAGE_KEYS = {
  VISITORS: 'parking_visitors',
  HANDOVERS: 'parking_handovers',
  ALERTS: 'parking_alerts',
  CURRENT_USER: 'parking_current_user',
  PARKING_SPOTS: 'parking_spots',
} as const;

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function getVisitors(): Visitor[] {
  return getFromStorage<Visitor[]>(STORAGE_KEYS.VISITORS, []);
}

export function saveVisitors(visitors: Visitor[]): void {
  setToStorage(STORAGE_KEYS.VISITORS, visitors);
}

export function getHandovers(): Handover[] {
  return getFromStorage<Handover[]>(STORAGE_KEYS.HANDOVERS, []);
}

export function saveHandovers(handovers: Handover[]): void {
  setToStorage(STORAGE_KEYS.HANDOVERS, handovers);
}

export function getAlerts(): Alert[] {
  return getFromStorage<Alert[]>(STORAGE_KEYS.ALERTS, []);
}

export function saveAlerts(alerts: Alert[]): void {
  setToStorage(STORAGE_KEYS.ALERTS, alerts);
}

export function getCurrentUser(): CurrentUser | null {
  return getFromStorage<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
}

export function saveCurrentUser(user: CurrentUser): void {
  setToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

export function clearCurrentUser(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getParkingSpots(): string[] {
  const defaultSpots = ['A01', 'A02', 'A03', 'A04', 'A05', 'B01', 'B02', 'B03', 'B04', 'B05', 'C01', 'C02', 'C03', 'C04', 'C05'];
  return getFromStorage<string[]>(STORAGE_KEYS.PARKING_SPOTS, defaultSpots);
}

export function saveParkingSpots(spots: string[]): void {
  setToStorage(STORAGE_KEYS.PARKING_SPOTS, spots);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
