import type { ImportBatch, BorrowRecord, ReturnRecord, WaiverApplication, ReviewRecord } from '@/types';

const KEYS = {
  BORROW_RECORDS: 'lib_clearance_borrows',
  RETURN_RECORDS: 'lib_clearance_returns',
  WAIVER_APPLICATIONS: 'lib_clearance_waivers',
  REVIEW_RECORDS: 'lib_clearance_reviews',
  IMPORT_BATCHES: 'lib_clearance_batches',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write failed:', e);
  }
}

export const storage = {
  getBorrowRecords(): BorrowRecord[] {
    return safeGet<BorrowRecord[]>(KEYS.BORROW_RECORDS, []);
  },
  setBorrowRecords(records: BorrowRecord[]): void {
    safeSet(KEYS.BORROW_RECORDS, records);
  },

  getReturnRecords(): ReturnRecord[] {
    return safeGet<ReturnRecord[]>(KEYS.RETURN_RECORDS, []);
  },
  setReturnRecords(records: ReturnRecord[]): void {
    safeSet(KEYS.RETURN_RECORDS, records);
  },

  getWaiverApplications(): WaiverApplication[] {
    return safeGet<WaiverApplication[]>(KEYS.WAIVER_APPLICATIONS, []);
  },
  setWaiverApplications(applications: WaiverApplication[]): void {
    safeSet(KEYS.WAIVER_APPLICATIONS, applications);
  },

  getReviewRecords(): ReviewRecord[] {
    return safeGet<ReviewRecord[]>(KEYS.REVIEW_RECORDS, []);
  },
  setReviewRecords(records: ReviewRecord[]): void {
    safeSet(KEYS.REVIEW_RECORDS, records);
  },

  getImportBatches(): ImportBatch[] {
    return safeGet<ImportBatch[]>(KEYS.IMPORT_BATCHES, []);
  },
  setImportBatches(batches: ImportBatch[]): void {
    safeSet(KEYS.IMPORT_BATCHES, batches);
  },

  clearAll(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
