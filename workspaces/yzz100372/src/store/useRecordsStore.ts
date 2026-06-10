import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CuppingRecord, FilterOptions } from '@/types';
import { getMockRecords } from '@/data/mockData';

interface RecordsState {
  records: CuppingRecord[];
  filters: FilterOptions;
  isFormOpen: boolean;
  editingRecord: CuppingRecord | null;
  selectedRecord: CuppingRecord | null;
  
  setRecords: (records: CuppingRecord[]) => void;
  addRecord: (record: Omit<CuppingRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRecord: (id: string, record: Partial<CuppingRecord>) => void;
  deleteRecord: (id: string) => void;
  
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  
  openForm: (record?: CuppingRecord) => void;
  closeForm: () => void;
  
  setSelectedRecord: (record: CuppingRecord | null) => void;
  
  loadMockData: () => void;
  clearAllData: () => void;
}

const initialFilters: FilterOptions = {
  batch: '',
  onSale: 'all',
  retest: 'all',
  search: '',
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const createNewRecord = (): Omit<CuppingRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  origin: '',
  process: '水洗',
  batch: '',
  cupper: '',
  cuppingDate: new Date().toISOString().split('T')[0],
  scores: {
    aroma: 7.5,
    acidity: 7.5,
    sweetness: 7.5,
    body: 7.5,
    balance: 7.5,
    overall: 7.5,
  },
  aromaNotes: '',
  flavorNotes: '',
  defects: [],
  notes: '',
  brewParams: {
    grinder: '',
    grindSize: '中细',
    waterTemp: 92,
    ratio: '1:15',
  },
  status: {
    isOnSale: false,
    isRetest: false,
  },
});

export const useRecordsStore = create<RecordsState>()(
  persist(
    (set) => ({
      records: [],
      filters: initialFilters,
      isFormOpen: false,
      editingRecord: null,
      selectedRecord: null,

      setRecords: (records) => set({ records }),

      addRecord: (recordData) => {
        const now = new Date().toISOString();
        const newRecord: CuppingRecord = {
          ...recordData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          records: [newRecord, ...state.records],
        }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((record) =>
            record.id === id
              ? { ...record, ...updates, updatedAt: new Date().toISOString() }
              : record
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((record) => record.id !== id),
          selectedRecord: state.selectedRecord?.id === id ? null : state.selectedRecord,
        }));
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      resetFilters: () => {
        set({ filters: initialFilters });
      },

      openForm: (record) => {
        set({
          isFormOpen: true,
          editingRecord: record || null,
        });
      },

      closeForm: () => {
        set({
          isFormOpen: false,
          editingRecord: null,
        });
      },

      setSelectedRecord: (record) => {
        set({ selectedRecord: record });
      },

      loadMockData: () => {
        const mockData = getMockRecords();
        set({ records: mockData });
      },

      clearAllData: () => {
        set({ records: [] });
      },
    }),
    {
      name: 'cupping-records-storage',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state && state.records.length === 0) {
          state.loadMockData();
        }
      },
    }
  )
);

export const useFilteredRecords = () => {
  const { records, filters } = useRecordsStore();
  
  return records.filter((record) => {
    if (filters.batch && record.batch !== filters.batch) {
      return false;
    }
    
    if (filters.onSale !== 'all') {
      const isOnSale = filters.onSale === 'yes';
      if (record.status.isOnSale !== isOnSale) {
        return false;
      }
    }
    
    if (filters.retest !== 'all') {
      const isRetest = filters.retest === 'yes';
      if (record.status.isRetest !== isRetest) {
        return false;
      }
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [
        record.origin,
        record.process,
        record.batch,
        record.cupper,
        record.flavorNotes,
        record.aromaNotes,
        ...record.defects,
      ].join(' ').toLowerCase();
      
      if (!searchFields.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });
};

export const useUniqueBatches = () => {
  const records = useRecordsStore((state) => state.records);
  const batches = new Set(records.map((r) => r.batch));
  return Array.from(batches).sort();
};

export { createNewRecord };
