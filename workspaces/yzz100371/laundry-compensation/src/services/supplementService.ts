import { v4 as uuidv4 } from 'uuid';
import { SupplementRepo } from '../db/repositories/supplementRepo';
import { ClaimRepo } from '../db/repositories/claimRepo';
import { TimelineRepo } from '../db/repositories/timelineRepo';
import { ClaimSupplement, ClaimStatus, TimelineEventType, SubmitSupplementInput } from '../types';
import { ClaimNotFoundError } from '../utils/errors';

export class SupplementService {
  constructor(
    private supplementRepo: SupplementRepo,
    private claimRepo: ClaimRepo,
    private timelineRepo: TimelineRepo,
  ) {}

  submitSupplement(input: SubmitSupplementInput): ClaimSupplement[] {
    const claim = this.claimRepo.findById(input.claimId);
    if (!claim) throw new ClaimNotFoundError(input.claimId);

    if (claim.status !== ClaimStatus.SupplementRequested) {
      throw new Error('当前赔付申请状态不允许提交补充材料');
    }

    const now = new Date().toISOString();
    const supplements: ClaimSupplement[] = input.photos.map((photo, index) => ({
      id: uuidv4(),
      claimId: input.claimId,
      submittedBy: input.submittedBy,
      photos: JSON.stringify([photo]),
      description: `${input.description} (照片${index + 1}/${input.photos.length})`,
      createdAt: now,
    }));

    this.supplementRepo.createBatch(supplements);

    this.claimRepo.updateStatus(input.claimId, ClaimStatus.UnderReview, null);

    this.timelineRepo.create({
      id: uuidv4(),
      orderId: claim.orderId,
      eventType: TimelineEventType.SupplementSubmitted,
      actorId: input.submittedBy,
      detail: `门店一次性提交 ${input.photos.length} 张补充照片，状态变更为复核中`,
      createdAt: now,
    });

    return supplements;
  }

  getSupplementsByClaim(claimId: string): ClaimSupplement[] {
    return this.supplementRepo.findByClaimId(claimId);
  }
}
