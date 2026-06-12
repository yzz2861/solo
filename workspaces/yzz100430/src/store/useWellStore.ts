import { create } from 'zustand';
import {
  Village,
  Well,
  SampleRecord,
  LabResult,
  FeedbackRecord,
  ThresholdConfig,
  AdviceTemplate,
  MergedRecord,
  MergeStats,
  RiskLevel,
} from '@/types/well';
import {
  DEFAULT_ADVICE,
  DEFAULT_THRESHOLDS,
  MOCK_FEEDBACKS,
  MOCK_LAB_RESULTS,
  MOCK_SAMPLES,
  MOCK_VILLAGES,
  MOCK_WELLS,
} from '@/data/mock';
import { mergeAndAnalyze, MergeContext } from '@/utils/mergeEngine';

interface WellState {
  villages: Village[];
  wells: Well[];
  samples: SampleRecord[];
  labResults: LabResult[];
  feedbacks: FeedbackRecord[];
  mergedRecords: MergedRecord[];
  mergeStats: MergeStats | null;
  thresholds: ThresholdConfig;
  adviceTemplates: AdviceTemplate[];
  customAdvices: Record<string, string>;
  lastMergeAt: number | null;
  isMockLoaded: boolean;

  setVillages: (v: Village[]) => void;
  setWells: (w: Well[]) => void;
  setThresholds: (t: ThresholdConfig) => void;
  setAdviceTemplates: (a: AdviceTemplate[]) => void;

  importLabResults: (rows: LabResult[]) => void;
  importSamples: (rows: SampleRecord[]) => void;
  importFeedbacks: (rows: FeedbackRecord[]) => void;
  updateWellCommonName: (wellId: string, commonName: string) => void;

  runMerge: () => void;
  updateCustomAdvice: (recordId: string, text: string) => void;

  loadMockData: () => void;
  clearAll: () => void;
  hydrateFromStorage: () => void;

  getLatestPerWell: (villageId?: string) => MergedRecord[];
  getWellRecords: (wellId: string) => MergedRecord[];
  getVillageRiskCounts: (villageId: string) => Record<RiskLevel, number>;
  getAdviceForRecord: (record: MergedRecord) => AdviceTemplate & { finalText: string; forwardText: string };
}

const STORAGE_KEY = 'well_test_data_v1';
const PERSIST_KEYS = [
  'villages',
  'wells',
  'samples',
  'labResults',
  'feedbacks',
  'thresholds',
  'adviceTemplates',
  'customAdvices',
  'isMockLoaded',
] as const;

type PersistSlice = Pick<WellState, (typeof PERSIST_KEYS)[number]>;

const safeReadStorage = (): PersistSlice | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistSlice;
  } catch {
    return null;
  }
};

const safeWriteStorage = (state: PersistSlice) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const buildGetters = (state: WellState) => ({
  getLatestPerWell(villageId?: string) {
    const map = new Map<string, MergedRecord>();
    state.mergedRecords.forEach((r) => {
      if (villageId && r.villageId !== villageId) return;
      const existing = map.get(r.wellId);
      if (!existing || r.sampleDate > existing.sampleDate) {
        map.set(r.wellId, r);
      }
    });
    return Array.from(map.values());
  },
  getWellRecords(wellId: string) {
    return state.mergedRecords
      .filter((r) => r.wellId === wellId)
      .sort((a, b) => a.sampleDate.localeCompare(b.sampleDate));
  },
  getVillageRiskCounts(villageId: string) {
    const latest = buildGetters(state).getLatestPerWell(villageId);
    const counts = { STOP: 0, RETEST: 0, OBSERVE: 0 } as Record<RiskLevel, number>;
    latest.forEach((r) => {
      counts[r.riskLevel]++;
    });
    return counts;
  },
  getAdviceForRecord(record: MergedRecord) {
    const tpl =
      state.adviceTemplates.find((a) => a.risk === record.riskLevel) ||
      state.adviceTemplates[state.adviceTemplates.length - 1];
    const custom = state.customAdvices[record.id];
    const finalText = custom || tpl.suggestion;
    const forwardText = tpl.forwardTemplate.replace('{wellName}', record.wellCommonName);
    return { ...tpl, finalText, forwardText };
  },
});

