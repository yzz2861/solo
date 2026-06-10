export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class OrderAlreadyPickedUpError extends AppError {
  constructor(orderId: string) {
    super(409, `订单 ${orderId} 的衣物已被取走，收衣状态不可修改`, 'ORDER_PICKED_UP');
  }
}

export class OrderNotFoundError extends AppError {
  constructor(orderId: string) {
    super(404, `订单 ${orderId} 不存在`, 'ORDER_NOT_FOUND');
  }
}

export class ClaimNotFoundError extends AppError {
  constructor(claimId: string) {
    super(404, `赔付申请 ${claimId} 不存在`, 'CLAIM_NOT_FOUND');
  }
}

export class ClaimAlreadyExistsError extends AppError {
  constructor(orderId: string) {
    super(409, `订单 ${orderId} 已存在进行中的赔付申请，新申请将合并至已有申请`, 'CLAIM_ALREADY_EXISTS');
  }
}

export class ClaimNotReviewableError extends AppError {
  constructor(claimId: string) {
    super(409, `赔付申请 ${claimId} 当前状态不可复核`, 'CLAIM_NOT_REVIEWABLE');
  }
}

export class SeniorReviewRequiredError extends AppError {
  constructor(claimId: string) {
    super(409, `赔付申请 ${claimId} 金额超过阈值，需要高级复核人审批`, 'SENIOR_REVIEW_REQUIRED');
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(409, `不允许的状态转换: ${from} -> ${to}`, 'INVALID_STATUS_TRANSITION');
  }
}
