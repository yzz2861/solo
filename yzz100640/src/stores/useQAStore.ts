import { create } from 'zustand';
import type { QARecord } from '@/types';
import { QAService } from '@/services/qaService';

interface QAState {
  currentRecord: QARecord | null;
  history: QARecord[];
  isLoading: boolean;
  filters: { crop?: string; variety?: string; region?: string; season?: number };
  setFilters: (f: Partial<QAState['filters']>) => void;
  query: (question: string) => Promise<void>;
  markAdoption: (recordId: string, adopted: boolean, note?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  clearCurrent: () => void;
}

export const useQAStore = create<QAState>((set, get) => ({
  currentRecord: null,
  history: [],
  isLoading: false,
  filters: {
    season: new Date().getMonth() + 1,
  },
  setFilters: (f) =>
    set((state) => ({
      filters: { ...state.filters, ...f } })),
  query: async (question) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const serviceFilters: QARecord['filters'] = {
        crop: filters.crop,
        variety: filters.variety,
        region: filters.region,
        season: filters.season !== undefined ? String(filters.season) : undefined,
      };
      const record = await QAService.query(question, serviceFilters);
      await QAService.saveRecord(record);
      set((state) => ({
        currentRecord: record,
        history: [record, ...state.history],
      }));
    } finally {
      set({ isLoading: false });
    }
  },
  markAdoption: async (recordId, adopted, note) => {
    await QAService.markAdoption(recordId, adopted, note);
    set((state) => ({
      history: state.history.map((r) =>
        r.id === recordId
          ? { ...r, adopted, adoptionNote: note !== undefined ? note : r.adoptionNote }
          : r
      ),
    }));
  },
  loadHistory: async () => {
    const history = await QAService.getHistory();
    set({ history });
  },
  clearCurrent: () => set({ currentRecord: null }),
}));
