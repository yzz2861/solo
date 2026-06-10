import type {
  BorrowRecord,
  ReturnRecord,
  WaiverApplication,
  ReviewRecord,
  BorrowStatus,
  ProcessedBorrowRecord,
  AnomalyType,
} from '@/types';

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  return Math.floor((a.getTime() - b.getTime()) / MS);
}

export function computeStatus(
  borrow: BorrowRecord,
  returnRecord: ReturnRecord | null,
  today: Date = new Date(),
): BorrowStatus {
  const due = parseDate(borrow.dueDate);
  if (!due) return 'borrowing';

  if (!returnRecord) {
    return today > due ? 'overdue' : 'borrowing';
  }

  const ret = parseDate(returnRecord.returnDate);
  if (!ret) return 'borrowing';
  return ret > due ? 'overdue_returned' : 'returned';
}

export function computeOverdueDays(
  borrow: BorrowRecord,
  returnRecord: ReturnRecord | null,
  today: Date = new Date(),
): number {
  const due = parseDate(borrow.dueDate);
  if (!due) return 0;

  const endDate = returnRecord ? parseDate(returnRecord.returnDate) ?? today : today;
  return Math.max(0, daysBetween(endDate, due));
}

export function computeShouldFine(borrow: BorrowRecord, overdueDays: number): number {
  const raw = overdueDays * borrow.dailyFine;
  return Number(Math.min(raw, borrow.maxFine).toFixed(2));
}

export function computeActualFine(shouldFine: number, review: ReviewRecord): number {
  const waived = review.status === 'reviewed' ? review.finalWaiverAmount : 0;
  return Number(Math.max(0, shouldFine - waived).toFixed(2));
}

export function detectAnomalies(
  borrow: BorrowRecord | null,
  returnRecord: ReturnRecord | null,
  waiver: WaiverApplication | null,
  shouldFine: number,
  today: Date = new Date(),
): AnomalyType[] {
  const anomalies: AnomalyType[] = [];

  if ((returnRecord || waiver) && !borrow) {
    anomalies.push('data_missing');
    return anomalies;
  }
  if (!borrow) return anomalies;

  const due = parseDate(borrow.dueDate);
  if (!returnRecord && due && today > due) {
    anomalies.push('overdue_unreturned');
  }

  if (waiver && waiver.waiverAmount > shouldFine && shouldFine > 0) {
    anomalies.push('waiver_exceeded');
  }

  if (
    waiver &&
    borrow.borrower &&
    waiver.applicant &&
    borrow.borrower.trim() !== waiver.applicant.trim()
  ) {
    anomalies.push('applicant_mismatch');
  }

  return anomalies;
}

export function buildProcessedRecords(
  borrows: BorrowRecord[],
  returns: ReturnRecord[],
  waivers: WaiverApplication[],
  reviews: ReviewRecord[],
  today: Date = new Date(),
): ProcessedBorrowRecord[] {
  const returnMap = new Map(returns.map((r) => [r.borrowId, r]));
  const waiverMap = new Map(waivers.map((w) => [w.borrowId, w]));
  const reviewMap = new Map(reviews.map((r) => [r.borrowId, r]));
  const borrowMap = new Map(borrows.map((b) => [b.borrowId, b]));

  const allBorrowIds = new Set<string>([
    ...borrows.map((b) => b.borrowId),
    ...returns.map((r) => r.borrowId),
    ...waivers.map((w) => w.borrowId),
  ]);

  const results: ProcessedBorrowRecord[] = [];

  allBorrowIds.forEach((id) => {
    const borrow = borrowMap.get(id) ?? null;
    const returnRecord = returnMap.get(id) ?? null;
    const waiver = waiverMap.get(id) ?? null;
    let review = reviewMap.get(id) ?? null;

    if (!review) {
      review = {
        borrowId: id,
        reviewer: '',
        reviewOpinion: '',
        waiverConclusion: null,
        finalWaiverAmount: 0,
        reviewDate: null,
        status: 'pending',
      };
    }

    if (!borrow) {
      results.push({
        borrow: {
          borrowId: id,
          borrower: '',
          borrowerId: '',
          bookTitle: '',
          bookIsbn: '',
          borrowDate: '',
          dueDate: '',
          dailyFine: 0.5,
          maxFine: 50,
        },
        returnRecord,
        waiver,
        review,
        status: 'borrowing',
        overdueDays: 0,
        shouldFine: 0,
        actualFine: 0,
        anomalies: detectAnomalies(null, returnRecord, waiver, 0, today),
      });
      return;
    }

    const status = computeStatus(borrow, returnRecord, today);
    const overdueDays = computeOverdueDays(borrow, returnRecord, today);
    const shouldFine = computeShouldFine(borrow, overdueDays);
    const actualFine = computeActualFine(shouldFine, review);
    const anomalies = detectAnomalies(borrow, returnRecord, waiver, shouldFine, today);

    results.push({
      borrow,
      returnRecord,
      waiver,
      review,
      status,
      overdueDays,
      shouldFine,
      actualFine,
      anomalies,
    });
  });

  return results;
}
