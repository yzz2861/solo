import { getStore, persist } from '../init';
import { CompensationClaim, ClaimStatus } from '../../types';

export class ClaimRepo {
  create(claim: CompensationClaim): CompensationClaim {
    const store = getStore();
    store.claims.set(claim.id, claim);
    persist();
    return claim;
  }

  findById(id: string): CompensationClaim | undefined {
    return getStore().claims.get(id);
  }

  findByOrderId(orderId: string): CompensationClaim[] {
    return Array.from(getStore().claims.values())
      .filter(c => c.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  findPendingByOrderId(orderId: string): CompensationClaim[] {
    return Array.from(getStore().claims.values())
      .filter(c => c.orderId === orderId && c.status === ClaimStatus.Pending)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  updateStatus(id: string, status: ClaimStatus, reviewerId: string | null): void {
    const store = getStore();
    const claim = store.claims.get(id);
    if (!claim) return;
    claim.status = status;
    claim.reviewerId = reviewerId;
    claim.updatedAt = new Date().toISOString();
    store.claims.set(id, claim);
    persist();
  }

  mergeClaim(sourceId: string, targetId: string): void {
    const store = getStore();
    const source = store.claims.get(sourceId);
    if (!source) return;
    source.status = ClaimStatus.Merged;
    source.mergedIntoId = targetId;
    source.updatedAt = new Date().toISOString();
    store.claims.set(sourceId, source);
    persist();
  }

  addAmountToClaim(id: string, additionalAmount: number): void {
    const store = getStore();
    const claim = store.claims.get(id);
    if (!claim) return;
    claim.amount += additionalAmount;
    claim.updatedAt = new Date().toISOString();
    store.claims.set(id, claim);
    persist();
  }

  setRequiresSeniorReview(id: string, flag: boolean): void {
    const store = getStore();
    const claim = store.claims.get(id);
    if (!claim) return;
    claim.requiresSeniorReview = flag;
    claim.updatedAt = new Date().toISOString();
    store.claims.set(id, claim);
    persist();
  }

  findByMonth(year: number, month: number): CompensationClaim[] {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
    const endDate = month === 12
      ? `${year + 1}-01-01T00:00:00.000Z`
      : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;
    return Array.from(getStore().claims.values())
      .filter(c => c.createdAt >= startDate && c.createdAt < endDate)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
