import { create } from 'zustand';
import { User, UserRole, ROLE_LABELS } from '../types';

interface UserState {
  currentUser: User | null;
  setUser: (user: User) => void;
  switchRole: (role: UserRole) => void;
  logout: () => void;
}

const defaultUser: User = {
  id: 'user-001',
  name: '管理员',
  role: 'logistics',
  roleLabel: '后勤管理人员',
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: defaultUser,
  setUser: (user) => set({ currentUser: user }),
  switchRole: (role) => set((state) => ({
    currentUser: state.currentUser ? { 
      ...state.currentUser, 
      role, 
      roleLabel: ROLE_LABELS[role] 
    } : null
  })),
  logout: () => set({ currentUser: null }),
}));
