import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SmsRecord, AnalysisResult, ReviewStatus, CategoryType, SeverityLevel } from '../types';
import { mockSmsRecords } from '../data/mockData';
import { classificationService } from '../services/classificationService';
import { privacyService } from '../services/privacyService';
import { useAuthStore } from './authStore';

interface SmsState {
  smsRecords: SmsRecord[];
  analysisResults: AnalysisResult[];
  isLoading: boolean;
  error: string | null;
  selectedIds: string[];
  initialized: boolean;

  initializeWithMockData: () => Promise<void>;
  addSmsRecord: (record: Omit<SmsRecord, 'id' | 'patientNameMasked' | 'phoneMasked' | 'importTime' | 'importedBy'>) => Promise<void>;
  addSmsRecords: (records: Omit<SmsRecord, 'id' | 'patientNameMasked' | 'phoneMasked' | 'importTime' | 'importedBy'>[]) => Promise<void>;
  analyzeAll: () => Promise<void>;
  updateAnalysisResult: (id: string, updates: Partial<AnalysisResult>) => void;
  updateReviewStatus: (id: string, status: ReviewStatus, note?: string) => void;
  batchUpdateReviewStatus: (ids: string[], status: ReviewStatus, note?: string) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelected: () => void;
  getSmsById: (id: string) => SmsRecord | undefined;
  getAnalysisBySmsId: (smsId: string) => AnalysisResult | undefined;
  getPendingReview: () => AnalysisResult[];
  getConfirmed: () => AnalysisResult[];
  getByCategory: (category: CategoryType) => AnalysisResult[];
  getBySeverity: (severity: SeverityLevel) => AnalysisResult[];
  getAdverseReactions: () => AnalysisResult[];
  getStatistics: () => {
    total: number;
    pending: number;
    confirmed: number;
    byCategory: Record<CategoryType, number>;
    bySeverity: Record<SeverityLevel, number>;
    adverseReactions: number;
  };
  reset: () => void;
}

