import { create } from 'zustand';
import type { PatrolShift, ForbiddenZone, Checkpoint } from '@/types';
import { loadPatrolShifts, loadForbiddenZones, loadCheckpoints } from '@/services/dataService';

interface SceneState {
  patrolShifts: PatrolShift[];
  forbiddenZones: ForbiddenZone[];
  checkpoints: Checkpoint[];
  selectedShiftId: string | null;
  visibleShiftIds: string[];
  showForbiddenZones: boolean;
  showTrajectories: boolean;
  showAlarms: boolean;
  showHeatmap: boolean;
  showCheckpoints: boolean;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  selectedPointId: string | null;
  selectedAlarmId: string | null;
  isLoading: boolean;
  error: string | null;
  
  actions: {
    loadData: () => void;
    reloadData: () => void;
    selectShift: (id: string | null) => void;
    toggleShiftVisibility: (id: string) => void;
    toggleForbiddenZones: () => void;
    toggleTrajectories: () => void;
    toggleAlarms: () => void;
    toggleHeatmap: () => void;
    toggleCheckpoints: () => void;
    setCameraPosition: (pos: [number, number, number], target: [number, number, number]) => void;
    selectPoint: (id: string | null) => void;
    selectAlarm: (id: string | null) => void;
    getSelectedShift: () => PatrolShift | undefined;
    getVisibleShifts: () => PatrolShift[];
    getShiftById: (id: string) => PatrolShift | undefined;
    getAlarmById: (id: string) => PatrolShift['alarms'][0] | undefined;
    getCheckpointById: (id: string) => Checkpoint | undefined;
  };
}

export const useSceneStore = create<SceneState>((set, get) => ({
  patrolShifts: [],
  forbiddenZones: [],
  checkpoints: [],
  selectedShiftId: null,
  visibleShiftIds: [],
  showForbiddenZones: true,
  showTrajectories: true,
  showAlarms: true,
  showHeatmap: false,
  showCheckpoints: true,
  cameraPosition: [80, 100, 100],
  cameraTarget: [50, 0, 40],
  selectedPointId: null,
  selectedAlarmId: null,
  isLoading: false,
  error: null,
  
  actions: {
    loadData: () => {
      set({ isLoading: true });
      try {
        const shifts = loadPatrolShifts();
        const zones = loadForbiddenZones();
        const checkpoints = loadCheckpoints();
        
        const shiftIds = shifts.map(s => s.id);
        
        set({
          patrolShifts: shifts,
          forbiddenZones: zones,
          checkpoints,
          selectedShiftId: shiftIds[shiftIds.length - 1] || null,
          visibleShiftIds: shiftIds.slice(-2),
          isLoading: false,
          error: null,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '加载数据失败',
          isLoading: false,
        });
      }
    },
    
    reloadData: () => {
      get().actions.loadData();
    },
    
    selectShift: (id) => set({ selectedShiftId: id }),
    
    toggleShiftVisibility: (id) => set((state) => {
      const isVisible = state.visibleShiftIds.includes(id);
      return {
        visibleShiftIds: isVisible
          ? state.visibleShiftIds.filter(sid => sid !== id)
          : [...state.visibleShiftIds, id],
      };
    }),
    
    toggleForbiddenZones: () => set((state) => ({ showForbiddenZones: !state.showForbiddenZones })),
    toggleTrajectories: () => set((state) => ({ showTrajectories: !state.showTrajectories })),
    toggleAlarms: () => set((state) => ({ showAlarms: !state.showAlarms })),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    toggleCheckpoints: () => set((state) => ({ showCheckpoints: !state.showCheckpoints })),
    
    setCameraPosition: (pos, target) => set({
      cameraPosition: pos,
      cameraTarget: target,
    }),
    
    selectPoint: (id) => set({ selectedPointId: id }),
    selectAlarm: (id) => set({ selectedAlarmId: id }),
    
    getSelectedShift: () => {
      const state = get();
      return state.patrolShifts.find(s => s.id === state.selectedShiftId);
    },
    
    getVisibleShifts: () => {
      const state = get();
      return state.patrolShifts.filter(s => state.visibleShiftIds.includes(s.id));
    },
    
    getShiftById: (id) => {
      return get().patrolShifts.find(s => s.id === id);
    },
    
    getAlarmById: (id) => {
      const shifts = get().patrolShifts;
      for (const shift of shifts) {
        const alarm = shift.alarms.find(a => a.id === id);
        if (alarm) return alarm;
      }
      return undefined;
    },
    
    getCheckpointById: (id) => {
      return get().checkpoints.find(cp => cp.id === id);
    },
  },
}));
