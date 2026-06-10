import { v4 as uuidv4 } from 'uuid';
import { ClaimRepo } from '../db/repositories/claimRepo';
import { NoteRepo } from '../db/repositories/noteRepo';
import { ReviewRepo } from '../db/repositories/reviewRepo';
import { SupplementRepo } from '../db/repositories/supplementRepo';
import { TimelineRepo } from '../db/repositories/timelineRepo';
import { OrderService } from './orderService';
import {
  CompensationClaim,
  ClaimStatus,
  SubmitClaimInput,
  TimelineEventType,
  ClaimWithDetails,
} from '../types';
import { OrderNotFoundError, ClaimNotFoundError } from '../utils/errors';

const SENIOR_REVIEW_AMOUNT_THRESHOLD = 500;

export class ClaimService {
  constructor(
    private claimRepo: ClaimRepo,
    private timelineRepo: TimelineRepo,
    private orderService: OrderService,
    private noteRepo: NoteRepo,
    private reviewRepo: ReviewRepo,
    private supplementRepo: SupplementRepo,
  ) {}

  submitClaim(input: SubmitClaimInput, actorId: string): CompensationClaim {
    const order = this.orderService.getOrder(input.orderId);
    if (!order) throw new OrderNotFoundError(input.orderId);

    const now = new Date().toISOString();
    const requiresSeniorReview = input.amount > SENIOR_REVIEW_AMOUNT_THRESHOLD;

    const pendingClaims = this.claimRepo.findPendingByOrderId(input.orderId);

    if (pendingClaims.length > 0) {
      return this.mergeIntoExisting(input, pendingClaims, actorId, now);
    }

    const claim: CompensationClaim = {
      id: uuidv4(),
      orderId: input.orderId,
      storeId: input.storeId,
      amount: input.amount,
      reason: input.reason,
      status: ClaimStatus.Pending,
      mergedIntoId: null,
      reviewerId: null,
      requiresSeniorReview,
      createdAt: now,
      updatedAt: now,
    };

    const saved = this.claimRepo.create(claim);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: input.orderId,
      eventType: TimelineEventType.ClaimSubmitted,
      actorId,
      detail: `提交赔付申请，金额: ${input.amount}元${requiresSeniorReview ? '（需高级复核）' : ''}`,
      createdAt: now,
    });

    return saved;
  }

  private mergeIntoExisting(
    input: SubmitClaimInput,
    existingClaims: CompensationClaim[],
    actorId: string,
    now: string,
  ): CompensationClaim {
    const primary = existingClaims[0];

    for (let i = 1; i < existingClaims.length; i++) {
      this.claimRepo.mergeClaim(existingClaims[i].id, primary.id);
    }

    this.claimRepo.addAmountToClaim(primary.id, input.amount);

    const totalAmount = existingClaims.reduce((sum, c) => sum + c.amount, 0) + input.amount;
    if (totalAmount > SENIOR_REVIEW_AMOUNT_THRESHOLD) {
      this.claimRepo.setRequiresSeniorReview(primary.id, true);
    }

    const mergedClaim: CompensationClaim = {
      id: uuidv4(),
      orderId: input.orderId,
      storeId: input.storeId,
      amount: input.amount,
      reason: input.reason,
      status: ClaimStatus.Merged,
      mergedIntoId: primary.id,
      reviewerId: null,
      requiresSeniorReview: false,
      createdAt: now,
      updatedAt: now,
    };
    this.claimRepo.create(mergedClaim);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: input.orderId,
      eventType: TimelineEventType.ClaimMerged,
      actorId,
      detail: `重复赔付申请已合并至 ${primary.id}，追加金额: ${input.amount}元`,
      createdAt: now,
    });

    return this.claimRepo.findById(primary.id)!;
  }

  getClaim(id: string): CompensationClaim {
    const claim = this.claimRepo.findById(id);
    if (!claim) throw new ClaimNotFoundError(id);
    return claim;
  }

  getClaimWithDetails(id: string): ClaimWithDetails {
    const claim = this.getClaim(id);
    const order = this.orderService.getOrder(claim.orderId);

    return {
      ...claim,
      order,
      notes: this.noteRepo.findByOrderId(claim.orderId),
      reviews: this.reviewRepo.findByClaimId(claim.id),
      supplements: this.supplementRepo.findByClaimId(claim.id),
    };
  }

  getClaimsByOrder(orderId: string): CompensationClaim[] {
    return this.claimRepo.findByOrderId(orderId);
  }
}
