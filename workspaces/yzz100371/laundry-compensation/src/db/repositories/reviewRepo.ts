import { getStore, persist } from '../init';
import { ClaimReview } from '../../types';

export class ReviewRepo {
  create(review: ClaimReview): ClaimReview {
    const store = getStore();
    store.reviews.set(review.id, review);
    persist();
    return review;
  }

  findByClaimId(claimId: string): ClaimReview[] {
    return Array.from(getStore().reviews.values())
      .filter(r => r.claimId === claimId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  findLatestByClaimId(claimId: string): ClaimReview | undefined {
    const reviews = this.findByClaimId(claimId);
    return reviews.length > 0 ? reviews[reviews.length - 1] : undefined;
  }
}
