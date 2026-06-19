import type { Room, Package, Booking } from '@/types';
import { mockRooms, mockPackages, mockBookings } from '@/data/mockData';

const STORAGE_KEYS = {
  rooms: 'teahouse_rooms',
  packages: 'teahouse_packages',
  bookings: 'teahouse_bookings',
  lastSync: 'teahouse_lastSync',
  initialized: 'teahouse_initialized',
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
  return defaultValue;
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
};

export const initializeData = (): {
  rooms: Room[];
  packages: Package[];
  bookings: Booking[];
} => {
  const initialized = localStorage.getItem(STORAGE_KEYS.initialized);

  if (!initialized) {
    localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(mockRooms));
    localStorage.setItem(STORAGE_KEYS.packages, JSON.stringify(mockPackages));
    localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(mockBookings));
    localStorage.setItem(STORAGE_KEYS.initialized, 'true');
    return { rooms: mockRooms, packages: mockPackages, bookings: mockBookings };
  }

  return {
    rooms: loadFromStorage<Room[]>(STORAGE_KEYS.rooms, mockRooms),
    packages: loadFromStorage<Package[]>(STORAGE_KEYS.packages, mockPackages),
    bookings: loadFromStorage<Booking[]>(STORAGE_KEYS.bookings, mockBookings),
  };
};

export const saveRooms = (rooms: Room[]): void => {
  saveToStorage(STORAGE_KEYS.rooms, rooms);
};

export const savePackages = (packages: Package[]): void => {
  saveToStorage(STORAGE_KEYS.packages, packages);
};

export const saveBookings = (bookings: Booking[]): void => {
  saveToStorage(STORAGE_KEYS.bookings, bookings);
};

export const resetData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.initialized);
  localStorage.removeItem(STORAGE_KEYS.rooms);
  localStorage.removeItem(STORAGE_KEYS.packages);
  localStorage.removeItem(STORAGE_KEYS.bookings);
  localStorage.removeItem(STORAGE_KEYS.lastSync);
};
