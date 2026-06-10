import { getStore, persist } from '../init';
import { ClaimSupplement } from '../../types';

export class SupplementRepo {
  create(supplement: ClaimSupplement): ClaimSupplement {
    const store = getStore();
    store.supplements.set(supplement.id, supplement);
    persist();
    return supplement;
  }

  createBatch(supplements: ClaimSupplement[]): void {
    const store = getStore();
    for (const s of supplements) {
      store.supplements.set(s.id, s);
    }
    persist();
  }

  findByClaimId(claimId: string): ClaimSupplement[] {
    return Array.from(getStore().supplements.values())
      .filter(s => s.claimId === claimId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
