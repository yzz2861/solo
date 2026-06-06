const { v4: uuidv4 } = require('uuid');
const { RESULT_CODES, REVIEW_STATUS } = require('../constants');

class InMemoryStore {
  constructor() {
    this.results = new Map();
    this.batches = new Map();
    this.reviewRecords = new Map();
    this.businessKeyIndex = new Map();
  }

  saveResult(result) {
    this.results.set(result.id, result);
    if (result.businessKey) {
      if (!this.businessKeyIndex.has(result.businessKey)) {
        this.businessKeyIndex.set(result.businessKey, []);
      }
      this.businessKeyIndex.get(result.businessKey).push(result.id);
    }
    return result;
  }

  getResult(id) {
    return this.results.get(id) || null;
  }

  getResultByBusinessKey(businessKey) {
    const ids = this.businessKeyIndex.get(businessKey) || [];
    if (ids.length === 0) return null;
    const latestId = ids[ids.length - 1];
    return this.results.get(latestId) || null;
  }

  existsByBusinessKey(businessKey) {
    return this.businessKeyIndex.has(businessKey);
  }

  saveBatch(batchResult) {
    this.batches.set(batchResult.batchId, batchResult);
    if (batchResult.results) {
      batchResult.results.forEach(r => this.saveResult(r));
    }
    return batchResult;
  }

  getBatch(batchId) {
    return this.batches.get(batchId) || null;
  }

  createReview(resultId, reviewer, comment) {
    const result = this.results.get(resultId);
    if (!result) {
      throw new Error(`检测结果不存在: ${resultId}`);
    }
    if (result.resultCode !== RESULT_CODES.PENDING_REVIEW) {
      throw new Error('该记录无需复核');
    }

    const reviewRecord = {
      id: uuidv4(),
      resultId,
      reviewer,
      comment,
      status: REVIEW_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      decision: null,
      decisionReason: null
    };

    this.reviewRecords.set(reviewRecord.id, reviewRecord);
    result.reviewStatus = REVIEW_STATUS.PENDING;

    return reviewRecord;
  }

  processReview(reviewId, decision, decisionReason, reviewer) {
    const review = this.reviewRecords.get(reviewId);
    if (!review) {
      throw new Error(`复核记录不存在: ${reviewId}`);
    }
    if (review.status !== REVIEW_STATUS.PENDING) {
      throw new Error('该复核记录已处理');
    }

    const result = this.results.get(review.resultId);
    if (!result) {
      throw new Error(`检测结果不存在: ${review.resultId}`);
    }

    const now = new Date().toISOString();

    if (decision === 'APPROVE') {
      review.status = REVIEW_STATUS.APPROVED;
      review.decision = 'APPROVE';
      result.resultCode = RESULT_CODES.PASS;
      result.reviewStatus = REVIEW_STATUS.APPROVED;
      result.reason = `复核通过 - ${decisionReason || '人工确认合格'}`;
    } else if (decision === 'REJECT') {
      review.status = REVIEW_STATUS.REJECTED;
      review.decision = 'REJECT';
      result.resultCode = RESULT_CODES.BLOCK;
      result.reviewStatus = REVIEW_STATUS.REJECTED;
      result.reason = `复核驳回 - ${decisionReason || '人工确认不合格'}`;
    } else {
      throw new Error(`无效的复核决策: ${decision}`);
    }

    review.decisionReason = decisionReason || '';
    review.reviewedAt = now;
    review.reviewer = reviewer || review.reviewer;
    result.reviewedAt = now;
    result.reviewer = reviewer || review.reviewer;
    result.reviewComment = decisionReason || '';

    return { review, result };
  }

  getReview(reviewId) {
    return this.reviewRecords.get(reviewId) || null;
  }

  listPendingReviews(page = 1, pageSize = 20) {
    const pending = Array.from(this.reviewRecords.values())
      .filter(r => r.status === REVIEW_STATUS.PENDING)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      total: pending.length,
      page,
      pageSize,
      items: pending.slice(start, end)
    };
  }

  clear() {
    this.results.clear();
    this.batches.clear();
    this.reviewRecords.clear();
    this.businessKeyIndex.clear();
  }
}

const store = new InMemoryStore();

module.exports = store;
module.exports.InMemoryStore = InMemoryStore;
