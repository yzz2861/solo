import { create } from 'zustand';
import { getInterpolatedPosition } from '@/services/trajectoryService';
import { useSceneStore } from './useSceneStore';
import { addSeconds } from '@/utils/time';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
  robotPosition: [number, number, number] | null;
  currentPointIndex: number;
  playbackStartTime: string | null;
  playbackEndTime: string | null;
  
  actions: {
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seek: (time: number) => void;
    setSpeed: (speed: number) => void;
    toggleLoop: () => void;
    reset: () => void;
    setPlaybackRange: (start: string, end: string) => void;
    update: (deltaTime: number) => void;
  };
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  speed: 1,
  loop: false,
  robotPosition: null,
  currentPointIndex: 0,
  playbackStartTime: null,
  playbackEndTime: null,
  
  actions: {
    play: () => set({ isPlaying: true }),
    
    pause: () => set({ isPlaying: false }),
    
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    
    seek: (time) => {
      const state = get();
      const clampedTime = Math.max(0, Math.min(state.duration, time));
      
      const selectedShift = useSceneStore.getState().actions.getSelectedShift();
      
      if (selectedShift && state.playbackStartTime) {
        const targetTime = addSeconds(state.playbackStartTime, clampedTime).toISOString();
        const position = getInterpolatedPosition(selectedShift.trajectoryPoints, targetTime);
        
        set({
          currentTime: clampedTime,
          robotPosition: position ? [position.x, position.y, position.z] : null,
        });
      } else {
        set({ currentTime: clampedTime });
      }
    },
    
    setSpeed: (speed) => set({ speed }),
    
    toggleLoop: () => set((state) => ({ loop: !state.loop })),
    
    reset: () => set({
      currentTime: 0,
      isPlaying: false,
      currentPointIndex: 0,
      robotPosition: null,
    }),
    
    setPlaybackRange: (start, end) => {
      const startDate = new Date(start).getTime();
      const endDate = new Date(end).getTime();
      const duration = (endDate - startDate) / 1000;
      
      set({
        playbackStartTime: start,
        playbackEndTime: end,
        duration,
        currentTime: 0,
        robotPosition: null,
      });
    },
    
    update: (deltaTime) => {
      const state = get();
      if (!state.isPlaying || state.duration <= 0) return;
      
      const newTime = state.currentTime + deltaTime * state.speed;
      
      if (newTime >= state.duration) {
        if (state.loop) {
          get().actions.seek(0);
        } else {
          set({ isPlaying: false, currentTime: state.duration });
        }
      } else {
        get().actions.seek(newTime);
      }
    },
  },
}));
