import { create } from 'zustand';
import type {
  BorrowRecord,
  ReturnRecord,
  WaiverApplication,
  ReviewRecord,
  ImportBatch,
  ProcessedBorrowRecord,
  WaiverConclusion,
  FileType,
} from '@/types';
import { storage } from '@/utils/storage';
import { buildProcessedRecords } from '@/utils/borrowLogic';

interface LibraryState {
  borrows: BorrowRecord[];
  returns: ReturnRecord[];
  waivers: WaiverApplication[];
  reviews: ReviewRecord[];
  batches: ImportBatch[];
  processed: ProcessedBorrowRecord[];

  initFromStorage: () => void;
  importBorrows: (records: BorrowRecord[], batch: ImportBatch) => number;
  importReturns: (records: ReturnRecord[], batch: ImportBatch) => number;
  importWaivers: (applications: WaiverApplication[], batch: ImportBatch) => number;

  hasFileHash: (hash: string) => boolean;
  addBatch: (batch: ImportBatch) => void;

  updateReview: (
    borrowId: string,
    data: {
      reviewer: string;
      reviewOpinion: string;
      waiverConclusion: WaiverConclusion;
      finalWaiverAmount: number;
    },
  ) => void;

  getProcessedById: (id: string) => ProcessedBorrowRecord | undefined;

  clearAll: () => void;
  refreshProcessed: () => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  borrows: [],
  returns: [],
  waivers: [],
  reviews: [],
  batches: [],
  processed: [],

  initFromStorage: () => {
    const borrows = storage.getBorrowRecords();
    const returns = storage.getReturnRecords();
    const waivers = storage.getWaiverApplications();
    const reviews = storage.getReviewRecords();
    const batches = storage.getImportBatches();
    set({
      borrows,
      returns,
      waivers,
      reviews,
      batches,
      processed: buildProcessedRecords(borrows, returns, waivers, reviews),
    });
  },

  refreshProcessed: () => {
    const { borrows, returns, waivers, reviews } = get();
    set({ processed: buildProcessedRecords(borrows, returns, waivers, reviews) });
  },

  hasFileHash: (hash: string) => {
    return get().batches.some((b) => b.fileHash === hash);
  },

  addBatch: (batch: ImportBatch) => {
    const batches = [...get().batches, batch];
    storage.setImportBatches(batches);
    set({ batches });
  },

  importBorrows: (records: BorrowRecord[], batch: ImportBatch) => {
    const existing = get().borrows;
    const existingIds = new Set(existing.map((b) => b.borrowId));
    const newRecords = records.filter((r) => !existingIds.has(r.borrowId));
    const updated = [...existing, ...newRecords];
    storage.setBorrowRecords(updated);

    const batches = [...get().batches, { ...batch, recordCount: newRecords.length }];
    storage.setImportBatches(batches);

    set((state) => {
      const processed = buildProcessedRecords(updated, state.returns, state.waivers, state.reviews);
      return { borrows: updated, batches, processed };
    });
    return newRecords.length;
  },

  importReturns: (records: ReturnRecord[], batch: ImportBatch) => {
    const existing = get().returns;
    const existingKeys = new Set(existing.map((r) => r.borrowId + '|' + r.batchId));
    const newRecords = records.filter((r) => !existingKeys.has(r.borrowId + '|' + r.batchId));
    const updated = [...existing, ...newRecords];
    storage.setReturnRecords(updated);

    const batches = [...get().batches, { ...batch, recordCount: newRecords.length }];
    storage.setImportBatches(batches);

    set((state) => {
      const processed = buildProcessedRecords(state.borrows, updated, state.waivers, state.reviews);
      return { returns: updated, batches, processed };
    });
    return newRecords.length;
  },

  importWaivers: (applications: WaiverApplication[], batch: ImportBatch) => {
    const existing = get().waivers;
    const existingIds = new Set(existing.map((w) => w.applicationId));
    const newRecords = applications.filter((w) => !existingIds.has(w.applicationId));
    const updated = [...existing, ...newRecords];
    storage.setWaiverApplications(updated);

    const batches = [...get().batches, { ...batch, recordCount: newRecords.length }];
    storage.setImportBatches(batches);

    set((state) => {
      const processed = buildProcessedRecords(state.borrows, state.returns, updated, state.reviews);
      return { waivers: updated, batches, processed };
    });
    return newRecords.length;
  },

  updateReview: (borrowId, data) => {
    const existing = get().reviews;
    const idx = existing.findIndex((r) => r.borrowId === borrowId);
    const now = new Date().toISOString().slice(0, 10);
    const updatedRecord: ReviewRecord = {
      borrowId,
      reviewer: data.reviewer,
      reviewOpinion: data.reviewOpinion,
      waiverConclusion: data.waiverConclusion,
      finalWaiverAmount: data.finalWaiverAmount,
      reviewDate: now,
      status: 'reviewed',
    };
    const updated =
      idx >= 0 ? existing.map((r, i) => (i === idx ? updatedRecord : r)) : [...existing, updatedRecord];
    storage.setReviewRecords(updated);

    set((state) => {
      const processed = buildProcessedRecords(state.borrows, state.returns, state.waivers, updated);
      return { reviews: updated, processed };
    });
  },

  getProcessedById: (id: string) => {
    return get().processed.find((p) => p.borrow.borrowId === id);
  },

  clearAll: () => {
    storage.clearAll();
    set({
      borrows: [],
      returns: [],
      waivers: [],
      reviews: [],
      batches: [],
      processed: [],
    });
  },
}));
