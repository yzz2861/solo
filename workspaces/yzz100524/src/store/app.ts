import { create } from 'zustand';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  show: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: '',
  type: 'info',
  show: (message, type = 'info') => {
    set({ message, type });
    setTimeout(() => set({ message: '' }), 3000);
  },
  hide: () => set({ message: '' }),
}));

interface AppState {
  role: 'sales' | 'manager';
  setRole: (r: 'sales' | 'manager') => void;
  refreshKey: number;
  refresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'sales',
  setRole: (role) => set({ role }),
  refreshKey: 0,
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
