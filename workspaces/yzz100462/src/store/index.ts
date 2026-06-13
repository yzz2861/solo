import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Species,
  Feed,
  FeedStock,
  Keeper,
  Guide,
  Exhibit,
  WaterQualityNote,
  FastingPeriod,
  FeedingSession,
  ConflictAlert,
} from '@/types';
import { uid, todayISO } from '@/utils';
import { detectConflicts, scanAllConflicts } from '@/utils/conflicts';

const today = todayISO();
const tomorrow = (() => {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

const seedExhibits: Exhibit[] = [
  { id: 'ex-shark', name: '鲨鱼展区', description: '深海隧道主池' },
  { id: 'ex-penguin', name: '企鹅展区', description: '极地企鹅馆' },
  { id: 'ex-jelly', name: '水母展区', description: '梦幻水母宫' },
];

const seedSpecies: Species[] = [
  { id: 'sp-shark', name: '黑鳍鲨', emoji: '🦈', exhibitId: 'ex-shark', defaultFeedAmountGrams: 800 },
  { id: 'sp-ray', name: '赤魟', emoji: '🐟', exhibitId: 'ex-shark', defaultFeedAmountGrams: 400 },
  { id: 'sp-penguin', name: '巴布亚企鹅', emoji: '🐧', exhibitId: 'ex-penguin', defaultFeedAmountGrams: 300 },
  { id: 'sp-jelly', name: '海月水母', emoji: '🪼', exhibitId: 'ex-jelly', defaultFeedAmountGrams: 80 },
];

const seedFeeds: Feed[] = [
  { id: 'fd-fish', name: '冰鲜杂鱼', unit: 'g', safetyThreshold: 5000 },
  { id: 'fd-krill', name: '南极磷虾', unit: 'g', safetyThreshold: 2000 },
  { id: 'fd-plankton', name: '浮游生物饵料', unit: 'ml', safetyThreshold: 3000 },
];

const seedFeedStocks: FeedStock[] = [
  { id: uid(), feedId: 'fd-fish', currentStock: 12000, lastUpdated: today },
  { id: uid(), feedId: 'fd-krill', currentStock: 1500, lastUpdated: today },
  { id: uid(), feedId: 'fd-plankton', currentStock: 4200, lastUpdated: today },
];

const seedKeepers: Keeper[] = [
  { id: 'kp-chen', name: '陈海洋', phone: '13800000001' },
  { id: 'kp-liu', name: '刘深蓝', phone: '13800000002' },
  { id: 'kp-zhao', name: '赵海潮', phone: '13800000003' },
];

const seedGuides: Guide[] = [
  { id: 'gd-wang', name: '王小鸥', phone: '13900000001' },
  { id: 'gd-sun', name: '孙珊瑚', phone: '13900000002' },
];

const seedWaterQuality: WaterQualityNote[] = [
  { id: uid(), exhibitId: 'ex-shark', date: today, startTime: '13:00', endTime: '14:00', notes: '每周三常规水质净化' },
  { id: uid(), exhibitId: 'ex-penguin', date: today, startTime: '12:30', endTime: '13:30', notes: '过滤系统反冲洗' },
];

const seedFasting: FastingPeriod[] = [];

const seedSessions: FeedingSession[] = [
  {
    id: uid(),
    date: today,
    startTime: '09:30',
    endTime: '10:00',
    speciesId: 'sp-shark',
    feedId: 'fd-fish',
    feedAmountGrams: 800,
    keeperId: 'kp-chen',
    guideId: 'gd-wang',
    exhibitId: 'ex-shark',
    isVisitorVisible: true,
    status: 'scheduled',
  },
  {
    id: uid(),
    date: today,
    startTime: '10:30',
    endTime: '11:00',
    speciesId: 'sp-penguin',
    feedId: 'fd-krill',
    feedAmountGrams: 300,
    keeperId: 'kp-liu',
    guideId: 'gd-sun',
    exhibitId: 'ex-penguin',
    isVisitorVisible: true,
    status: 'scheduled',
  },
  {
    id: uid(),
    date: today,
    startTime: '11:00',
    endTime: '11:30',
    speciesId: 'sp-jelly',
    feedId: 'fd-plankton',
    feedAmountGrams: 80,
    keeperId: 'kp-zhao',
    guideId: null,
    exhibitId: 'ex-jelly',
    isVisitorVisible: false,
    status: 'scheduled',
  },
  {
    id: uid(),
    date: tomorrow,
    startTime: '10:00',
    endTime: '10:30',
    speciesId: 'sp-ray',
    feedId: 'fd-fish',
    feedAmountGrams: 400,
    keeperId: 'kp-chen',
    guideId: 'gd-wang',
    exhibitId: 'ex-shark',
    isVisitorVisible: true,
    status: 'scheduled',
  },
];

export interface AppState {
  species: Species[];
  feeds: Feed[];
  feedStocks: FeedStock[];
  keepers: Keeper[];
  guides: Guide[];
  exhibits: Exhibit[];
  waterQualityNotes: WaterQualityNote[];
  fastingPeriods: FastingPeriod[];
  feedingSessions: FeedingSession[];
  selectedDate: string;
  viewMode: 'day' | 'week';

  addSpecies: (s: Omit<Species, 'id'>) => void;
  updateSpecies: (id: string, s: Partial<Species>) => void;
  deleteSpecies: (id: string) => void;

  addFeed: (f: Omit<Feed, 'id'>) => void;
  updateFeed: (id: string, f: Partial<Feed>) => void;
  deleteFeed: (id: string) => void;
  updateFeedStock: (feedId: string, stock: number) => void;

  addKeeper: (k: Omit<Keeper, 'id'>) => void;
  updateKeeper: (id: string, k: Partial<Keeper>) => void;
  deleteKeeper: (id: string) => void;

  addGuide: (g: Omit<Guide, 'id'>) => void;
  updateGuide: (id: string, g: Partial<Guide>) => void;
  deleteGuide: (id: string) => void;

  addExhibit: (e: Omit<Exhibit, 'id'>) => void;
  updateExhibit: (id: string, e: Partial<Exhibit>) => void;
  deleteExhibit: (id: string) => void;

  addWaterQualityNote: (w: Omit<WaterQualityNote, 'id'>) => void;
  updateWaterQualityNote: (id: string, w: Partial<WaterQualityNote>) => void;
  deleteWaterQualityNote: (id: string) => void;

  addFastingPeriod: (f: Omit<FastingPeriod, 'id'>) => void;
  updateFastingPeriod: (id: string, f: Partial<FastingPeriod>) => void;
  deleteFastingPeriod: (id: string) => void;

  addFeedingSession: (s: Omit<FeedingSession, 'id'>) => { success: boolean; conflicts: ConflictAlert[] };
  updateFeedingSession: (id: string, s: Partial<FeedingSession>) => { success: boolean; conflicts: ConflictAlert[] };
  deleteFeedingSession: (id: string) => void;

  setSelectedDate: (d: string) => void;
  setViewMode: (m: 'day' | 'week') => void;

  detectConflictsFor: (session: FeedingSession, excludeId?: string) => ConflictAlert[];
  getAllConflicts: () => ConflictAlert[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      species: seedSpecies,
      feeds: seedFeeds,
      feedStocks: seedFeedStocks,
      keepers: seedKeepers,
      guides: seedGuides,
      exhibits: seedExhibits,
      waterQualityNotes: seedWaterQuality,
      fastingPeriods: seedFasting,
      feedingSessions: seedSessions,
      selectedDate: today,
      viewMode: 'week',

      addSpecies: (s) => set((st) => ({ species: [...st.species, { ...s, id: uid() }] })),
      updateSpecies: (id, s) => set((st) => ({ species: st.species.map((x) => (x.id === id ? { ...x, ...s } : x)) })),
      deleteSpecies: (id) => set((st) => ({ species: st.species.filter((x) => x.id !== id) })),

      addFeed: (f) => {
        const id = uid();
        set((st) => ({
          feeds: [...st.feeds, { ...f, id }],
          feedStocks: [...st.feedStocks, { id: uid(), feedId: id, currentStock: 0, lastUpdated: todayISO() }],
        }));
      },
      updateFeed: (id, f) => set((st) => ({ feeds: st.feeds.map((x) => (x.id === id ? { ...x, ...f } : x)) })),
      deleteFeed: (id) => set((st) => ({ feeds: st.feeds.filter((x) => x.id !== id), feedStocks: st.feedStocks.filter((x) => x.feedId !== id) })),
      updateFeedStock: (feedId, stock) =>
        set((st) => {
          const existing = st.feedStocks.find((x) => x.feedId === feedId);
          if (existing) {
            return {
              feedStocks: st.feedStocks.map((x) =>
                x.feedId === feedId ? { ...x, currentStock: stock, lastUpdated: todayISO() } : x,
              ),
            };
          }
          return {
            feedStocks: [...st.feedStocks, { id: uid(), feedId, currentStock: stock, lastUpdated: todayISO() }],
          };
        }),

      addKeeper: (k) => set((st) => ({ keepers: [...st.keepers, { ...k, id: uid() }] })),
      updateKeeper: (id, k) => set((st) => ({ keepers: st.keepers.map((x) => (x.id === id ? { ...x, ...k } : x)) })),
      deleteKeeper: (id) => set((st) => ({ keepers: st.keepers.filter((x) => x.id !== id) })),

      addGuide: (g) => set((st) => ({ guides: [...st.guides, { ...g, id: uid() }] })),
      updateGuide: (id, g) => set((st) => ({ guides: st.guides.map((x) => (x.id === id ? { ...x, ...g } : x)) })),
      deleteGuide: (id) => set((st) => ({ guides: st.guides.filter((x) => x.id !== id) })),

      addExhibit: (e) => set((st) => ({ exhibits: [...st.exhibits, { ...e, id: uid() }] })),
      updateExhibit: (id, e) => set((st) => ({ exhibits: st.exhibits.map((x) => (x.id === id ? { ...x, ...e } : x)) })),
      deleteExhibit: (id) => set((st) => ({ exhibits: st.exhibits.filter((x) => x.id !== id) })),

      addWaterQualityNote: (w) => set((st) => ({ waterQualityNotes: [...st.waterQualityNotes, { ...w, id: uid() }] })),
      updateWaterQualityNote: (id, w) => set((st) => ({ waterQualityNotes: st.waterQualityNotes.map((x) => (x.id === id ? { ...x, ...w } : x)) })),
      deleteWaterQualityNote: (id) => set((st) => ({ waterQualityNotes: st.waterQualityNotes.filter((x) => x.id !== id) })),

      addFastingPeriod: (f) => set((st) => ({ fastingPeriods: [...st.fastingPeriods, { ...f, id: uid() }] })),
      updateFastingPeriod: (id, f) => set((st) => ({ fastingPeriods: st.fastingPeriods.map((x) => (x.id === id ? { ...x, ...f } : x)) })),
      deleteFastingPeriod: (id) => set((st) => ({ fastingPeriods: st.fastingPeriods.filter((x) => x.id !== id) })),

      addFeedingSession: (s) => {
        const st = get();
        const full: FeedingSession = { ...s, id: uid() };
        const conflicts = detectConflicts(full, {
          species: st.species,
          feeds: st.feeds,
          feedStocks: st.feedStocks,
          fastingPeriods: st.fastingPeriods,
          waterQualityNotes: st.waterQualityNotes,
          allSessions: st.feedingSessions,
        });
        const hasError = conflicts.some((c) => c.severity === 'error');
        if (hasError) return { success: false, conflicts };
        set((prev) => ({ feedingSessions: [...prev.feedingSessions, full] }));
        return { success: true, conflicts };
      },
      updateFeedingSession: (id, s) => {
        const st = get();
        const current = st.feedingSessions.find((x) => x.id === id);
        if (!current) return { success: false, conflicts: [] };
        const merged: FeedingSession = { ...current, ...s };
        const conflicts = detectConflicts(merged, {
          species: st.species,
          feeds: st.feeds,
          feedStocks: st.feedStocks,
          fastingPeriods: st.fastingPeriods,
          waterQualityNotes: st.waterQualityNotes,
          allSessions: st.feedingSessions,
        }, id);
        const hasError = conflicts.some((c) => c.severity === 'error');
        if (hasError) return { success: false, conflicts };
        set((prev) => ({ feedingSessions: prev.feedingSessions.map((x) => (x.id === id ? merged : x)) }));
        return { success: true, conflicts };
      },
      deleteFeedingSession: (id) => set((st) => ({ feedingSessions: st.feedingSessions.filter((x) => x.id !== id) })),

      setSelectedDate: (d) => set({ selectedDate: d }),
      setViewMode: (m) => set({ viewMode: m }),

      detectConflictsFor: (session, excludeId) => {
        const st = get();
        return detectConflicts(session, {
          species: st.species,
          feeds: st.feeds,
          feedStocks: st.feedStocks,
          fastingPeriods: st.fastingPeriods,
          waterQualityNotes: st.waterQualityNotes,
          allSessions: st.feedingSessions,
        }, excludeId);
      },
      getAllConflicts: () => {
        const st = get();
        return scanAllConflicts({
          species: st.species,
          feeds: st.feeds,
          feedStocks: st.feedStocks,
          fastingPeriods: st.fastingPeriods,
          waterQualityNotes: st.waterQualityNotes,
          allSessions: st.feedingSessions,
        });
      },
    }),
    {
      name: 'aquarium-scheduler-v1',
      partialize: (s) => ({
        species: s.species,
        feeds: s.feeds,
        feedStocks: s.feedStocks,
        keepers: s.keepers,
        guides: s.guides,
        exhibits: s.exhibits,
        waterQualityNotes: s.waterQualityNotes,
        fastingPeriods: s.fastingPeriods,
        feedingSessions: s.feedingSessions,
      }),
    },
  ),
);
