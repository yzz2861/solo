import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '@/types';

interface SettingsState extends UserSettings {
  setChildName: (name: string) => void;
  setDifficulty: (difficulty: 'easy' | 'normal' | 'hard') => void;
  toggleSound: () => void;
  setTargetDuration: (duration: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      childName: '小朋友',
      difficulty: 'normal',
      soundEnabled: true,
      targetDuration: 120,

      setChildName: (name) => set({ childName: name }),
      setDifficulty: (difficulty) => set({ difficulty }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setTargetDuration: (targetDuration) => set({ targetDuration }),
    }),
    {
      name: 'tooth_trainer_settings',
    }
  )
);
