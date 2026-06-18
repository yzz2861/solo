import type { Order, Batch, Customer, AppConfig } from '@/types';

const STORAGE_KEYS = {
  ORDERS: 'bread_booking_orders',
  BATCHES: 'bread_booking_batches',
  CUSTOMERS: 'bread_booking_customers',
  CONFIG: 'bread_booking_config',
  VERSION: 'bread_booking_version',
};

const CURRENT_VERSION = '1.0.0';

export const storage = {
  getOrders: (): Order[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  },

  saveOrders: (orders: Order[]): void => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  },

  getBatches: (): Batch[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BATCHES);
    return data ? JSON.parse(data) : [];
  },

  saveBatches: (batches: Batch[]): void => {
    localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
  },

  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  },

  saveCustomers: (customers: Customer[]): void => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getConfig: (): AppConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return data ? JSON.parse(data) : null;
  },

  saveConfig: (config: AppConfig): void => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  getVersion: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.VERSION);
  },

  saveVersion: (version: string): void => {
    localStorage.setItem(STORAGE_KEYS.VERSION, version);
  },

  clearAll: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  },

  backup: (): Record<string, unknown> => {
    const backup: Record<string, unknown> = {};
    Object.entries(STORAGE_KEYS).forEach(([_, key]) => {
      const data = localStorage.getItem(key);
      if (data) {
        backup[key] = JSON.parse(data);
      }
    });
    return backup;
  },

  checkVersion: (): boolean => {
    const version = storage.getVersion();
    if (!version) {
      storage.saveVersion(CURRENT_VERSION);
      return true;
    }
    if (version !== CURRENT_VERSION) {
      console.warn(`Data version mismatch: expected ${CURRENT_VERSION}, got ${version}`);
      return false;
    }
    return true;
  },
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
