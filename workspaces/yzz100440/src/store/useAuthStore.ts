import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole, LoginResponse } from '../../shared/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (role: UserRole, username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (role: UserRole, username: string, password: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (role === 'nurse') {
          if (username === 'admin' && password === '123456') {
            const user: User = {
              id: 'nurse_001',
              name: '王护士长',
              role: 'nurse',
            };
            const response: LoginResponse = {
              success: true,
              token: 'mock_token_nurse_' + Date.now(),
              user,
            };
            set({ user, token: response.token, isAuthenticated: true });
            return response;
          }
          return { success: false, token: '', user: { id: '', name: '', role: 'nurse' } };
        } else {
          if (username === '13800138000' && password === '123456') {
            const stored = localStorage.getItem('medication-data');
            let elderlyIds: string[] = [];
            if (stored) {
              try {
                const data = JSON.parse(stored);
                elderlyIds = data.elderlyList?.slice(0, 1).map((e: { id: string }) => e.id) || [];
              } catch {}
            }
            const user: User = {
              id: 'family_001',
              name: '家属张先生',
              role: 'family',
              elderlyIds,
            };
            const response: LoginResponse = {
              success: true,
              token: 'mock_token_family_' + Date.now(),
              user,
            };
            set({ user, token: response.token, isAuthenticated: true });
            return response;
          }
          return { success: false, token: '', user: { id: '', name: '', role: 'family' } };
        }
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
