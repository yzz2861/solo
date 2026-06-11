import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  clients: {
    list: (filters?: { keyword?: string; hasAllergies?: boolean }) => Promise<unknown[]>;
    get: (id: number) => Promise<unknown | undefined>;
    save: (client: unknown) => Promise<unknown>;
    delete: (id: number) => Promise<boolean>;
  };
  artists: {
    list: (activeOnly?: boolean) => Promise<unknown[]>;
    save: (artist: unknown) => Promise<unknown>;
  };
  bodyParts: {
    list: () => Promise<unknown[]>;
  };
  bookings: {
    list: (filters?: unknown) => Promise<unknown[]>;
    get: (id: number) => Promise<unknown | undefined>;
    checkConflict: (artistId: number, startTime: string, endTime: string, excludeBookingId?: number) => Promise<unknown>;
    save: (booking: unknown) => Promise<unknown>;
    cancel: (id: number) => Promise<boolean>;
    today: (artistId?: number) => Promise<unknown[]>;
  };
  designs: {
    list: (filters?: unknown) => Promise<unknown[]>;
    get: (id: number) => Promise<unknown | undefined>;
    save: (design: unknown) => Promise<unknown>;
    delete: (id: number) => Promise<boolean>;
    checkImages: () => Promise<unknown>;
    uploadImage: (sourcePath: string, designId: number) => Promise<{ savedPath: string }>;
  };
  deposits: {
    list: (bookingId?: number) => Promise<unknown[]>;
    save: (deposit: unknown) => Promise<unknown>;
    uploadImage: (sourcePath: string, bookingId: number) => Promise<{ savedPath: string }>;
  };
  alerts: {
    generate: () => Promise<unknown[]>;
  };
  export: {
    confirmation: (bookingId: number, version: 'client' | 'internal') => Promise<{ success: boolean; filePath: string | null }>;
  };
  dialog: {
    openFile: (filters?: unknown) => Promise<string | null>;
    openDirectory: () => Promise<string | null>;
  };
  fs: {
    fileExists: (filePath: string) => Promise<boolean>;
    readFile: (filePath: string) => Promise<string>;
  };
  app: {
    getDbPath: () => Promise<string>;
    backupDb: () => Promise<{ success: boolean; filePath: string | null }>;
    restoreDb: () => Promise<{ success: boolean; backupPath?: string }>;
  };
}

const electronAPI: ElectronAPI = {
  clients: {
    list: (filters?: { keyword?: string; hasAllergies?: boolean }) =>
      ipcRenderer.invoke('clients:list', filters),
    get: (id: number) => ipcRenderer.invoke('clients:get', id),
    save: (client: unknown) => ipcRenderer.invoke('clients:save', client),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
  },

  artists: {
    list: (activeOnly = true) => ipcRenderer.invoke('artists:list', activeOnly),
    save: (artist: unknown) => ipcRenderer.invoke('artists:save', artist),
  },

  bodyParts: {
    list: () => ipcRenderer.invoke('bodyParts:list'),
  },

  bookings: {
    list: (filters?: unknown) => ipcRenderer.invoke('bookings:list', filters),
    get: (id: number) => ipcRenderer.invoke('bookings:get', id),
    checkConflict: (artistId: number, startTime: string, endTime: string, excludeBookingId?: number) =>
      ipcRenderer.invoke('bookings:checkConflict', artistId, startTime, endTime, excludeBookingId),
    save: (booking: unknown) => ipcRenderer.invoke('bookings:save', booking),
    cancel: (id: number) => ipcRenderer.invoke('bookings:cancel', id),
    today: (artistId?: number) => ipcRenderer.invoke('bookings:today', artistId),
  },

  designs: {
    list: (filters?: unknown) => ipcRenderer.invoke('designs:list', filters),
    get: (id: number) => ipcRenderer.invoke('designs:get', id),
    save: (design: unknown) => ipcRenderer.invoke('designs:save', design),
    delete: (id: number) => ipcRenderer.invoke('designs:delete', id),
    checkImages: () => ipcRenderer.invoke('designs:checkImages'),
    uploadImage: (sourcePath: string, designId: number) =>
      ipcRenderer.invoke('designs:uploadImage', sourcePath, designId),
  },

  deposits: {
    list: (bookingId?: number) => ipcRenderer.invoke('deposits:list', bookingId),
    save: (deposit: unknown) => ipcRenderer.invoke('deposits:save', deposit),
    uploadImage: (sourcePath: string, bookingId: number) =>
      ipcRenderer.invoke('deposits:uploadImage', sourcePath, bookingId),
  },

  alerts: {
    generate: () => ipcRenderer.invoke('alerts:generate'),
  },

  export: {
    confirmation: (bookingId: number, version: 'client' | 'internal') =>
      ipcRenderer.invoke('export:confirmation', bookingId, version),
  },

  dialog: {
    openFile: (filters?: unknown) => ipcRenderer.invoke('dialog:openFile', filters),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },

  fs: {
    fileExists: (filePath: string) => ipcRenderer.invoke('fs:fileExists', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  },

  app: {
    getDbPath: () => ipcRenderer.invoke('app:getDbPath'),
    backupDb: () => ipcRenderer.invoke('app:backupDb'),
    restoreDb: () => ipcRenderer.invoke('app:restoreDb'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
