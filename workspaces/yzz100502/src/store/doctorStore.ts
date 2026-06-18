import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DoctorAction, DoctorActionType } from '../types';
import { useAuthStore } from './authStore';

interface DoctorState {
  actions: DoctorAction[];

  addAction: (resultId: string, action: DoctorActionType, note: string) => void;
  updateActionStatus: (id: string, status: 'completed') => void;
  getActionsByResultId: (resultId: string) => DoctorAction[];
  getPendingActions: () => DoctorAction[];
  getCompletedActions: () => DoctorAction[];
  hasAction: (resultId: string) => boolean;
}

const generateId = () => `da_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useDoctorStore = create<DoctorState>()(
  persist(
    (set, get) => ({
      actions: [],

      addAction: (resultId, action, note) => {
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentUser) return;

        const newAction: DoctorAction = {
          id: generateId(),
          resultId,
          doctorId: currentUser.id,
          actionTime: new Date(),
          action,
          note,
          status: 'pending',
        };

        set((state) => ({
          actions: [...state.actions, newAction],
        }));
      },

      updateActionStatus: (id, status) => {
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, status, actionTime: new Date() } : a
          ),
        }));
      },

      getActionsByResultId: (resultId) => {
        return get().actions.filter((a) => a.resultId === resultId);
      },

      getPendingActions: () => {
        return get().actions.filter((a) => a.status === 'pending');
      },

      getCompletedActions: () => {
        return get().actions.filter((a) => a.status === 'completed');
      },

      hasAction: (resultId) => {
        return get().actions.some((a) => a.resultId === resultId);
      },
    }),
    {
      name: 'doctor-storage',
    }
  )
);
