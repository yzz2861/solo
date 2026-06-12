import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Operator } from '../types';

interface AuthState {
  currentUser: Operator | null;
  login: (user: Operator) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
    }),
    { name: 'recycle-auth-store-v1' }
  )
);

export const MOCK_OPERATORS: Operator[] = [
  { id: '1', name: '李明', code: 'S001', role: 'staff' },
  { id: '2', name: '王芳', code: 'S002', role: 'staff' },
  { id: '3', name: '张伟', code: 'S003', role: 'staff' },
  { id: '4', name: '陈店长', code: 'M001', role: 'manager' },
];

export const MANAGER_PASSWORD = '888888';
