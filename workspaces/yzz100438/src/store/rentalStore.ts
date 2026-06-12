import { create } from 'zustand';
import type {
  Equipment,
  Rental,
  RentalItem,
  DamageClaim,
  AppStats,
  CreateRentalPayload,
  ReturnRentalItemPayload,
} from '../../shared/types.js';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success || !res.ok) throw new Error(json.error || '请求失败');
  return json.data as T;
}

interface RentalState {
  stats: AppStats | null;
  equipment: Equipment[];
  activeRentals: Rental[];
  pendingCleaning: RentalItem[];
  claims: DamageClaim[];
  toast: { type: 'success' | 'error' | 'info'; message: string } | null;

  loadStats: () => Promise<void>;
  loadEquipment: (filters?: { status?: string; category?: string }) => Promise<void>;
  loadRentals: (filters?: { status?: string }) => Promise<void>;
  loadActiveRentals: () => Promise<void>;
  loadPendingCleaning: () => Promise<void>;
  loadClaims: (filters?: { status?: string }) => Promise<void>;
  refreshAll: () => Promise<void>;

  createRental: (payload: CreateRentalPayload) => Promise<Rental>;
  returnItem: (
    id: number,
    payload: ReturnRentalItemPayload
  ) => Promise<{ item: RentalItem; claim?: DamageClaim; alreadyReturned: boolean }>;
  setCleaningStatus: (id: number, status: 'in_progress' | 'done') => Promise<RentalItem>;
  resolveClaim: (
    id: number,
    decision: 'approved' | 'rejected',
    approver: string
  ) => Promise<DamageClaim>;

  getReport: (
    kind: 'deposit' | 'claims' | 'availability',
    params?: Record<string, string>
  ) => Promise<Array<Record<string, string | number>>>;

  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  clearToast: () => void;
}

export const useRentalStore = create<RentalState>((set, get) => ({
  stats: null,
  equipment: [],
  activeRentals: [],
  pendingCleaning: [],
  claims: [],
  toast: null,

  async loadStats() {
    const data = await fetchApi<AppStats>('/api/stats');
    set({ stats: data });
  },
  async loadEquipment(filters) {
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    const data = await fetchApi<Equipment[]>(`/api/equipment${qs ? '?' + qs : ''}`);
    set({ equipment: data });
  },
  async loadRentals(filters) {
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    await fetchApi<Rental[]>(`/api/rentals${qs ? '?' + qs : ''}`);
  },
  async loadActiveRentals() {
    const data = await fetchApi<Rental[]>('/api/rentals/active');
    set({ activeRentals: data });
  },
  async loadPendingCleaning() {
    const data = await fetchApi<RentalItem[]>('/api/cleaning/pending');
    set({ pendingCleaning: data });
  },
  async loadClaims(filters) {
    const qs = new URLSearchParams(filters as Record<string, string>).toString();
    const data = await fetchApi<DamageClaim[]>(`/api/claims${qs ? '?' + qs : ''}`);
    set({ claims: data });
  },
  async refreshAll() {
    await Promise.all([
      get().loadStats(),
      get().loadEquipment(),
      get().loadActiveRentals(),
      get().loadPendingCleaning(),
    ]);
  },

  async createRental(payload) {
    const data = await fetchApi<Rental>('/api/rentals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    void get().refreshAll();
    return data;
  },
  async returnItem(id, payload) {
    try {
      const data = await fetchApi<{
        item: RentalItem;
        claim?: DamageClaim;
        alreadyReturned: boolean;
      }>(`/api/rentals/items/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      void get().refreshAll();
      return data;
    } catch (e) {
      if ((e as Error).message.includes('已归还')) {
        void get().refreshAll();
        return {
          item: {} as RentalItem,
          alreadyReturned: true,
        };
      }
      throw e;
    }
  },
  async setCleaningStatus(id, status) {
    const data = await fetchApi<RentalItem>(`/api/rentals/items/${id}/cleaning`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    void get().refreshAll();
    return data;
  },
  async resolveClaim(id, decision, approver) {
    const data = await fetchApi<DamageClaim>(`/api/claims/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ decision, approver }),
    });
    void get().loadClaims();
    void get().loadStats();
    return data;
  },

  async getReport(kind, params) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<Array<Record<string, string | number>>>(
      `/api/reports/${kind}${qs ? '?' + qs : ''}`
    );
  },

  showToast(type, message) {
    set({ toast: { type, message } });
    setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast() {
    set({ toast: null });
  },
}));