let storageSubscriberInitialized = false;

const initialPersisted = safeReadStorage();

export const useWellStore = create<WellState>((set, get) => ({
  villages: initialPersisted?.villages ?? [],
  wells: initialPersisted?.wells ?? [],
  samples: initialPersisted?.samples ?? [],
  labResults: initialPersisted?.labResults ?? [],
  feedbacks: initialPersisted?.feedbacks ?? [],
  mergedRecords: [],
  mergeStats: null,
  thresholds: initialPersisted?.thresholds ?? { ...DEFAULT_THRESHOLDS },
  adviceTemplates: initialPersisted?.adviceTemplates ?? [...DEFAULT_ADVICE],
  customAdvices: initialPersisted?.customAdvices ?? {},
  lastMergeAt: null,
  isMockLoaded: initialPersisted?.isMockLoaded ?? false,

  setVillages: (v) => set({ villages: v }),
  setWells: (w) => set({ wells: w }),
  setThresholds: (t) => set({ thresholds: t }),
  setAdviceTemplates: (a) => set({ adviceTemplates: a }),

  importLabResults: (rows) =>
    set((s) => ({ labResults: [...s.labResults, ...rows] })),
  importSamples: (rows) =>
    set((s) => ({ samples: [...s.samples, ...rows] })),
  importFeedbacks: (rows) =>
    set((s) => ({ feedbacks: [...s.feedbacks, ...rows] })),

  updateWellCommonName: (wellId, commonName) =>
    set((s) => ({
      wells: s.wells.map((w) =>
        w.id === wellId ? { ...w, commonName } : w,
      ),
    })),

  runMerge: () => {
    const s = get();
    const ctx: MergeContext = {
      villages: s.villages,
      wells: s.wells,
      samples: s.samples,
      labResults: s.labResults,
      feedbacks: s.feedbacks,
      thresholds: s.thresholds,
    };
    const { records, stats } = mergeAndAnalyze(ctx);
    set({ mergedRecords: records, mergeStats: stats, lastMergeAt: Date.now() });
  },

  updateCustomAdvice: (recordId, text) =>
    set((s) => ({
      customAdvices: { ...s.customAdvices, [recordId]: text },
    })),

  loadMockData: () => {
    set({
      villages: MOCK_VILLAGES,
      wells: MOCK_WELLS,
      samples: MOCK_SAMPLES,
      labResults: MOCK_LAB_RESULTS,
      feedbacks: MOCK_FEEDBACKS,
      thresholds: { ...DEFAULT_THRESHOLDS },
      adviceTemplates: [...DEFAULT_ADVICE],
      customAdvices: {},
      isMockLoaded: true,
    });
    setTimeout(() => {
      get().runMerge();
    }, 50);
  },

  clearAll: () => {
    set({
      villages: [],
      wells: [],
      samples: [],
      labResults: [],
      feedbacks: [],
      mergedRecords: [],
      mergeStats: null,
      customAdvices: {},
      lastMergeAt: null,
      isMockLoaded: false,
    });
  },

  hydrateFromStorage: () => {
    const s = get();
    if (s.mergedRecords.length === 0 && (s.villages.length > 0 || s.isMockLoaded)) {
      get().runMerge();
    }
  },

  ...buildGetters({} as WellState),

  getLatestPerWell(villageId) {
    return buildGetters(get() as WellState).getLatestPerWell(villageId);
  },
  getWellRecords(wellId) {
    return buildGetters(get() as WellState).getWellRecords(wellId);
  },
  getVillageRiskCounts(villageId) {
    return buildGetters(get() as WellState).getVillageRiskCounts(villageId);
  },
  getAdviceForRecord(record) {
    return buildGetters(get() as WellState).getAdviceForRecord(record);
  },
}));

useWellStore.subscribe((state) => {
  const slice: PersistSlice = {} as PersistSlice;
  PERSIST_KEYS.forEach((k) => {
    (slice as any)[k] = state[k];
  });
  safeWriteStorage(slice);
  if (!storageSubscriberInitialized) storageSubscriberInitialized = true;
});
