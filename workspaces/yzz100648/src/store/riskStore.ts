import { create } from 'zustand';
import { db } from '@/db';
import type { Risk, RiskCategory, RiskStatus, Response, FieldMapping } from '@/types';
import { mineRisks } from '@/engine/mining';

interface RiskState {
  risks: Risk[];
  responses: Response[];
  isMining: boolean;
  miningProgress: number;
  selectedCategory: RiskCategory | 'all';
  selectedStatus: RiskStatus | 'all';
  loadRisks: (projectId: string) => Promise<void>;
  loadResponses: (projectId: string) => Promise<void>;
  importResponses: (projectId: string, rows: Record<string, string>[], mapping: FieldMapping) => Promise<number>;
  startMining: (projectId: string, categories: RiskCategory[]) => Promise<void>;
  confirmRisk: (id: string) => Promise<void>;
  rejectRisk: (id: string) => Promise<void>;
  updateRiskStatus: (id: string, status: RiskStatus) => Promise<void>;
  updateRiskSuggestion: (id: string, suggestion: string) => Promise<void>;
  updateRiskAssignee: (id: string, assignee: string) => Promise<void>;
  setSelectedCategory: (category: RiskCategory | 'all') => void;
  setSelectedStatus: (status: RiskStatus | 'all') => void;
  getFilteredRisks: () => Risk[];
  deleteRisksByProject: (projectId: string) => Promise<void>;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  risks: [],
  responses: [],
  isMining: false,
  miningProgress: 0,
  selectedCategory: 'all',
  selectedStatus: 'all',

  loadRisks: async (projectId: string) => {
    const risks = await db.risks.where('projectId').equals(projectId).toArray();
    set({ risks });
  },

  loadResponses: async (projectId: string) => {
    const responses = await db.responses.where('projectId').equals(projectId).toArray();
    set({ responses });
  },

  importResponses: async (projectId: string, rows: Record<string, string>[], mapping: FieldMapping) => {
    const newResponses: Response[] = rows.map((row, index) => ({
      id: `resp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`,
      projectId,
      content: row[mapping.content] || '',
      respondentId: row[mapping.respondentId] || undefined,
      respondedAt: row[mapping.respondedAt] || undefined,
      rawRow: row,
    }));

    await db.responses.bulkAdd(newResponses);
    await get().loadResponses(projectId);
    return newResponses.length;
  },

  startMining: async (projectId: string, categories: RiskCategory[]) => {
    set({ isMining: true, miningProgress: 0 });
    const responses = await db.responses.where('projectId').equals(projectId).toArray();
    const existingRisks = await db.risks.where('projectId').equals(projectId).toArray();
    const existingQuotes = existingRisks.map(r => r.originalQuote);

    const totalSteps = responses.length;
    let processed = 0;
    const batchSize = 50;

    const allNewRisks: Risk[] = [];
    for (let i = 0; i < responses.length; i += batchSize) {
      const batch = responses.slice(i, i + batchSize);
      const batchRisks = mineRisks(batch, categories, existingQuotes);
      allNewRisks.push(...batchRisks);
      processed += batch.length;
      set({ miningProgress: Math.round((processed / totalSteps) * 100) });
      await new Promise(r => setTimeout(r, 50));
    }

    if (allNewRisks.length > 0) {
      await db.risks.bulkAdd(allNewRisks);
    }

    await get().loadRisks(projectId);
    set({ isMining: false, miningProgress: 100 });
  },

  confirmRisk: async (id: string) => {
    await db.risks.update(id, { status: 'confirmed', confirmedAt: Date.now() });
    const risks = get().risks.map(r => r.id === id ? { ...r, status: 'confirmed' as RiskStatus, confirmedAt: Date.now() } : r);
    set({ risks });
  },

  rejectRisk: async (id: string) => {
    await db.risks.update(id, { status: 'rejected' });
    const risks = get().risks.map(r => r.id === id ? { ...r, status: 'rejected' as RiskStatus } : r);
    set({ risks });
  },

  updateRiskStatus: async (id: string, status: RiskStatus) => {
    await db.risks.update(id, { status });
    const risks = get().risks.map(r => r.id === id ? { ...r, status } : r);
    set({ risks });
  },

  updateRiskSuggestion: async (id: string, suggestion: string) => {
    await db.risks.update(id, { handlingSuggestion: suggestion });
    const risks = get().risks.map(r => r.id === id ? { ...r, handlingSuggestion: suggestion } : r);
    set({ risks });
  },

  updateRiskAssignee: async (id: string, assignee: string) => {
    await db.risks.update(id, { assignee });
    const risks = get().risks.map(r => r.id === id ? { ...r, assignee } : r);
    set({ risks });
  },

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),

  getFilteredRisks: () => {
    const { risks, selectedCategory, selectedStatus } = get();
    return risks.filter(r => {
      if (selectedCategory !== 'all' && r.riskCategory !== selectedCategory) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      return true;
    });
  },

  deleteRisksByProject: async (projectId: string) => {
    await db.risks.where('projectId').equals(projectId).delete();
    await db.responses.where('projectId').equals(projectId).delete();
    set({ risks: [], responses: [] });
  },
}));
