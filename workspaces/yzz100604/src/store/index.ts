import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BridgePoint,
  Vehicle,
  DispatchItem,
  SaltRecord,
  DispatchStatus,
  RiskLevel,
} from '@/engine/types';
import { mockBridges, mockVehicles } from '@/data/mockBridges';
import { mockRecords } from '@/data/mockRecords';

export type { BridgePoint, Vehicle, DispatchItem, SaltRecord, DispatchStatus, RiskLevel };

interface AppState {
  bridges: BridgePoint[];
  vehicles: Vehicle[];
  dispatches: DispatchItem[];
  saltRecords: SaltRecord[];
  reviewList: { bridgeId: string; bridgeName: string; note?: string; createdAt: number }[];

  addDispatch: (data: Omit<DispatchItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDispatch: (id: string, patch: Partial<DispatchItem>) => void;
  updateDispatchStatus: (id: string, status: DispatchStatus) => void;
  assignVehicle: (id: string, vehiclePlate: string) => void;
  deleteDispatch: (id: string) => void;

  addToReviewList: (bridgeId: string, bridgeName: string, note?: string) => void;
  removeFromReviewList: (bridgeId: string) => void;

  addSaltRecord: (data: Partial<SaltRecord> & { bridgeId: string; bridgeName: string }) => string;

  initMockData: () => void;
}

const genId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const priorityFromRisk = (level: RiskLevel, score: number): number => {
  if (level === 'danger') return Math.min(10, Math.round(8 + (score - 76) / 12));
  if (level === 'warning') return Math.min(7, Math.round(5 + (score - 51) / 12));
  if (level === 'caution') return Math.min(4, Math.round(2 + (score - 26) / 12));
  return 1;
};

const STORAGE_KEYS = {
  bridges: 'ice-risk:bridges',
  saltRecords: 'ice-risk:salt-records',
  dispatches: 'ice-risk:dispatches',
};

const createInitialState = () => ({
  bridges: mockBridges,
  vehicles: mockVehicles,
  dispatches: [],
  saltRecords: mockRecords,
  reviewList: [],
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      addDispatch: (data) => {
        const now = Date.now();
        const id = genId('DP');
        const dispatch: DispatchItem = {
          ...data,
          id,
          priority: data.priority ?? priorityFromRisk(data.riskLevel, data.riskScore),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ dispatches: [dispatch, ...s.dispatches] }));
        return id;
      },

      updateDispatch: (id, patch) => {
        set((s) => ({
          dispatches: s.dispatches.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d,
          ),
        }));
      },

      updateDispatchStatus: (id, status) => {
        set((s) => ({
          dispatches: s.dispatches.map((d) =>
            d.id === id ? { ...d, status, updatedAt: Date.now() } : d,
          ),
        }));
      },

      assignVehicle: (id, vehiclePlate) => {
        set((s) => ({
          dispatches: s.dispatches.map((d) =>
            d.id === id ? { ...d, assignedVehicle: vehiclePlate, updatedAt: Date.now() } : d,
          ),
        }));
      },

      deleteDispatch: (id) => {
        set((s) => ({ dispatches: s.dispatches.filter((d) => d.id !== id) }));
      },

      addToReviewList: (bridgeId, bridgeName, note) => {
        const existing = get().reviewList.find((r) => r.bridgeId === bridgeId);
        if (existing) return;
        set((s) => ({
          reviewList: [
            { bridgeId, bridgeName, note, createdAt: Date.now() },
            ...s.reviewList,
          ],
        }));
      },

      removeFromReviewList: (bridgeId) => {
        set((s) => ({ reviewList: s.reviewList.filter((r) => r.bridgeId !== bridgeId) }));
      },

      addSaltRecord: (data: Partial<SaltRecord> & { bridgeId: string; bridgeName: string }) => {
        const id = genId('SR');
        const startTime = (data as any).startTime || (data as any).departureTime || new Date().toISOString();
        const endTime = (data as any).endTime || (data as any).arrivalTime || startTime;
        const saltKg = (data as any).saltKg ?? (data as any).saltAmount ?? 0;
        const gramsPerSqm = (data as any).saltPerSqm ?? (data as any).gramsPerSqm ?? 0;
        const record: SaltRecord = {
          ...data,
          id,
          vehiclePlate: (data as any).vehiclePlate || (data as any).plateNumber || '',
          plateNumber: (data as any).plateNumber || (data as any).vehiclePlate,
          startTime,
          endTime,
          departureTime: (data as any).departureTime || startTime,
          arrivalTime: (data as any).arrivalTime || endTime,
          saltKg,
          saltAmount: (data as any).saltAmount ?? saltKg,
          saltPerSqm: gramsPerSqm,
          gramsPerSqm,
          airTempAtSite: (data as any).airTempAtSite ?? (data as any).temperature ?? 0,
          temperature: (data as any).temperature ?? (data as any).airTempAtSite,
          operator: (data as any).operator || (data as any).executor || '',
          executor: (data as any).executor || (data as any).operator,
          weatherNote: (data as any).weatherNote || (data as any).remark,
          remark: (data as any).remark || (data as any).weatherNote,
          notes: (data as any).notes || (data as any).remark,
          createdAt: Date.now(),
        };
        set((s) => ({ saltRecords: [record, ...s.saltRecords] }));
        return id;
      },

      initMockData: () => {
        set({
          bridges: [...mockBridges],
          saltRecords: [...mockRecords],
          dispatches: [],
          reviewList: [],
        });
      },
    }),
    {
      name: 'ice-risk-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        [STORAGE_KEYS.bridges]: state.bridges,
        [STORAGE_KEYS.saltRecords]: state.saltRecords,
        [STORAGE_KEYS.dispatches]: state.dispatches,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand persist rehydrate error:', error);
          return;
        }
        if (!state) return;
        const restored = state as unknown as Record<string, unknown>;
        state.bridges = (restored[STORAGE_KEYS.bridges] as BridgePoint[]) ?? mockBridges;
        state.saltRecords = (restored[STORAGE_KEYS.saltRecords] as SaltRecord[]) ?? mockRecords;
        state.dispatches = (restored[STORAGE_KEYS.dispatches] as DispatchItem[]) ?? [];
        state.vehicles = mockVehicles;
        state.reviewList = [];
      },
    },
  ),
);

export const useStore = useAppStore;

export default useAppStore;