const generateId = () => `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useSmsStore = create<SmsState>()(
  persist(
    (set, get) => ({
      smsRecords: [],
      analysisResults: [],
      isLoading: false,
      error: null,
      selectedIds: [],
      initialized: false,

      initializeWithMockData: async () => {
        if (get().initialized) return;

        set({ isLoading: true, error: null });
        try {
          const currentUser = useAuthStore.getState().currentUser;
          const records = mockSmsRecords.map((record) => ({
            ...record,
            patientNameMasked: privacyService.maskName(record.patientName),
            phoneMasked: privacyService.maskPhone(record.phone),
          }));

          const results = await classificationService.batchClassify(records);

          set({
            smsRecords: records,
            analysisResults: results,
            isLoading: false,
            initialized: true,
          });
        } catch (error) {
          set({ error: '初始化数据失败', isLoading: false });
        }
      },

      addSmsRecord: async (record) => {
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentUser) {
          set({ error: '请先登录' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const newRecord: SmsRecord = {
            ...record,
            id: generateId(),
            patientNameMasked: privacyService.maskName(record.patientName),
            phoneMasked: privacyService.maskPhone(record.phone),
            importTime: new Date(),
            importedBy: currentUser.id,
          };

          const analysisResult = await classificationService.classify(newRecord);

          set((state) => ({
            smsRecords: [...state.smsRecords, newRecord],
            analysisResults: [...state.analysisResults, analysisResult],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: '添加短信记录失败', isLoading: false });
        }
      },

      addSmsRecords: async (records) => {
        const currentUser = useAuthStore.getState().currentUser;
        if (!currentUser) {
          set({ error: '请先登录' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const newRecords: SmsRecord[] = records.map((record) => ({
            ...record,
            id: generateId(),
            patientNameMasked: privacyService.maskName(record.patientName),
            phoneMasked: privacyService.maskPhone(record.phone),
            importTime: new Date(),
            importedBy: currentUser.id,
          }));

          const analysisResults = await classificationService.batchClassify(newRecords);

          set((state) => ({
            smsRecords: [...state.smsRecords, ...newRecords],
            analysisResults: [...state.analysisResults, ...analysisResults],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: '批量添加短信记录失败', isLoading: false });
        }
      },

      analyzeAll: async () => {
        set({ isLoading: true, error: null });
        try {
          const results = await classificationService.batchClassify(get().smsRecords);
          set({ analysisResults: results, isLoading: false });
        } catch (error) {
          set({ error: '分析失败', isLoading: false });
        }
      },

      updateAnalysisResult: (id, updates) => {
        set((state) => ({
          analysisResults: state.analysisResults.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      updateReviewStatus: (id, status, note) => {
        const currentUser = useAuthStore.getState().currentUser;
        set((state) => ({
          analysisResults: state.analysisResults.map((r) =>
            r.id === id
              ? {
                  ...r,
                  reviewStatus: status,
                  reviewedBy: currentUser?.id,
                  reviewedAt: new Date(),
                  reviewNote: note || r.reviewNote,
                }
              : r
          ),
        }));
      },

      batchUpdateReviewStatus: (ids, status, note) => {
        const currentUser = useAuthStore.getState().currentUser;
        set((state) => ({
          analysisResults: state.analysisResults.map((r) =>
            ids.includes(r.id)
              ? {
                  ...r,
                  reviewStatus: status,
                  reviewedBy: currentUser?.id,
                  reviewedAt: new Date(),
                  reviewNote: note || r.reviewNote,
                }
              : r
          ),
        }));
      },

      toggleSelected: (id) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((i) => i !== id)
            : [...state.selectedIds, id],
        }));
      },

      selectAll: (ids) => {
        set({ selectedIds: ids });
      },

      clearSelected: () => {
        set({ selectedIds: [] });
      },

      getSmsById: (id) => {
        return get().smsRecords.find((s) => s.id === id);
      },

      getAnalysisBySmsId: (smsId) => {
        return get().analysisResults.find((r) => r.smsId === smsId);
      },

      getPendingReview: () => {
        return get().analysisResults.filter((r) => r.reviewStatus === 'pending');
      },

      getConfirmed: () => {
        return get().analysisResults.filter(
          (r) => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified'
        );
      },

      getByCategory: (category) => {
        return get().analysisResults.filter((r) => r.category === category);
      },

      getBySeverity: (severity) => {
        return get().analysisResults.filter((r) => r.severity === severity);
      },

      getAdverseReactions: () => {
        return get().analysisResults.filter((r) => r.category === 'adverse_reaction');
      },

      getStatistics: () => {
        const { analysisResults } = get();
        const total = analysisResults.length;
        const pending = analysisResults.filter((r) => r.reviewStatus === 'pending').length;
        const confirmed = analysisResults.filter(
          (r) => r.reviewStatus === 'confirmed' || r.reviewStatus === 'modified'
        ).length;
        const adverseReactions = analysisResults.filter(
          (r) => r.category === 'adverse_reaction'
        ).length;

        const byCategory: Record<CategoryType, number> = {
          symptom_change: 0,
          medication_issue: 0,
          adverse_reaction: 0,
          need_visit: 0,
          observation_only: 0,
        };
        const bySeverity: Record<SeverityLevel, number> = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          unknown: 0,
        };

        for (const result of analysisResults) {
          byCategory[result.category]++;
          bySeverity[result.severity]++;
        }

        return { total, pending, confirmed, byCategory, bySeverity, adverseReactions };
      },

      reset: () => {
        set({
          smsRecords: [],
          analysisResults: [],
          isLoading: false,
          error: null,
          selectedIds: [],
          initialized: false,
        });
      },
    }),
    {
      name: 'sms-storage',
      partialize: (state) => ({
        smsRecords: state.smsRecords,
        analysisResults: state.analysisResults,
        initialized: state.initialized,
      }),
    }
  )
);
