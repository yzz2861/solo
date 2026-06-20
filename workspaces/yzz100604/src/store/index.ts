import { create } from 'zustand';
import type {
  BridgePoint,
  Vehicle,
  DispatchItem,
  SaltRecord,
  DispatchStatus,
  RiskLevel,
} from '@/engine/types';
import { mockBridges, mockVehicles } from '@/data/mockBridges';

interface AppState {
  bridges: BridgePoint[];
  vehicles: Vehicle[];
  dispatches: DispatchItem[];
  saltRecords: SaltRecord[];
  reviewList: { bridgeId: string; bridgeName: string; note?: string; createdAt: number }[];

  addDispatch: (data: Omit<DispatchItem, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDispatchStatus: (id: string, status: DispatchStatus) => void;
  assignVehicle: (id: string, vehiclePlate: string) => void;
  deleteDispatch: (id: string) => void;

  addToReviewList: (bridgeId: string, bridgeName: string, note?: string) => void;
  removeFromReviewList: (bridgeId: string) => void;

  addSaltRecord: (data: Omit<SaltRecord, 'id' | 'createdAt'>) => string;
}

const genId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const priorityFromRisk = (level: RiskLevel, score: number): number => {
  if (level === 'danger') return Math.min(10, Math.round(8 + (score - 76) / 12));
  if (level === 'warning') return Math.min(7, Math.round(5 + (score - 51) / 12));
  if (level === 'caution') return Math.min(4, Math.round(2 + (score - 26) / 12));
  return 1;
};

export const useAppStore = create<AppState>((set, get) => ({
  bridges: mockBridges,
  vehicles: mockVehicles,
  dispatches: [],
  saltRecords: [],
  reviewList: [],

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

  addSaltRecord: (data) => {
    const id = genId('SR');
    const record: SaltRecord = {
      ...data,
      id,
      createdAt: Date.now(),
    };
    set((s) => ({ saltRecords: [record, ...s.saltRecords] }));
    return id;
  },
}));
