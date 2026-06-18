import { create } from 'zustand';
import type {
  Building,
  BuildingAnomalyDetail,
  BuildingAnomalySummary,
  Holiday,
  RepairRecord,
} from '@shared/types';
import { api } from '@/api/client';

interface AppState {
  buildings: Building[];
  holidays: Holiday[];
  overview: BuildingAnomalySummary[];
  selectedBuildingDetail: BuildingAnomalyDetail | null;
  loading: Record<string, boolean>;
  excludeHoliday: boolean;
  fetchBuildings: () => Promise<void>;
  fetchHolidays: () => Promise<void>;
  fetchOverview: () => Promise<void>;
  fetchBuildingDetail: (id: number) => Promise<void>;
  setExcludeHoliday: (v: boolean) => void;
  createRepair: (data: Partial<RepairRecord>) => Promise<RepairRecord>;
  updateRepair: (id: number, data: Partial<RepairRecord>) => Promise<void>;
  createBuilding: (data: Partial<Building>) => Promise<Building>;
  updateBuilding: (id: number, data: Partial<Building>) => Promise<Building>;
  createHoliday: (data: Partial<Holiday>) => Promise<Holiday>;
  deleteHoliday: (id: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  buildings: [],
  holidays: [],
  overview: [],
  selectedBuildingDetail: null,
  loading: {},
  excludeHoliday: true,

  fetchBuildings: async () => {
    set({ loading: { ...get().loading, buildings: true } });
    const buildings = await api.getBuildings();
    set({ buildings, loading: { ...get().loading, buildings: false } });
  },
  fetchHolidays: async () => {
    set({ loading: { ...get().loading, holidays: true } });
    const holidays = await api.getHolidays();
    set({ holidays, loading: { ...get().loading, holidays: false } });
  },
  fetchOverview: async () => {
    set({ loading: { ...get().loading, overview: true } });
    const overview = await api.getAnomalyOverview(get().excludeHoliday);
    set({ overview, loading: { ...get().loading, overview: false } });
  },
  fetchBuildingDetail: async (id: number) => {
    set({ loading: { ...get().loading, detail: true } });
    const detail = await api.getBuildingAnomaly(id);
    set({ selectedBuildingDetail: detail, loading: { ...get().loading, detail: false } });
  },
  setExcludeHoliday: (v: boolean) => {
    set({ excludeHoliday: v });
    get().fetchOverview();
  },
  createRepair: async (data: Partial<RepairRecord>) => {
    const r = await api.createRepair(data);
    if (get().selectedBuildingDetail?.buildingId === r.buildingId) {
      await get().fetchBuildingDetail(r.buildingId);
    }
    return r;
  },
  updateRepair: async (id: number, data: Partial<RepairRecord>) => {
    await api.updateRepair(id, data);
    if (get().selectedBuildingDetail) {
      await get().fetchBuildingDetail(get().selectedBuildingDetail.buildingId);
    }
  },
  createBuilding: async (data: Partial<Building>) => {
    const b = await api.createBuilding(data);
    await get().fetchBuildings();
    return b;
  },
  updateBuilding: async (id: number, data: Partial<Building>) => {
    const b = await api.updateBuilding(id, data);
    await get().fetchBuildings();
    return b;
  },
  createHoliday: async (data: Partial<Holiday>) => {
    const h = await api.createHoliday(data);
    await get().fetchHolidays();
    return h;
  },
  deleteHoliday: async (id: number) => {
    await api.deleteHoliday(id);
    await get().fetchHolidays();
  },
}));
