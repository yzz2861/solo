import { v4 as uuidv4 } from 'uuid';
import { ClaimRepo } from '../db/repositories/claimRepo';
import { ReviewRepo } from '../db/repositories/reviewRepo';
import { TimelineRepo } from '../db/repositories/timelineRepo';
import { ClaimReview, ReviewAction, ClaimStatus, TimelineEventType } from '../types';
import { ClaimNotFoundError, ClaimNotReviewableError, SeniorReviewRequiredError } from '../utils/errors';

const REVIEWABLE_STATUSES: ClaimStatus[] = [
  ClaimStatus.Pending,
  ClaimStatus.UnderReview,
  ClaimStatus.SupplementRequested,
];

export class ReviewService {
  constructor(
    private claimRepo: ClaimRepo,
    private reviewRepo: ReviewRepo,
    private timelineRepo: TimelineRepo,
  ) {}

  reviewClaim(input: {
    claimId: string;
    reviewerId: string;
    action: ReviewAction;
    comment: string;
    approvedAmount?: number;
    isSeniorReviewer?: boolean;
  }): ClaimReview {
    const claim = this.claimRepo.findById(input.claimId);
    if (!claim) throw new ClaimNotFoundError(input.claimId);

    if (!REVIEWABLE_STATUSES.includes(claim.status)) {
      throw new ClaimNotReviewableError(input.claimId);
    }

    if (claim.requiresSeniorReview && !input.isSeniorReviewer && input.action === ReviewAction.Approve) {
      throw new SeniorReviewRequiredError(input.claimId);
    }

    const now = new Date().toISOString();
    const review: ClaimReview = {
      id: uuidv4(),
      claimId: input.claimId,
      reviewerId: input.reviewerId,
      action: input.action,
      comment: input.comment,
      approvedAmount: input.action === ReviewAction.Approve ? (input.approvedAmount ?? claim.amount) : null,
      createdAt: now,
    };

    this.reviewRepo.create(review);

    let newStatus: ClaimStatus;
    let timelineDetail: string;

    switch (input.action) {
      case ReviewAction.Approve:
        newStatus = ClaimStatus.Approved;
        timelineDetail = `复核人 ${input.reviewerId} 同意赔付，金额: ${review.approvedAmount}元`;
        break;
      case ReviewAction.RequestSupplement:
        newStatus = ClaimStatus.SupplementRequested;
        timelineDetail = `复核人 ${input.reviewerId} 要求补充材料: ${input.comment}`;
        break;
      case ReviewAction.Reject:
        newStatus = ClaimStatus.Rejected;
        timelineDetail = `复核人 ${input.reviewerId} 驳回赔付申请: ${input.comment}`;
        break;
    }

    this.claimRepo.updateStatus(input.claimId, newStatus, input.reviewerId);

    if (input.action === ReviewAction.Approve) {
      this.claimRepo.setRequiresSeniorReview(input.claimId, false);
    }

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: claim.orderId,
      eventType: TimelineEventType.ReviewCompleted,
      actorId: input.reviewerId,
      detail: timelineDetail,
      createdAt: now,
    });

    return review;
  }

  getReviewsByClaim(claimId: string): ClaimReview[] {
    return this.reviewRepo.findByClaimId(claimId);
  }
}
