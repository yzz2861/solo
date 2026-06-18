import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { mockUsers } from '../data/mockData';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (employeeId: string, role: UserRole) => boolean;
  logout: () => void;
  hasPermission: (requiredRole: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (employeeId: string, role: UserRole) => {
        const user = mockUsers.find(
          (u) => u.employeeId === employeeId && u.role === role
        );
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      hasPermission: (requiredRole: UserRole) => {
        const { currentUser } = get();
        return currentUser?.role === requiredRole;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
