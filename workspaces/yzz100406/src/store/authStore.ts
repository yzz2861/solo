import { create } from 'zustand';
import { User, UserRole } from '../../shared/types.js';
import { authApi, setToken, getToken } from '../api/client.js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ username, password });
      setToken(response.token);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '登录失败',
        isLoading: false
      });
      throw error;
    }
  },

  logout: () => {
    authApi.logout();
    set({
      user: null,
      isAuthenticated: false
    });
  },

  checkAuth: () => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        set({
          user: {
            id: payload.id,
            username: payload.username,
            name: payload.name,
            role: payload.role as UserRole,
            storeId: payload.storeId
          },
          isAuthenticated: true,
          isLoading: false
        });
      } catch {
        setToken(null);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  }
}));
