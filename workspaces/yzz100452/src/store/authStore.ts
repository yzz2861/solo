import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { ROLE_DISPLAY, type UserRole } from '@/types';
import { seedUsers } from '@/data/seed';

export { ROLE_DISPLAY };
export type { UserRole };

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: Partial<User> & { role: UserRole }) => void;
  loginByCredentials: (username: string, password: string) => User | null;
  loginByPhone: (phone: string) => User | null;
  logout: () => void;
  findUserByPhone: (phone: string) => User | null;
  getAllUsers: () => User[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      login: (userData) => {
        const now = new Date().toISOString();
        const user: User = {
          id: userData.id || `user-${userData.role}-${Date.now()}`,
          username: userData.username || '',
          phone: userData.phone || '',
          name: userData.name || userData.displayName || '用户',
          displayName: userData.displayName || userData.name,
          role: userData.role,
          avatar: userData.avatar,
          createdAt: userData.createdAt || now,
        };
        set({ currentUser: user, isAuthenticated: true });
      },
      loginByCredentials: (username: string, password: string) => {
        const user = seedUsers.find(
          (u) => u.username === username && u.password === password,
        );
        if (user) {
          set({
            currentUser: {
              ...user,
              displayName: user.displayName || user.name,
            },
            isAuthenticated: true,
          });
          return user;
        }
        return null;
      },
      loginByPhone: (phone: string) => {
        const user = seedUsers.find((u) => u.phone === phone);
        if (user) {
          set({
            currentUser: {
              ...user,
              displayName: user.displayName || user.name,
            },
            isAuthenticated: true,
          });
          return user;
        }
        return null;
      },
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
      findUserByPhone: (phone: string) => {
        return seedUsers.find((u) => u.phone === phone) || null;
      },
      getAllUsers: () => {
        return seedUsers;
      },
    }),
    {
      name: 'camera_auth_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
