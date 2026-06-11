import { create } from 'zustand';
import type { Complaint, Owner, Staff, CleaningReport, Filters, KPISummary, RepeatComplaintGroup } from '@/types';
import { cleanData, type RawComplaintRow } from '@/utils/dataCleaner';
import { 
  calculateKPIs, 
  findLongestRunning, 
  findRepeatHotspots, 
  calculateStaffPerformance 
} from '@/utils/metrics';
import { generateMockData } from '@/utils/mockData';

interface ComplaintStore {
  complaints: Complaint[];
  owners: Owner[];
  cleaningReport: CleaningReport | null;
  filters: Filters;
  hasData: boolean;
  
  setFilters: (filters: Partial<Filters>) => void;
  importData: (rows: RawComplaintRow[]) => void;
  loadMockData: () => void;
  clearData: () => void;
  
  getFilteredComplaints: () => Complaint[];
  getKPIs: () => KPISummary;
  getLongestRunning: (limit?: number) => Complaint[];
  getRepeatHotspots: () => RepeatComplaintGroup[];
  getStaffPerformance: () => Staff[];
  getUniqueCommunities: () => string[];
  getUniqueBuildings: () => string[];
  getUniqueProblemTypes: () => string[];
  getUniqueStaff: () => Array<{ id: string; name: string }>;
}

const defaultFilters: Filters = {
  communities: [],
  buildings: [],
  problemTypes: [],
  sources: [],
  staffIds: [],
  dateRange: [null, null],
};

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
  complaints: [],
  owners: [],
  cleaningReport: null,
  filters: defaultFilters,
  hasData: false,

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  importData: (rows) => {
    const { complaints, owners, report } = cleanData(rows);
    set({ complaints, owners, cleaningReport: report, hasData: true });
  },

  loadMockData: () => {
    const mock = generateMockData(150);
    const { complaints, owners, report } = cleanData(mock);
    set({ complaints, owners, cleaningReport: report, hasData: true });
  },

  clearData: () => {
    set({ complaints: [], owners: [], cleaningReport: null, filters: defaultFilters, hasData: false });
  },

  getFilteredComplaints: () => {
    const { complaints, filters } = get();
    return complaints.filter(c => {
      if (filters.communities.length > 0 && !filters.communities.includes(c.community)) return false;
      if (filters.buildings.length > 0 && !filters.buildings.includes(c.building)) return false;
      if (filters.problemTypes.length > 0 && !filters.problemTypes.includes(c.problemType)) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(c.source)) return false;
      if (filters.staffIds.length > 0 && !filters.staffIds.includes(c.staffId)) return false;
      if (filters.dateRange[0] && c.receiveTime && c.receiveTime < filters.dateRange[0]) return false;
      if (filters.dateRange[1] && c.receiveTime && c.receiveTime > filters.dateRange[1]) return false;
      return true;
    });
  },

  getKPIs: () => calculateKPIs(get().getFilteredComplaints()),
  getLongestRunning: (limit = 10) => findLongestRunning(get().getFilteredComplaints(), limit),
  getRepeatHotspots: () => findRepeatHotspots(get().getFilteredComplaints()),
  getStaffPerformance: () => calculateStaffPerformance(get().getFilteredComplaints()),

  getUniqueCommunities: () => {
    return Array.from(new Set(get().complaints.map(c => c.community))).sort();
  },
  getUniqueBuildings: () => {
    const { complaints, filters } = get();
    const filtered = filters.communities.length > 0 
      ? complaints.filter(c => filters.communities.includes(c.community))
      : complaints;
    return Array.from(new Set(filtered.map(c => c.building))).sort();
  },
  getUniqueProblemTypes: () => {
    return Array.from(new Set(get().complaints.map(c => c.problemType))).sort();
  },
  getUniqueStaff: () => {
    const map = new Map<string, string>();
    get().complaints.forEach(c => map.set(c.staffId, c.staffName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  },
}));
