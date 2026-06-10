export type BorrowStatus = 'borrowing' | 'overdue' | 'returned' | 'overdue_returned';

export type WaiverConclusion = 'approved' | 'rejected' | 'partial' | null;

export type ReviewStatus = 'pending' | 'reviewed';

export type AnomalyType =
  | 'overdue_unreturned'
  | 'waiver_exceeded'
  | 'applicant_mismatch'
  | 'data_missing'
  | null;

export interface BorrowRecord {
  borrowId: string;
  borrower: string;
  borrowerId: string;
  bookTitle: string;
  bookIsbn: string;
  borrowDate: string;
  dueDate: string;
  dailyFine: number;
  maxFine: number;
}

export interface ReturnRecord {
  borrowId: string;
  returnDate: string;
  returnType: 'normal' | 'supplement';
  source: string;
  batchId: string;
}

export interface WaiverApplication {
  applicationId: string;
  borrowId: string;
  applicant: string;
  applicantId: string;
  waiverAmount: number;
  reason: string;
  applyDate: string;
  source: string;
  batchId: string;
}

export interface ReviewRecord {
  borrowId: string;
  reviewer: string;
  reviewOpinion: string;
  waiverConclusion: WaiverConclusion;
  finalWaiverAmount: number;
  reviewDate: string | null;
  status: ReviewStatus;
}

export interface ImportBatch {
  batchId: string;
  fileName: string;
  fileType: 'borrow' | 'return' | 'waiver';
  recordCount: number;
  importTime: string;
  fileHash: string;
}

export interface ProcessedBorrowRecord {
  borrow: BorrowRecord;
  returnRecord: ReturnRecord | null;
  waiver: WaiverApplication | null;
  review: ReviewRecord;
  status: BorrowStatus;
  overdueDays: number;
  shouldFine: number;
  actualFine: number;
  anomalies: AnomalyType[];
}

export type FileType = 'borrow' | 'return' | 'waiver';
