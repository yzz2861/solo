import { create } from 'zustand';
import type { Role } from '@/types';

interface AuthState {
  role: Role | null;
  employeeId: string | null;
  userName: string | null;
}

interface AuthActions {
  login: (role: Role, employeeId: string, userName: string, password?: string) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

const STORAGE_KEY = 'umb_auth';

const loadFromStorage = (): AuthState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AuthState;
    }
  } catch {
    // 忽略读取错误
  }
  return { role: null, employeeId: null, userName: null };
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...loadFromStorage(),

  login: (role, employeeId, userName) => {
    const state: AuthState = { role, employeeId, userName };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 忽略持久化错误
    }
    set(state);
  },

  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略清除错误
    }
    set({ role: null, employeeId: null, userName: null });
  },
}));
